import { useState } from 'react'
import { useAuth } from '../context/authcontext'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { memo } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router'
import { useEffect } from 'react'
import { useCallback } from 'react'
import PostSender from '../components/postsender'
import { useRef } from 'react'
import "../css/posts.css"
import { StopPropagation } from '../components/utils'


const Replies = memo(({ post, poster, navigate, setRepliedto, setShowPoster, isConnected, likePost, deletepost }) => {
    const created_at = new Date(post.created_at)

    return (
        <div className='postsreplies-wrapper' onClick={() => navigate(`/posts/${post.id}`)}>
            <StopPropagation>
                <NavLink to={`/profile/${poster?.id}`}><img src={poster?.avatar} alt="avatar" /></NavLink>

                <h2>{post?.text}</h2>
                {post?.image && <img src={post.image} alt="image"/>}

                <p>{post?.id} {created_at.toLocaleString()} {"Likes : " + post?.like_count} {"Replies : " + post?.reply_count}</p>

                <button onClick={() => likePost(post.id)}>{post?.liked ? "Unlike" : "Like"}</button>

                {poster?.id == isConnected?.id && <button onClick={() => deletepost(post.id, "replies")}>{"Delete"}</button>}

                {isConnected && <button onClick={() => {
                    setRepliedto(post.id)
                    setShowPoster(true)
                }}>Reply</button>}
            </StopPropagation>
        </div>
    )
})

const PostsAbove = memo(({ post, poster, navigate, setRepliedto, setShowPoster, isConnected, likePost, deletepost }) => {
    const created_at = new Date(post.created_at)

    return (
        post.id == 0 ? null :
        <div className='postsabove-wrapper' onClick={() => navigate(`/posts/${post.id}`)}>
            <StopPropagation>
                {poster?.avatar && poster?.id && <NavLink to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}
                {post?.text && <h2>{post.text}</h2>}
                {post?.image && <img src={post.image} alt=""/>}
                <p>{post?.id} {created_at.toLocaleString()} {"Likes : " + post?.like_count} {"Replies : " + post?.reply_count}</p>

                <button onClick={() => likePost(post.id)}>{post?.liked ? "Unlike" : "Like"}</button>

                {isConnected && poster.id == isConnected.id && <button onClick={() => deletepost(post.id, "above")}>{"Delete"}</button>}
                
                {isConnected && <button onClick={() => {
                    setRepliedto(post.id)
                    setShowPoster(true)
                }}>Reply</button>}
            </StopPropagation>
        </div>
    )
})

function Posts({ overrideLink }) {
    const navigate = useNavigate()
    let { link } = useParams()
    if (overrideLink != null) link = overrideLink

    const { user, avatar, banner, startnetworkrequest, networkControllerRef } = useAuth()
    const { addToast } = useContext(ToastContext)

    const [date, setDate] = useState(new Date())
    const [postsAbove, setPostsAbove] = useState([])
    const [replies, setReplies] = useState([])

    const [canLoadMoreReplies, setCanLoadMoreReplies] = useState(true)
    const canLoadMoreRepliesRef = useRef(true)
    const [canLoadMorePostsAbove, setCanLoadMorePostsAbove] = useState(true)
    const canLoadMorePostsAboveRef = useRef(true)

    const [showPoster, setShowPoster] = useState(false)
    const [repliedto, setRepliedto] = useState(null)

    useEffect(() => {
        if (isNaN(link) || !(link >= 0)) {
            addToast("This post doesn't exist", "red")
            return navigate("/home")
        }

        setShowPoster(false)
        setCanLoadMoreReplies(true)
        setPostsAbove([])
        setReplies([])
        getPostsAbove(link)
        getReplies(0)
    }, [link])

    const getPostsAbove = async (id) => {
        if (!canLoadMorePostsAboveRef.current) return
        canLoadMorePostsAboveRef.current = false

        try {
            const response = await axios.get(`/auth/getpostsabove?postid=${id}`, { withCredentials: true })

            if (response.data.end) return

            setPostsAbove(prev => [...response.data.posts, ...prev])


        } catch (err) {
            if (err?.response?.status == 404) navigate("/home")
            addToast(err.response?.data?.message || "An error occurred", "red")
        }

        canLoadMorePostsAboveRef.current = true
        setCanLoadMorePostsAbove(true)
    }

    const getReplies = async (offset) => {
        if (!canLoadMoreRepliesRef.current) return
        canLoadMoreRepliesRef.current = false

        try {
            const response = await axios.get(`/auth/getposts?date=${date}&repliedto=${link}&offset=${offset}`, { withCredentials: true })

            setReplies(prev => [...prev, ...response.data.posts])

            if (response.data.end) return

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }

        canLoadMoreRepliesRef.current = true
        setCanLoadMoreReplies(true)
    }

    const likePost = useCallback(async (postid) =>
    {
        if (!user) return addToast("You are not connected", "red")

        try {
            const response = await axios.post(`/auth/like`, {postid}, { withCredentials: true })

            setReplies(prev =>
                prev.map(item =>
                    item.post.id === postid
                    ? { ...item, post: { ...item.post, liked: response.data.liked, like_count: item.post.like_count + (response.data.liked == true ? 1 : -1) } }
                    : item
                )
            )

            setPostsAbove(prev =>
                prev.map(item =>
                    item.post.id === postid
                    ? { ...item, post: { ...item.post, liked: response.data.liked, like_count: item.post.like_count + (response.data.liked == true ? 1 : -1) } }
                    : item
                )
            )
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }, [])

    const deletepost = useCallback(async (id, list) => {
        startnetworkrequest()

        try {
            const response = await axios.post('/auth/deletepost', {
                postid: id
            }, {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            list == "above" ? setPostsAbove(prev => prev.filter(prev => prev.post.id !== id)) : setReplies(prev => prev.filter(prev => prev.post.id !== id))
            list == "above" && navigate("/home")
            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }, [])

    return (
        <>
            {user && <PostSender setPosts={setPostsAbove} setReplies={setReplies} repliedto={0} setShowPoster={setShowPoster} link={link}/>}

            <button disabled={canLoadMorePostsAbove} onClick={() => getPostsAbove(postsAbove[0].post.replied_to)}>Load More</button>

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
                    deletepost={deletepost}
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
                    deletepost={deletepost}
                />
            ))}

            {showPoster && <PostSender setPosts={setPostsAbove} setReplies={setReplies} repliedto={repliedto} setShowPoster={setShowPoster} link={link}/>}

            <button disabled={canLoadMoreReplies} onClick={() => getReplies(replies.length)}>Load More</button>
        </>
    )
}

export default Posts