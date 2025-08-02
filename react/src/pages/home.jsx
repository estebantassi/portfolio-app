import { useState } from 'react'
import { useAuth } from '../context/authcontext'
import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { memo } from 'react'
import { NavLink, useNavigate } from 'react-router'
import getuserprofile from '../tools/getuserprofile'
import { useEffect } from 'react'
import { useCallback } from 'react'
import '../css/posts.css'

const PostItem = memo(({ post, poster, navigate }) => {
  const created_at = new Date(post.created_at)

  return (
    <div className='post-home-wrapper' onClick={() => navigate(`/posts/${post.id}`)}>
      {post?.text && <h2>{post.text}</h2>}
      {post?.image && <img src={post.image} alt=""/>}
      <p>{poster?.username} {created_at.toLocaleString()}</p>
    </div>
  )
})

function Home() {

  const navigate = useNavigate()

  const { user, avatar, banner } = useAuth()
  const { addToast } = useContext(ToastContext)

  const [postText, setPostText] = useState("")
  const [postImage, setPostImage] = useState("")
  const [postImagePreview, setPostImagePreview] = useState("")

  const [date, setDate] = useState(new Date())
  const [posts, setPosts] = useState([])

  useEffect(() => {
    getPosts()
  }, [])

  const getPosts = async () => {
    try {
      const response = await axios.get(`/auth/getposts?date=${date}&offset=${posts.length}&repliedto=0`, { withCredentials: true })

      for (const post of response.data.posts) {
          const poster = await getuserprofile(post.poster_id)
          setPosts(prev => [...prev, { poster, post }])
      }

    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
  }

  const sendPost = async (e) => {
    e.preventDefault()

    const formdata = new FormData()
    formdata.append('text', postText)
    formdata.append('repliedto', 0)
    formdata.append('image', postImage)

    try {
      const response = await axios.post('/auth/sendpost', 
        formdata, {
        withCredentials: true
      })

      setPostText("")
      setPostImage("")
      setPostImagePreview("")

      const poster = {
        username: user.username,
        tag: user.tag,
        avatar: avatar,
        banner: banner,
        bio: user.bio,
        id: user.id
      }

      setPosts(prev => [...prev, { poster, post: response.data.postdata }])

      addToast(response?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
  }

  return (
    <>
      <h1>{user?.username && user.username}</h1>

      {user &&

      <form onSubmit={(e) => sendPost(e)}>
        <input value={postText} placeholder='Write something...' onChange={(e) => setPostText(e.target.value)} />
        <input type="file" accept="image/*" onChange={(e) => {
          const file = e.target.files[0]
          if (file) {
            setPostImage(file)
            setPostImagePreview(URL.createObjectURL(file))
          }
        }} />
        {postImagePreview && <img src={postImagePreview} alt="postimage" />}

        <button>Send</button>
      </form>

      }

      {posts.map((data) => (
        <PostItem
          key={data.post.id}
          post={data.post}
          poster={data.poster}
          navigate={navigate}
        />
      ))}

      <button onClick={() => getPosts()}>Load more posts</button>
    </>
  )
}

export default Home