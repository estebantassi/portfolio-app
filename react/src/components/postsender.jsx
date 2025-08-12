import { AuthContext } from '../context/authcontext'
import { useContext, useEffect, useState } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'

function PostSender({ setPosts, setReplies, repliedto, setShowPoster, link }) {
    const { user, avatar, banner } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)

    const [text, setText] = useState("")
    const [image, setImage] = useState("")
    const [imagePreview, setImagePreview] = useState("")

    const sendPost = async (e) => {
        e.preventDefault()

        const formdata = new FormData()
        formdata.append("text", text)
        formdata.append('repliedto', repliedto)
        formdata.append("image", image)

        try {
            const response = await axios.post('/auth/sendpost',
                formdata
                , {
                withCredentials: true
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

            if (repliedto == link) setReplies(prev => [{post: response.data.postdata, poster}, ...prev])

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
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    return (
        <div>
            <h1>SEND A POST</h1>

            <form onSubmit={(e) => sendPost(e)}>
                <input value={text} placeholder='Write something...' onChange={(e) => setText(e.target.value)} />
                <input type="file" accept="image/*" onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                        setImage(file)
                        setImagePreview(URL.createObjectURL(file))
                    }
                     e.target.value = ''
                }} />
                {imagePreview && <img src={imagePreview} alt="postimage" />}

                <button>Send</button>
            </form>
            <button onClick={() => setShowPoster(false)}>Close</button>
        </div>
    )


}

export default PostSender