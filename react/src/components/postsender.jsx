import { AuthContext } from '../context/authcontext'
import { useContext, useEffect, useState } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { PostInput } from './inputs'
import { useRef } from 'react'
import { ImageUp, CircleX, Send } from 'lucide-react'
import "../css/posts.css"
import { NavLink } from 'react-router'
import { StopPropagation } from './utils'

function PostSender({ setPosts, setReplies, repliedto, setShowPoster, showPoster, link, type="inline" }) {
    const { user, avatar, banner, isNetworkButtonDisabled, startnetworkrequest, networkControllerRef, updatetoken } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)

    const [text, setText] = useState("")
    const [image, setImage] = useState("")
    const [imagePreview, setImagePreview] = useState("")

    useEffect(() => {
        if (!showPoster) return

        const handleKeyDown = (e) => { if (e.key === "Escape") closePostSender() }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [showPoster])

    const closePostSender = async (e) => {
        setShowPoster(false)
        setText("")
        setImage("")
        setImagePreview("")
    }

    const sendPost = async (e) => {
        e.preventDefault()
        if (postButtonDisabled) return addToast("You're going too fast !", "red")

        startnetworkrequest()

        const formdata = new FormData()
        formdata.append("text", text)
        formdata.append('repliedto', repliedto)
        formdata.append("image", image)

        if (text == "" && image == "") return addToast("You can't post nothing...", "red")

        try {
            const response = await axios.post('/auth/sendpost',
                formdata
                , {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            const poster = {
                username: user.username,
                tag: user.tag,
                avatar: avatar,
                banner: banner,
                bio: user.bio,
                id: user.id
            }

            setText("")
            setImage("")
            setImagePreview("")

            if (repliedto == link) setReplies(prev => [...prev, {post: response.data.postdata, poster}])

            setReplies(prev =>
                prev.map(item =>
                    item.post.id === repliedto
                    ? { ...item, post: { ...item.post, reply_count: item.post.reply_count + 1 } }
                    : item
                )
            )

            setPosts(prev =>
                prev.map(item =>
                    item.post.id === repliedto
                    ? { ...item, post: { ...item.post, reply_count: item.post.reply_count + 1 } }
                    : item
                )
            )
            
            addToast(response?.data?.message || "Success", "green")
            if (type == "fullscreen") setShowPoster(false)
        } catch (err) {
            if (err?.response?.status == 401) {
                const isloggedin = await updatetoken()
                if (isloggedin) sendPost(e)
            }
            else addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const postInputRef = useRef(null)
    const postButtonDisabled = isNetworkButtonDisabled || (!postInputRef.current?.checkValidity() && !image)

    return (
        <div className={`postsender-wrapper postsender-${type}-wrapper`} onClick={() => {
            if (type == "fullscreen") closePostSender()
        }}>
            <StopPropagation>
                <form>
                    <NavLink className="navlink" onClick={(e) => e.stopPropagation()} to={`/profile/${user.id}`}><img className="avatar clickable-icon" src={avatar} alt="avatar" /></NavLink>

                    <div className='post-write'>
                        <PostInput value={text} onChange={(e) => setText(e.target.value)} inputRef={postInputRef}/>
                        <label htmlFor={`post-image-upload-${type}`}>
                            <ImageUp className='clickable-icon post-image-insert' />
                        </label>

                        <input hidden id={`post-image-upload-${type}`} type="file" accept="image/*" onChange={(e) => {
                            const file = e.target.files[0]
                            if (file) {
                                setImage(file)
                                setImagePreview(URL.createObjectURL(file))
                            }
                            e.target.value = ''
                        }} />
                    </div>

                    <Send onClick={(e) => sendPost(e)} className='clickable-icon'/>
                </form>
                <div className='posting-image'>
                    {imagePreview && <img src={imagePreview} alt="postimage" />}
                    {image && <CircleX className='clickable-icon' onClick={() => {
                        setImage("")
                        setImagePreview("")
                    }}/>}
                </div>
                
            </StopPropagation>
        </div>
    )


}

export default PostSender