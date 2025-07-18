import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState } from 'react'
import { useFetcher, useParams } from "react-router"
import { useNavigate } from "react-router"
import { AuthContext } from '../context/authcontext'
import { base64ToArrayBuffer, encryptMessage, decryptMessage, imageToBase64 } from '../tools/tools'

function Messages() {

    const { user, startnetworkrequest, networkControllerRef, socket } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})
    const [messagetext, setMessagetext] = useState("")
    const [messages, setMessages] = useState([])
    const [secret, setSecret] = useState()

    const [image, setImage] = useState()
    const [imagePreview, setImagePreview] = useState()
    
    const [isBlocked, setIsBlocked] = useState(false)
    const [isBlocker, setIsBlocker] = useState(false)

    const [offset, setOffset] = useState(0)
    const [date, setDate] = useState(new Date())

    useEffect(() => {
        if (!socket || !secret) return

        socket.on('newmessage', async (data) => {
            let message
            try {
                const decryptedText = await decryptMessage(secret, data.text, "text")
                let newimage
                if (data.image != 0)
                {
                    const response = await fetch(data.image)
                    if (!response.ok) throw "Error"
                    
                    const encryptedArrayBuffer = await response.arrayBuffer()
                    const decryptedImageBuffer = await decryptMessage(secret, encryptedArrayBuffer, "image")
                    newimage = URL.createObjectURL(new Blob([decryptedImageBuffer], { type: 'image/jpeg' }))
                }
                data.image = newimage

                message = { ...data, text: decryptedText, image: data.image, rawimage: data.rawimage }
            } catch (err){
                console.log(err)
                message = { ...data, text: "[Failed to decrypt]" }
            }
            setMessages(prev => [message, ...prev])
        })

        socket.on('block', async (data) => {
            if (data.from != link && data.from != user.id) return

            addToast(data.from == link ? "This user blocked you" : "You blocked this user", "red")
            navigate("/profile/" + link)
        })

        return () => {
            socket.off('newmessage')
            socket.off('block')
        }
    }, [socket, secret]);

    useEffect(() => {

        const userdata = JSON.parse(localStorage.getItem(link))
        if (userdata == null || new Date(userdata.expires) < new Date()) getuserprofile()
        else setUserdata(userdata)

        const handleStorage = (event) => {
            if (event.key === link) {
                const updatedData = JSON.parse(event.newValue)
                setUserdata(updatedData)
            }
        }

        if (link == user.id) navigate("/home")

        window.addEventListener("storage", handleStorage)
        return () => window.removeEventListener("storage", handleStorage)
    }, [link])

    useEffect(() => {
        if (userdata == null || userdata.key == null) return

        async function getsecret() {
            const rawpublickey = base64ToArrayBuffer(userdata.key)
            const publickey = await crypto.subtle.importKey(
                "raw",
                rawpublickey,
                {
                name: "ECDH",
                namedCurve: "P-256"
                },
                true,
                []
            )

            const rawprivatekey = base64ToArrayBuffer(user.key)
            const privatekey = await crypto.subtle.importKey(
                "pkcs8",
                rawprivatekey,
                {
                name: "ECDH",
                namedCurve: "P-256"
                },
                true,
                ["deriveKey", "deriveBits"]
            )

            const sharedSecret = await crypto.subtle.deriveKey(
                {
                    name: "ECDH",
                    public: publickey,
                },
                privatekey,
                {
                    name: "AES-GCM",
                    length: 256,
                },
                false,
                ["encrypt", "decrypt"]
            )
            setSecret(sharedSecret)
        }

        getsecret()
    }, [userdata])

    useEffect(() => {
        if (secret != null)
        getmessages()
    }, [secret])

    const getuserprofile = async () => {
        try {
            let response = await axios.get('/getuserprofile?id=' + link)

            if (response.data == null) throw 'Error'
            if (response.data.message != null) delete response.data.message

            response.data.expires = new Date(Date.now() + 60 * 1000)

            setUserdata(response.data)

            localStorage.setItem(link, JSON.stringify(response.data))
        } catch (err) {
            navigate("/home")
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const sendmessage = async (e) => {
        e.preventDefault()
        startnetworkrequest()

        try {
            const text = await encryptMessage(secret, messagetext, "text")
            const formdata = new FormData()
            formdata.append('text', text)
            formdata.append('receiverid', link)

            if (image)
            {
                const imageArrayBuffer = await image.arrayBuffer()
                const encryptedimage = await encryptMessage(secret, imageArrayBuffer, "image")
                formdata.append('image', encryptedimage)
            }

            const message = await axios.post('/auth/sendmessage',
                formdata, {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            if (message.data == null || message.data.messagedata == null) throw 'Error'
            message.data.messagedata.text = messagetext

            //setMessages(prev => [message.data.messagedata, ...prev])
            setImage("")
            setImagePreview("") 
            setMessagetext("")
        } catch (err) {
            console.log(err)
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const getmessages = async () => {

        try {
            const response = await axios.post('/auth/getmessages', {
                receiverid: link, offset, date
            }, {
                withCredentials: true
            })

            if (response == null || response.data == null || response.data.data == null) throw 'Error'
            if (response.data.data == "") return

            const encryptedMessages = response.data.data

            const decryptedMessages = await Promise.all(
            encryptedMessages.map(async (msg) => {
                try {
                const decryptedText = await decryptMessage(secret, msg.text, "text")
                let newimage
                if (msg.image != 0)
                {
                    const response = await fetch(msg.image)
                    if (!response.ok) throw "Error"
                    
                    const encryptedArrayBuffer = await response.arrayBuffer()
                    const decryptedImageBuffer = await decryptMessage(secret, encryptedArrayBuffer, "image")
                    newimage = URL.createObjectURL(new Blob([decryptedImageBuffer], { type: 'image/jpeg' }))
                }
                msg.image = newimage    

                return { ...msg, text: decryptedText }
                } catch (err){
                    console.log(err)
                return { ...msg, text: "[Failed to decrypt]" }
                }
            })
            )

            setOffset(prev => prev + 2)
            setMessages(prev => [...prev, ...decryptedMessages])
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
            console.log(err)
            if (err?.response?.status == 403) navigate("/profile/" + link)
        }
    }

    return (
        <>
        {isBlocked || isBlocker ? <>Unable to access messages</> : <>
            <h1>Messages with user {link}</h1>

            <form onSubmit={(e) => sendmessage(e)}>
                <input value={messagetext} placeholder='Write something...' onChange={(e) => setMessagetext(e.target.value)} />
                <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                        setImage(file)
                        setImagePreview(URL.createObjectURL(file))
                    }
                }}/>
                {imagePreview ? <img src={imagePreview} alt="imagetosend"/> : <></>}

                <button>Send</button>
            </form>

            <button onClick={() => { getmessages() }}>Get Messages</button>

            {messages.map((msg, index) => (
                <div key={index}>
                    <h2>{msg.text}</h2>
                    {msg.image ? <img src={msg.image} alt="imagesent"/> : <></>}
                </div>
            ))}
            </>}
        </>
    )
}

export default Messages