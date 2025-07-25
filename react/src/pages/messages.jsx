import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState, memo, useCallback, useRef } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { useAuth } from '../context/authcontext'
import { base64ToArrayBuffer, encryptMessage, decryptMessage, reconstructImage } from '../tools/tools'

function Messages() {

    const { user, startnetworkrequest, networkControllerRef, socket } = useAuth()
    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})
    const [messagetext, setMessagetext] = useState("")
    const [messages, setMessages] = useState([])
    const [secret, setSecret] = useState()

    const [image, setImage] = useState()
    const [imagePreview, setImagePreview] = useState()

    const canLoadMessagesRef = useRef(true)

    const date = new Date()


    useEffect(() => {
        if (!socket || !secret) return

        socket.on('newmessage', async (data) => {
            let message
            try {
                const decryptedText = await decryptMessage(secret, data.text, "text")
                data.image = await reconstructImage(data.image, secret)

                message = { ...data, text: decryptedText }
            } catch (err){
                message = { ...data, text: "[Failed to decrypt]" }
            }
            setMessages(prev => [message, ...prev])
        })

        socket.on('deletemessage', async (data) => {
            setMessages(prev => prev.filter(msg => msg.id !== data.messageid));
        })

        socket.on('block', async (data) => {
            if (data.from != link && data.from != user.id) return

            addToast(data.from == link ? "This user blocked you" : "You blocked this user", "red")
            navigate("/profile/" + link)
        })

        return () => {
            socket.off('newmessage')
            socket.off('block')
            socket.off('deletemessage')
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
        if (userdata == null || userdata.messagekey_public == null) return

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
                const blob = new Blob([encryptedimage])
                formdata.append('image', blob)
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
        if (!canLoadMessagesRef.current) return
        canLoadMessagesRef.current = false

        try {
            const response = await axios.post('/auth/getmessages', {
                receiverid: link, offset: messages.length, date
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
                msg.image = await reconstructImage(msg.image, secret) 

                    return { ...msg, text: decryptedText }
                } catch {
                    return { ...msg, text: "[Failed to decrypt]" }
                }
            })
            )

            setMessages(prev => [...prev, ...decryptedMessages])
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
            if (err?.response?.status == 403) navigate("/profile/" + link)
        } finally {
            canLoadMessagesRef.current = true
        }
    }

    const deletemessage = useCallback(async (id) => {
        startnetworkrequest()

        try {
            const response = await axios.post('/auth/deletemessage', {
                messageid: id
            }, {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            setMessages(prev => prev.filter(msg => msg.id !== id));
            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }, [])

    const MessageItem = memo(({ msg, userId, onDelete }) => {
        return (
            <div>
                <h2>{msg.text}</h2>
                {msg.image ? <img src={msg.image} alt="imagesent" /> : null}
                {msg.senderid === userId ? (
                    <button onClick={() => onDelete(msg.id)}>Delete Message</button>
                ) : null}
            </div>
        )
    })

    return (
        <>
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
                {imagePreview ? <img src={imagePreview} alt="imagetosend"/> : null}

                <button>Send</button>
            </form>

            <button onClick={() => { getmessages() }}>Get Messages</button>

            {messages.map((msg) => (
                <MessageItem
                    key={msg.id}
                    msg={msg}
                    userId={user.id}
                    onDelete={deletemessage}
                />
            ))}
        </>
    )
}

export default Messages