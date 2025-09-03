import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { useAuth } from '../context/authcontext'
import ProfileEditor from '../components/profileeditor'
import getuserprofile from '../tools/getuserprofile'
import '../css/profile.css'
import { useImageViewer } from '../context/imageviewercontext'

function Profile() {

    const { showImage } = useImageViewer()
    const { user, socket, avatar, banner } = useAuth()
    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})
    const [isFollowed, setIsFollowed] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)

    const [isBlocked, setIsBlocked] = useState(false)
    const [isBlocking, setIsBlocking] = useState(false)

    const [showProfileEditor, setShowProfileEditor] = useState(false)

    useEffect(() => {
        if (!socket) return

        socket.on('follow', async (data) => {
            if (data.from != link && data.from != user.id) return

            if (data.from == link) setIsFollowed(true)
            else setIsFollowing(true)
        })

        socket.on('unfollow', async (data) => {
            if (data.from != link && data.from != user.id) return

            if (data.from == link) setIsFollowed(false)
            else setIsFollowing(false)
        })

        socket.on('block', async (data) => {
            if (data.from != link && data.from != user.id) return

            if (data.from == user.id && data.id == link) setIsBlocking(true)
            else setIsBlocked(true)

            setIsFollowed(false)
            setIsFollowing(false)
        })

        socket.on('unblock', async (data) => {
            if (data.from != link && data.from != user.id) return

            if (data.from == user.id && data.id == link) setIsBlocking(false)
            else setIsBlocked(false)
        })

        return () => {
            socket.off('follow')
            socket.off('unfollow')
            socket.off('block')
            socket.off('unblock')
        }
    }, [socket])

    useEffect(() => {
        async function inituser() {
            if (user && user.id == link) return setUserdata({ ...user, avatar, banner })
            const data = await getuserprofile([parseInt(link, 10)])
            setUserdata(data[0])
            if (data == null) {
                addToast("Error loading user", "red")
                navigate("/home")
            }
        }

        inituser()

        if (user && user.id != link) {
            getfollowstate()
            getblockstate()
        }
    }, [link])

    const getfollowstate = async () => {
        try {
            let response = await axios.get('/getfollowstate?user1=' + user.id + '&user2=' + link)

            if (response.data.user1FollowsUser2 == 1) setIsFollowing(true)
            if (response.data.user2FollowsUser1 == 1) setIsFollowed(true)

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const getblockstate = async () => {
        try {
            let response = await axios.get('/getblockstate?user1=' + user.id + '&user2=' + link)

            if (response.data.user1BlockedUser2 == 1) setIsBlocking(true)
            if (response.data.user2BlockedUser1 == 1) setIsBlocked(true)

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }


    const processfollow = async () => {
        try {
            let response = await axios.post("/auth/follow", {
                followeeid: link
            }, {
                withCredentials: true
            })

            setIsFollowing(response.data.followed)
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const processblock = async () => {
        try {

            let response = await axios.post("/auth/block", {
                blockedid: link
            }, {
                withCredentials: true
            })

            setIsBlocking(response.data.blocked)
            setIsFollowed(false)
            setIsFollowing(false)
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    return (
        <>
            <div className='profile-wrapper'>
                <div className='profile'>

                    <div className='profile-banner-wrapper'>
                        <img onClick={() => showImage(userdata.banner, "Banner")} src={userdata.banner} alt="Banner" />
                        <div className='profile-avatar-wrapper'>
                            <img onClick={() => showImage(userdata.avatar, "Avatar")} src={userdata.avatar} alt="Avatar" />
                        </div>
                    </div>

                    <h1>{userdata.username}</h1>
                    <h2>{user?.id == link ? user.bio : userdata.bio}</h2>


                    {user && user.id != link ? <>
                        {isBlocked || isBlocking ? <>

                            <h2>{isBlocked ? "User blocked you" : "You blocked this user"}</h2>

                        </> : <>

                            <button onClick={() => navigate("/messages/" + link)}>Send message</button>
                            <button onClick={() => processfollow()}>
                                {isFollowing ? "Unfollow" : (isFollowed ? "Follow back" : "Follow")}
                            </button>
                            {isFollowed && <span>Follows you</span>}
                        </>}

                        <button onClick={() => processblock()}>{isBlocking ? "Unblock" : (isBlocked ? "Block back" : "Block")}</button>

                    </> : user ? <>

                        <button onClick={() => setShowProfileEditor(!showProfileEditor)}>Open editor</button>
                        {showProfileEditor ? <ProfileEditor /> : null}

                    </> : null}
                </div>
            </div>
        </>
    )
}

export default Profile