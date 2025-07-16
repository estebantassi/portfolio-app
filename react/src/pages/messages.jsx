import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState } from 'react'
import { useFetcher, useParams } from "react-router"
import { useNavigate } from "react-router"
import { AuthContext } from '../context/authcontext'
import { base64ToArrayBuffer, encryptMessage, decryptMessage } from '../tools/tools'

function Messages() {

    const { user, startnetworkrequest, networkControllerRef, socket } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})
    const [messagetext, setMessagetext] = useState("")
    const [messages, setMessages] = useState([])
    const [secret, setSecret] = useState()
    
    const [isBlocked, setIsBlocked] = useState(false)
    const [isBlocker, setIsBlocker] = useState(false)

    const [offset, setOffset] = useState(0)
    const [date, setDate] = useState(new Date())

    useEffect(() => {
        if (!socket || !secret) return

        socket.on('newmessage', async (data) => {
            let message
            try {
                const decryptedText = await decryptMessage(secret, data.text)
                message = { ...data, text: decryptedText }
            } catch {
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
            const text = await encryptMessage(secret, messagetext)

            const message = await axios.post('/auth/sendmessage', {
                text,
                receiverid: link
            }, {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            if (message.data == null || message.data.messagedata == null) throw 'Error'
            message.data.messagedata.text = messagetext

            setMessages(prev => [message.data.messagedata, ...prev])
            setMessagetext("")
        } catch (err) {
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
                const decryptedText = await decryptMessage(secret, msg.text)
                return { ...msg, text: decryptedText }
                } catch {
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

                <button>Send</button>
            </form>

            <button onClick={() => { getmessages() }}>Get Messages</button>

            {messages.map((msg, index) => (
                <div key={index}>
                    <h2>{msg.text}</h2>
                </div>
            ))}
            </>}
        </>
    )
}

export default Messages