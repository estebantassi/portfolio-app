import { useState } from 'react'
import { useAuth } from '../context/authcontext'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { memo } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router'
import getuserprofile from '../tools/getuserprofile'
import { useEffect } from 'react'
import { useCallback } from 'react'

const Replies = memo(({ post, poster }) => {
    const created_at = new Date(post.created_at)

    return (
        <div>
            {poster?.avatar && poster?.id && <NavLink to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}
            {post?.text && <h2>{post.text}</h2>}
            {post?.image && <img src={post.image} alt=""/>}
            <p>{post?.id} {created_at.toLocaleString()}</p>
        </div>
    )
})

const PostsAbove = memo(({ post, poster }) => {
    const created_at = new Date(post.created_at)

    return (
        <div style={{backgroundColor: "rgba(0, 0, 255, 0.07)"}}>
            {poster?.avatar && poster?.id && <NavLink to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}
            {post?.text && <h2>{post.text}</h2>}
            {post?.image && <img src={post.image} alt=""/>}
            <p>{post?.id} {created_at.toLocaleString()}</p>
        </div>
    )
})

function Posts() {
    const { link } = useParams()
    const navigate = useNavigate()

    const { user, avatar, banner } = useAuth()
    const { addToast } = useContext(ToastContext)

    const [date, setDate] = useState(new Date())
    const [postsAbove, setPostsAbove] = useState([])
    const [replies, setRepleis] = useState([])

    useEffect(() => {
        if (isNaN(link) || !(link > 0)) {
            addToast("This post doesn't exist", "red")
            return navigate("/home")
        }
        getPostsAbove()
        getReplies()
    }, [])

    const getPostsAbove = async () => {
        try {
            const response = await axios.get(`/getpostsabove?postid=${link}`)

            for (const post of response.data.posts) {
                const poster = await getuserprofile(post.poster_id)
                setPostsAbove(prev => [...prev, { poster, post }])
            }

        } catch (err) {
            if (err?.response?.status == 404) navigate("/home")
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const getReplies = async () => {
        try {
            const response = await axios.get(`/getposts?date=${date}&repliedto=${link}&offset=${replies.length}`)

            for (const post of response.data.posts) {
                const poster = await getuserprofile(post.poster_id)
                setRepleis(prev => [...prev, { poster, post }])
            }

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    return (
        <>
            {postsAbove.map((data) => (
                <PostsAbove
                    key={data.post.id}
                    post={data.post}
                    poster={data.poster}
                />
            ))}

            {replies.map((data) => (
                <Replies
                    key={data.post.id}
                    post={data.post}
                    poster={data.poster}
                />
            ))}

        {/* <button onClick={() => getPostsAbove()}>Load more posts</button> */}
        </>
    )
}

export default Posts