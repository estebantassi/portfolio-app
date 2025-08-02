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
import PostSender from '../components/postsender'

const Replies = memo(({ post, poster, navigate, setRepliedto, setShowPoster, isConnected, likePost }) => {
    const created_at = new Date(post.created_at)

    return (
        <div className='postsreplies-wrapper' onClick={() => navigate(`/posts/${post.id}`)}>
            {poster?.avatar && poster?.id && <NavLink to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}
            {post?.text && <h2>{post.text}</h2>}
            {post?.image && <img src={post.image} alt=""/>}
            <p>{post?.id} {created_at.toLocaleString()}</p>
            <button onClick={(e) => likePost(e, post.id)}>{post?.liked ? "Unlike" : "Like"}</button>
            {isConnected && <button onClick={(e) => {
                e.stopPropagation()
                setRepliedto(post.id)
                setShowPoster(true)
            }}>Reply</button>}
        </div>
    )
})

const PostsAbove = memo(({ post, poster, navigate, setRepliedto, setShowPoster, isConnected, likePost }) => {
    const created_at = new Date(post.created_at)

    return (
        <div className='postsabove-wrapper' onClick={() => navigate(`/posts/${post.id}`)}>
            {poster?.avatar && poster?.id && <NavLink to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}
            {post?.text && <h2>{post.text}</h2>}
            {post?.image && <img src={post.image} alt=""/>}
            <p>{post?.id} {created_at.toLocaleString()}</p>
            <button onClick={(e) => likePost(e, post.id)}>{post?.liked ? "Unlike" : "Like"}</button>
            {isConnected && <button onClick={(e) => {
                e.stopPropagation()
                setRepliedto(post.id)
                setShowPoster(true)
            }}>Reply</button>}
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
    const [replies, setReplies] = useState([])
    const [canLoadMoreReplies, setCanLoadMoreReplies] = useState(true)
    const [showPoster, setShowPoster] = useState(false)
    const [repliedto, setRepliedto] = useState(null)

    useEffect(() => {
        if (isNaN(link) || !(link > 0)) {
            addToast("This post doesn't exist", "red")
            return navigate("/home")
        }

        setShowPoster(false)
        setCanLoadMoreReplies(true)
        setPostsAbove([])
        setReplies([])
        getPostsAbove()
        getReplies(0)
    }, [link])

    const getPostsAbove = async () => {
        try {
            const response = await axios.get(`/auth/getpostsabove?postid=${link}`, { withCredentials: true })

            for (const post of response.data.posts) {
                const poster = await getuserprofile(post.poster_id)
                setPostsAbove(prev => [...prev, { poster, post }])
            }

        } catch (err) {
            if (err?.response?.status == 404) navigate("/home")
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const getReplies = async (offset = replies.length) => {
        try {
            const response = await axios.get(`/auth/getposts?date=${date}&repliedto=${link}&offset=${offset}`, { withCredentials: true })

            for (const post of response.data.posts) {
                const poster = await getuserprofile(post.poster_id)
                setReplies(prev => [...prev, { poster, post }])
            }

            if (response.data.end) setCanLoadMoreReplies(false)

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const likePost = useCallback(async (e, postid) =>
    {
        e.stopPropagation()
        if (!user) return addToast("You are not connected", "red")

        try {
            const response = await axios.post(`/auth/like`, {postid}, { withCredentials: true })

            setReplies(prev =>
                prev.map(item =>
                    item.post.id === postid
                    ? { ...item, post: { ...item.post, liked: response.data.liked } }
                    : item
                )
            )

            setPostsAbove(prev =>
                prev.map(item =>
                    item.post.id === postid
                    ? { ...item, post: { ...item.post, liked: response.data.liked } }
                    : item
                )
            )
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }, [])

    return (
        <>
            {postsAbove.map((data) => (
                <PostsAbove
                    key={data.post.id}
                    post={data.post}
                    poster={data.poster}
                    navigate={navigate}
                    setRepliedto={setRepliedto}
                    setShowPoster={setShowPoster}
                    isConnected={user}
                    likePost={likePost}
                />
            ))}

            {replies.map((data) => (
                <Replies
                    key={data.post.id}
                    post={data.post}
                    poster={data.poster}
                    navigate={navigate}
                    setRepliedto={setRepliedto}
                    setShowPoster={setShowPoster}
                    isConnected={user}
                    likePost={likePost}
                />
            ))}

            {showPoster && <PostSender setPosts={repliedto == link ? setReplies : null} repliedto={repliedto} setShowPoster={setShowPoster}/>}

            {canLoadMoreReplies && <button onClick={() => getReplies()}>Load More</button>}

        {/* <button onClick={() => getPostsAbove()}>Load more posts</button> */}
        </>
    )
}

export default Posts