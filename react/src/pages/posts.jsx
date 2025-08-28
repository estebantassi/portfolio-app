import { useLayoutEffect, useState } from 'react'
import { useAuth } from '../context/authcontext'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { memo } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router'
import { useEffect } from 'react'
import { useCallback } from 'react'
import PostSender from '../components/postsender'
import { useRef, forwardRef } from 'react'
import "../css/posts.css"
import { StopPropagation } from "../components/utils"

const Replies = memo(({ post, poster, navigate, setRepliedto, setShowPoster, isConnected, likePost, deletepost }) => {
    const created_at = new Date(post.created_at)

    return (
        <div className='postsreplies-wrapper' onClick={() => {
            if (window.getSelection() && window.getSelection().toString().length > 0) return
            navigate(`/posts/${post.id}`)
        }}>
                {poster?.avatar && poster?.id && <NavLink onClick={(e) => e.stopPropagation()} to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}

                {post?.text && <h2>{post.text}</h2>}
                {post?.image && <img src={post.image} alt="image"/>}

                <p>{post?.id} {created_at.toLocaleString()} {"Likes : " + post?.like_count} {"Replies : " + post?.reply_count}</p>

                <button onClick={(e) => {
                    likePost(post.id)
                    e.stopPropagation()
                }}>{post?.liked ? "Unlike" : "Like"}</button>

                {poster?.id == isConnected?.id && <button onClick={(e) => {
                    deletepost(post.id, "replies")
                    e.stopPropagation()
                }}>{"Delete"}</button>}

                {isConnected && <button onClick={(e) => {
                    e.stopPropagation()
                    setRepliedto(post.id)
                    setShowPoster(true)
                }}>Reply</button>}
        </div>
    )
})

const PostsAbove = memo(forwardRef(({ post, poster, navigate, setRepliedto, setShowPoster, isConnected, likePost, deletepost }, ref) => {
    if (post.id == 0) return null
    const created_at = new Date(post.created_at)

    return (
        <div className='postsabove-wrapper' onClick={() => {
            if (window.getSelection() && window.getSelection().toString().length > 0) return
            navigate(`/posts/${post.id}`)
        }}
        ref={ref}>
                {poster?.avatar && poster?.id && <NavLink to={`/profile/${poster.id}`}><img src={poster.avatar} alt="avatar" /></NavLink>}

                {post?.text && <h2>{post.text}</h2>}
                {post?.image && <img src={post.image} alt="image"/>}

                <p>{post?.id} {created_at.toLocaleString()} {"Likes : " + post?.like_count} {"Replies : " + post?.reply_count}</p>

                <StopPropagation>
                    <button onClick={() => likePost(post.id)}>{post?.liked ? "Unlike" : "Like"}</button>

                    {isConnected && poster.id == isConnected.id && <button onClick={() => deletepost(post.id, "above")}>{"Delete"}</button>}
                    
                    {isConnected && <button onClick={() => {
                        setRepliedto(post.id)
                        setShowPoster(true)
                    }}>Reply</button>}
                </StopPropagation>
        </div>
    )
}))

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

    /////////////////////
    // SCROLLING LOGIC //
    /////////////////////
    const firstPostRef = useRef(null)
    useEffect(() => {
        if (firstPostRef.current) {
            firstPostRef.current.scrollIntoView({ behavior: "instant", block: "start" })
            firstPostRef.current = null
        }
    }, [postsAbove])

    const loadRepliesButtonRef = useRef(null)
    const repliesLengthRef = useRef(replies?.length)
    useEffect(() => {
        repliesLengthRef.current = replies.length

        RepliesScrollCheck()
    }, [replies.length])

    const loadPostsAboveButtonRef = useRef(null)
    const postsAboveIDRef = useRef(postsAbove[postsAbove.length - 1]?.post?.replied_to)
    useEffect(() => {
        postsAboveIDRef.current = postsAbove[postsAbove.length - 1]?.post?.replied_to

        PostsAboveScrollCheck()
    }, [postsAbove[postsAbove.length - 1]?.post?.replied_to])

    const RepliesScrollCheck = () => {
        if (repliesLengthRef.current && loadRepliesButtonRef?.current?.getBoundingClientRect().top < window.innerHeight + 200)
        {
            getReplies(repliesLengthRef.current)
        }
    }

    const PostsAboveScrollCheck = () => {
        if (postsAboveIDRef.current && loadPostsAboveButtonRef?.current?.getBoundingClientRect().top >= -200)
        {
            getPostsAbove(postsAboveIDRef.current)
        }
    }
    ////////////////////////////
    // END OF SCROLLING LOGIC //
    ////////////////////////////

    useEffect(() => {
        if (isNaN(link) || !(link >= 0)) {
            addToast("This post doesn't exist", "red")
            return navigate("/home")
        }

        canLoadMorePostsAboveRef.current = true
        setCanLoadMorePostsAbove(true)
        canLoadMoreRepliesRef.current = true
        setCanLoadMoreReplies(true)

        setShowPoster(false)
        setPostsAbove([])
        setReplies([])
        getPostsAbove(link)
        getReplies(0)

        const handleScroll = () => {
            RepliesScrollCheck()
            PostsAboveScrollCheck()
        }

        window.addEventListener('scroll', handleScroll)
        return () => {
            window.removeEventListener('scroll', handleScroll)
        }
    }, [link])

    const getPostsAbove = async (id) => {
        if (!canLoadMorePostsAboveRef.current) return
        canLoadMorePostsAboveRef.current = false
        setCanLoadMorePostsAbove(false)

        try {
            const response = await axios.get(`/auth/getpostsabove?postid=${id}`, { withCredentials: true })

            if (id == link && response.data.posts.length == 0)
            {
                addToast("This post has been removed", "red")
                return navigate("/home")
            }

            setPostsAbove(prev => [...prev, ...response.data.posts])
            if (response.data.end) return
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
        setCanLoadMoreReplies(false)

        try {
            const response = await axios.get(`/auth/getposts?date=${date}&repliedto=${link}&offset=${offset}`, { withCredentials: true })

            setReplies(prev => [...response.data.posts, ...prev])
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
            {!showPoster && user && <PostSender setPosts={setPostsAbove} setReplies={setReplies} repliedto={0} setShowPoster={setShowPoster} link={link}/>}

            <div className='posts'>
                <button disabled={!canLoadMorePostsAbove} onClick={() => getPostsAbove(postsAbove[postsAbove.length - 1].post.replied_to)} ref={loadPostsAboveButtonRef}>Load More</button>
                <div className='posts-above'>
                    {postsAbove.map((data, index) => (

                        <PostsAbove
                            key={data.post.id}
                            ref={index === 0 ? firstPostRef : null}
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
                </div>

                <div className='replies'>
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
                </div>

                {showPoster && <PostSender setPosts={setPostsAbove} setReplies={setReplies} repliedto={repliedto} setShowPoster={setShowPoster} link={link}/>}
                <button disabled={!canLoadMoreReplies} onClick={() => getReplies(replies.length)} ref={loadRepliesButtonRef}>Load More</button>
            </div>

            

            
        </>
    )
}

export default Posts