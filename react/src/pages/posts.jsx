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
import { useImageViewer } from '../context/imageviewercontext'
import { formatNumber, formatTime } from '../tools/tools'
import { Heart, MessageCircle, Trash } from 'lucide-react'

const Post = memo(forwardRef(({ link, post, poster, navigate, setRepliedto, setShowPoster, user, likePost, deletepost, showImage, type, addToast }, ref) => {
    if (post.id == 0) return null
    const created_at = new Date(post.created_at).toLocaleString()
    const formateddate = formatTime(created_at)

    return (
        <div className={(type == "reply" ? 'reply' : 'postabove') + " post"} onClick={() => {
            if (window.getSelection() && window.getSelection().toString().length > 0) return
            navigate(`/posts/${post.id}`)
        }}
            ref={ref}>

            <div className='avatar-wrapper'>
                {poster?.id && poster?.avatar && <NavLink className="navlink" onClick={(e) => e.stopPropagation()} to={`/profile/${poster.id}`}><img className="avatar clickable-icon" src={poster.avatar} alt="avatar" /></NavLink>}
            </div>

            <div className='post-content'>
                <div className='post-detail'>
                    {poster?.id && poster?.username && <NavLink className="navlink" onClick={(e) => e.stopPropagation()} to={`/profile/${poster.id}`}><h3>{poster.username}</h3></NavLink>}
                    {poster?.id && poster?.tag && <NavLink className="navlink" onClick={(e) => e.stopPropagation()} to={`/profile/${poster.id}`}><h4>@{poster.tag}</h4></NavLink>}

                    <p title={created_at}>• {formateddate}</p>
                </div>

                <div className='post-data' >
                    {post?.text && <h2>{post.text}</h2>}
                    {post?.image && <img className='clickable' src={post.image} alt="image" onClick={(e) => {
                        e.stopPropagation()
                        showImage(post.image, "image")
                    }} />}
                </div>

                {/* {"Likes : " + post?.like_count} {"Replies : " + post?.reply_count} */}

                <div className='post-icons'>
                    
                    <div className='post-icon-wrapper'>
                        <Heart className={(post?.liked ? "liked" : "unliked") + " clickable-icon"}  onClick={(e) => {
                            e.stopPropagation() 
                            likePost(post.id)
                        }}></Heart>

                       {post?.like_count && <p title={post.like_count}>{formatNumber(post.like_count)}</p>}
                    </div>

                    <div className='post-icon-wrapper'>
                        <MessageCircle className='clickable-icon' onClick={(e) => {
                            e.stopPropagation()
                            if (!user) return addToast("You are not connected", "red")
                            setRepliedto(post.id)
                            setShowPoster(true)
                        }}></MessageCircle>

                        {post?.reply_count && <p title={post.reply_count}>{formatNumber(post.reply_count)}</p>}
                    </div>

                    <div className='post-icon-wrapper'>
                        {poster?.id == user?.id && <Trash className='clickable-icon' onClick={(e) => {
                            e.stopPropagation()
                            deletepost(link, post.id, "replies")
                        }}>{"Delete"}</Trash>}
                    </div>

                </div>

            </div>
        </div>
    )
}))

function Posts({ overrideLink }) {
    const navigate = useNavigate()
    let { link } = useParams()
    if (overrideLink != null) link = overrideLink

    const { user, avatar, banner, startnetworkrequest, networkControllerRef } = useAuth()
    const { showImage } = useImageViewer()
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

    const [isEndOfReplies, setIsEndOfReplies] = useState(false)

    /////////////////////
    // SCROLLING LOGIC //
    /////////////////////
    const scrollWrapperRef = useRef(null)


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
        if (repliesLengthRef.current && (scrollWrapperRef.current.clientHeight + scrollWrapperRef.current.scrollTop >= scrollWrapperRef.current.scrollHeight - 200
            || !(scrollWrapperRef.current.scrollHeight > scrollWrapperRef.current.clientHeight))) {
            getReplies(repliesLengthRef.current)
        }
    }

    const PostsAboveScrollCheck = () => {
        if (postsAboveIDRef.current && (scrollWrapperRef.current.scrollTop <= 200
            || !(scrollWrapperRef.current.scrollHeight > scrollWrapperRef.current.clientHeight))) {
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

        const box = scrollWrapperRef.current
        const handleScroll = () => {
            RepliesScrollCheck()
            PostsAboveScrollCheck()
        }

        box.addEventListener('scroll', handleScroll)
        return () => {
            box.removeEventListener('scroll', handleScroll)
        }
    }, [link])

    const getPostsAbove = async (id) => {
        if (!canLoadMorePostsAboveRef.current) return
        canLoadMorePostsAboveRef.current = false
        setCanLoadMorePostsAbove(false)

        try {
            const response = await axios.get(`/auth/getpostsabove?postid=${id}`, { withCredentials: true })

            if (id == link && response.data.posts.length == 0) {
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
            if (response.data.end) return setIsEndOfReplies(true)

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }

        canLoadMoreRepliesRef.current = true
        setCanLoadMoreReplies(true)
    }

    const likePost = useCallback(async (postid) => {
        if (!user) return addToast("You are not connected", "red")

        try {
            const response = await axios.post(`/auth/like`, { postid }, { withCredentials: true })

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

    const deletepost = useCallback(async (link, id, list) => {
        startnetworkrequest()

        try {
            const response = await axios.post('/auth/deletepost', {
                postid: id
            }, {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            if (id == link) navigate("/home")

            if (list == "above")
                setPostsAbove(prev => prev.filter(prev => prev.post.id !== id))
            else
                setReplies(prev => prev.filter(prev => prev.post.id !== id))

            if (list == "above") navigate("/home")
            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }, [])

    return (
        <>
            <div className='wrapper' ref={scrollWrapperRef}>
                {(user && link==0) && <PostSender setPosts={setPostsAbove} setReplies={setReplies} repliedto={0} setShowPoster={setShowPoster} showPoster={showPoster} link={link} />}

                {(postsAbove.length == 0  && replies.length == 0) && <p>Uh-oh something's wrong, there's nothing here !</p> }

                <div className='postsabove-wrapper'>
                    {postsAbove.map((data, index) => (
                        <Post
                            key={data.post.id}
                            ref={index === 0 ? firstPostRef : null}
                            link={link}
                            type="above"
                            post={data.post}
                            poster={data.poster}
                            navigate={navigate}
                            setRepliedto={setRepliedto}
                            setShowPoster={setShowPoster}
                            user={user}
                            likePost={likePost}
                            deletepost={deletepost}
                            showImage={showImage}
                            addToast={addToast}
                        />
                    ))}
                </div>

                <div className='replies-wrapper'>
                    {replies.map((data) => (
                        <Post
                            key={data.post.id}
                            ref={null}
                            link={link}
                            type="reply"
                            post={data.post}
                            poster={data.poster}
                            navigate={navigate}
                            setRepliedto={setRepliedto}
                            setShowPoster={setShowPoster}
                            user={user}
                            likePost={likePost}
                            deletepost={deletepost}
                            showImage={showImage}
                            addToast={addToast}
                        />
                    ))}
                </div>

                {showPoster && <PostSender setPosts={setPostsAbove} setReplies={setReplies} repliedto={repliedto} setShowPoster={setShowPoster} showPoster={showPoster} link={link} type="fullscreen" />}
            </div>
        </>
    )
}

export default Posts