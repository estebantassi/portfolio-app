import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState, memo, useCallback, useRef } from 'react'
import { NavLink, useParams } from "react-router"
import { useNavigate } from "react-router"
import { useAuth } from '../context/authcontext'
import { base64ToArrayBuffer, encryptMessage, decryptMessage, reconstructImage, formatTime } from '../tools/tools'
import { useCall } from '../context/callcontext'
import getuserprofile from '../tools/getuserprofile'
import { MessageInput } from '../components/inputs'
import "../css/messages.css"
import { Phone, Trash } from 'lucide-react'
import { useImageViewer } from '../context/imageviewercontext'
import { ImageUp, CircleX, Send, ChevronDown } from 'lucide-react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'

const MessageItem = memo(({ msg, userId, onDelete, showImage, userdata }) => {
    const created_at = new Date(msg.created_at).toLocaleString()
    const formateddate = formatTime(msg.created_at)

    return (
        <div className={(userdata?.id == userId ? "message-right" : "message-left") + " message"}>

            <div className='avatar-wrapper'>
                {userdata?.id && userdata?.avatar && <NavLink className="navlink" to={`/profile/${userdata?.id}`}><img className="avatar clickable-icon" src={userdata?.avatar} alt="avatar" /></NavLink>}
            </div>

            <div className='message-data'>
                <div className='message-content'>
                    {msg?.text && <h3>{msg.text}</h3>}
                    {msg?.images[0] && <img className='clickable' src={msg.images[0]} alt="image" onClick={() => showImage(msg.images[0], "image")} />}
                </div>

                <p className='date' title={created_at}>{formateddate}</p>
            </div>

            <div className='message-icon'>
                {userdata?.id == userId && <Trash className='clickable-icon' onClick={() => onDelete(msg.id)}/>}
            </div>
        </div>
    )
})

function Messages() {

    const { startCall } = useCall()
    const { user, avatar, banner, startnetworkrequest, networkControllerRef, socket, setIsNetworkButtonDisabled, updatetoken } = useAuth()
    const { addToast } = useContext(ToastContext)
    const { showImage } = useImageViewer()
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})
    const [messagetext, setMessagetext] = useState("")
    const [messages, setMessages] = useState([])
    const secretRef = useRef(null)

    const ffmpeg = new FFmpeg()

    const [image, setImage] = useState()
    const [imagePreview, setImagePreview] = useState()

    const canLoadMessagesRef = useRef(true)
    const [canLoadMessages, setCanLoadMessages] = useState(true)

    const date = new Date()

    const messagesWrapperRef = useRef(null)
    const messagesLengthRef = useRef(0)

    const [isNewMessage, setIsNewMessage] = useState(false)
    const [showScroll, setShowScroll] = useState(false)

    useEffect(() => {
        if (!socket) return

        setCanSendMessage(true)

        socket.on('newmessage', async (data) => {
            let message
            try {
                const decryptedText = data.text ? await decryptMessage(secretRef.current, data.text, "text") : ""

                data.images = await Promise.all(
                    data.images.map(link => reconstructImage(link, secretRef.current))
                )

                message = { ...data, text: decryptedText }
            } catch {
                message = { ...data, text: "[Failed to decrypt]" }
            }
            setMessages(prev => [message, ...prev])

            if (messagesWrapperRef.current.scrollTop >= -10) messagesWrapperRef.current.scrollTop = 0
            else if (data.senderid == link) {
                setIsNewMessage(true)
                setShowScroll(true)
            }
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

        if (messagesWrapperRef.current.scrollTop >= -10) {
            setIsNewMessage(false)
            setShowScroll(false)
        }

        if (messagesWrapperRef.current.scrollTop <= -200) setShowScroll(true)
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

    const sendmessage = async (e) => {
        e.preventDefault()
        startnetworkrequest(false)

        try {
            const text = await encryptMessage(secretRef.current, messagetext, "text")
            const formdata = new FormData()
            formdata.append('text', text)
            formdata.append('receiverid', link)

            if (!image && !text) return

            if (image)
            {
                const imageArrayBuffer = await image.arrayBuffer()
                const encryptedimage = await encryptMessage(secretRef.current, imageArrayBuffer, "image")
                const blob = new Blob([encryptedimage])
                formdata.append('image', blob)
            }

            setCanSendMessage(false)
            const message = await axios.post('/auth/sendmessage',
                formdata, {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            if (message.data == null || message.data.messagedata == null) throw 'Error'
            message.data.messagedata.text = messagetext

            setImage(null)
            setImagePreview(null) 
            setMessagetext("")
            setCanSendMessage(true)
        } catch (err) {
            if (err?.response?.status == 401) {
                const isloggedin = await updatetoken()
                if (isloggedin) sendmessage(e)
            }
            else addToast(err.response?.data?.message || "An error occurred", "red")
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
                        const decryptedText = msg.text ? await decryptMessage(secretRef.current, msg.text, "text") : ""

                        const images = msg.images
                        msg.images = await Promise.all(
                            images.map(link => reconstructImage(link, secretRef.current))
                        )

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
            if (err?.response?.status == 401) await updatetoken()
            else {
                addToast(err.response?.data?.message || "An error occurred", "red")
                if (err?.response?.status == 403) navigate("/profile/" + link)
            }
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
            if (err?.response?.status == 401) {
                const isloggedin = await updatetoken()
                if (isloggedin) deletemessage(id)
            }
            else addToast(err.response?.data?.message || "An error occurred", "red")
        }

        setIsNetworkButtonDisabled(false)
    }, [])

    const [isImageCompressed, setIsImageCompressed] = useState(true)
    const [canSendMessage, setCanSendMessage] = useState(false)

    return (
        <>
            <div className='wrapper'>
                <div className='messages-page-wrapper'>
                    {userdata && userdata.username && <h1>{userdata.username}</h1>}

                    <Phone className='clickable-icon' onClick={() => { startCall(userdata) }}/>
                </div>

                    <div className='messages-wrapper' ref={messagesWrapperRef}>
                        
                        {messages.map((msg) => (
                            <MessageItem
                                key={msg.id}
                                msg={msg}
                                userId={user.id}
                                onDelete={deletemessage}
                                showImage={showImage}
                                userdata={msg.senderid == user.id ? {...user, avatar, banner} : userdata}
                            />  
                        ))}

                    </div>
                    {showScroll && <div className='messages-down' onClick={() => {
                        if (messagesWrapperRef?.current) messagesWrapperRef.current.scrollTo({top: 0, behavior: "smooth"})
                    }}>
                        {isNewMessage && <span>New message</span>}
                        <ChevronDown/>
                    </div>}

                <form className='message-sender' onKeyDown={(e) => { 
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        if (isImageCompressed && canSendMessage && socket && (messagetext !== "" || image)) sendmessage(e)
                    }
                 }}>

                    {imagePreview && <div className='message-preview-image'>
                        <img src={imagePreview} alt="imagetosend"/>
                        <CircleX className='clickable-icon' onClick={() => {
                            setImagePreview(null)
                            setImage(null)
                        }}/>
                    </div>}

                    <div className='message-content'>
                        <MessageInput value={messagetext} onChange={(e) => setMessagetext(e.target.value)}/>
                        <label className='message-image-upload' htmlFor="messageimg">
                            <ImageUp className='clickable-icon'/>
                        </label>
                    </div>

                    <input id='messageimg' hidden type="file" accept="image/*" onChange={async (e) => {
                        const file = e.target.files[0]
                        e.target.value = null
                        if (!file) return
                        setIsImageCompressed(false)
                        setImagePreview(URL.createObjectURL(file))

                        await ffmpeg.load()

                        try { await ffmpeg.unlink("input.webp") } catch {}
                        try { await ffmpeg.unlink("output.webp") } catch {}

                        await ffmpeg.writeFile("input.webp", await fetchFile(file))

                        await ffmpeg.exec([
                            "-i",
                            "input.webp",
                            "-vf",
                            "scale='min(1920,iw)':'min(1920,ih)':force_original_aspect_ratio=decrease",
                            "-c:v",
                            "libwebp",
                            "-q:v",
                            "80",
                            "output.webp"
                        ])

                        const data = await ffmpeg.readFile('output.webp')
                        const webpBlob = new Blob([data.buffer], { type: "image/webp" })

                        if (webpBlob) {
                            setImage(new File([webpBlob], "messageimage.webp", { type: "image/webp" }))
                        }
                        setIsImageCompressed(true)
                    }}/>
                    
                    <Send className={`message-send-icon ${isImageCompressed && socket && canSendMessage && (messagetext != "" || image) ? "clickable-icon" : "unclickable-icon"}`} onClick={(e) => {
                        if (isImageCompressed && socket && canSendMessage && (messagetext != "" || image)) sendmessage(e)
                    }}/>
                </form>

            </div>
        </>
    )
}

export default Messages