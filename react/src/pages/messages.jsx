import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState, memo, useCallback, useRef } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { useAuth } from '../context/authcontext'
import { base64ToArrayBuffer, encryptMessage, decryptMessage, reconstructImage } from '../tools/tools'
import { useCall } from '../context/callcontext'
import getuserprofile from '../tools/getuserprofile'
import { MessageInput } from '../components/inputs'
import "../css/messages.css"

const MessageItem = memo(({ msg, userId, onDelete }) => {

    const created_at = new Date(msg?.created_at)

    return (
        <div>
            {msg?.text && <h2>{msg.text}</h2>}
            {msg?.image && <img src={msg.image} alt="imagesent" />}
            {msg?.senderid === userId && <button onClick={() => onDelete(msg.id)}>Delete Message</button>}
            <p>{created_at.toLocaleString()}</p>
        </div>
    )
})

function Messages() {

    const { startCall } = useCall()
    const { user, startnetworkrequest, networkControllerRef, socket, setIsNetworkButtonDisabled, isNetworkButtonDisabled } = useAuth()
    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})
    const [messagetext, setMessagetext] = useState("")
    const [messages, setMessages] = useState([])
    const secretRef = useRef(null)

    const [image, setImage] = useState()
    const [imagePreview, setImagePreview] = useState()

    const canLoadMessagesRef = useRef(true)
    const [canLoadMessages, setCanLoadMessages] = useState(true)

    const date = new Date()

    const messagesWrapperRef = useRef(null)
    const messagesLengthRef = useRef(0)

    useEffect(() => {
        if (!socket) return

        socket.on('newmessage', async (data) => {
            let message
            try {
                const decryptedText = await decryptMessage(secretRef.current, data.text, "text")
                data.image = await reconstructImage(data.image, secretRef.current)

                message = { ...data, text: decryptedText }
            } catch {
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
    }, [socket])

    useEffect(() => {
        async function inituser () {
            if (user && user.id == link) return navigate("/home")
            const data = await getuserprofile([parseInt(link, 10)])

            setUserdata(data[0])
            if (data == null) {
                addToast("Error loading user", "red")
                navigate("/home")
            }
        }

        inituser()

        const box = messagesWrapperRef.current
        const handleScroll = () => { checkScroll() }
        box.addEventListener('scroll', handleScroll)
        return () => {
            box.removeEventListener('scroll', handleScroll)
        }
    }, [link])

    const checkScroll = () => {
        if (messagesWrapperRef.current.clientHeight - messagesWrapperRef.current.scrollTop >= messagesWrapperRef.current.scrollHeight - 200
            || !(messagesWrapperRef.current.scrollHeight > messagesWrapperRef.current.clientHeight)
        ) getmessages()
    }

    useEffect(() => {
        if (userdata == null || userdata.messagekey_public == null) return

        async function getsecret() {
            const userkey = localStorage.getItem("messagekey")

            const rawpublickey = base64ToArrayBuffer(userdata.messagekey_public )
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

            const rawprivatekey = base64ToArrayBuffer(userkey)
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
            secretRef.current = sharedSecret

            getmessages()
        }

        getsecret()
    }, [userdata])

    useEffect(() => {
    }, [])

    const sendmessage = async (e) => {
        e.preventDefault()
        startnetworkrequest(false)

        try {
            const text = await encryptMessage(secretRef.current, messagetext, "text")
            const formdata = new FormData()
            formdata.append('text', text)
            formdata.append('receiverid', link)

            if (image)
            {
                const imageArrayBuffer = await image.arrayBuffer()
                const encryptedimage = await encryptMessage(secretRef.current, imageArrayBuffer, "image")
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

            setImage("")
            setImagePreview("") 
            setMessagetext("")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }

        setIsNetworkButtonDisabled(false)
    }

    const getmessages = async () => {
        if (!canLoadMessagesRef.current) return
        canLoadMessagesRef.current = false
        setCanLoadMessages(false)

        try {
            const response = await axios.get(`/auth/getmessages?receiverid=${link}&offset=${messagesLengthRef.current}&date=${date}`, {
                withCredentials: true
            })

            const encryptedMessages = response.data.data
            const decryptedMessages = await Promise.all(
            encryptedMessages.map(async (msg) => {
                try {
                    const decryptedText = await decryptMessage(secretRef.current, msg.text, "text")
                    msg.image = await reconstructImage(msg.image, secretRef.current) 

                    return { ...msg, text: decryptedText }
                } catch {
                    return { ...msg, text: "[Failed to decrypt]" }
                }
            })
            )

            setMessages(prev => [...prev, ...decryptedMessages])

            messagesLengthRef.current += decryptedMessages.length

            if (response.data.end) return
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
            if (err?.response?.status == 403) navigate("/profile/" + link)
        }

        setCanLoadMessages(true)
        canLoadMessagesRef.current = true

        checkScroll()
    }

    const deletemessage = useCallback(async (id) => {
        startnetworkrequest(false)

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

        setIsNetworkButtonDisabled(false)
    }, [])

    const messageInputRef = useRef(null)
    const isMessageButtonDisabled = isNetworkButtonDisabled || (!messageInputRef.current?.checkValidity() && !image)

    return (
        <>
            <div className='messages'>
                <div className='messages-page-wrapper'>
                    {userdata && userdata.username && <h1>Messages with {userdata.username}</h1>}



                    <button disabled={!canLoadMessages} onClick={() => { getmessages() }}>Get Messages</button>

                    <button disabled={socket ? false : true} onClick={() => { startCall(userdata) }}>Call</button>
                </div>


                <div className='messages-wrapper' ref={messagesWrapperRef}>
                    {messages.map((msg) => (
                        <MessageItem
                            key={msg.id}
                            msg={msg}
                            userId={user.id}
                            onDelete={deletemessage}
                        />
                    ))}
                </div>

                <form onSubmit={(e) => sendmessage(e)}>

                    <MessageInput value={messagetext} onChange={(e) => setMessagetext(e.target.value)} inputRef={messageInputRef}/>
                    <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files[0]
                        if (file) {
                            setImage(file)
                            setImagePreview(URL.createObjectURL(file))
                        }
                    }}/>
                    {imagePreview ? <img src={imagePreview} alt="imagetosend"/> : null}

                    <button disabled={isMessageButtonDisabled} >Send</button>
                </form>

            </div>
        </>
    )
}

export default Messages