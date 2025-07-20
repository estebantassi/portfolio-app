import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { AuthContext } from '../context/authcontext'
import ProfileEditor from '../components/profileeditor'

function Profile() {

    const { user, socket } = useContext(AuthContext)
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
        const userdata = JSON.parse(localStorage.getItem(link))
        if (userdata == null || new Date(userdata.expires) < new Date()) getuserprofile()
        else setUserdata(userdata)

        if (user && user.id != link) {
            getfollowstate()
            getblockstate()
        }

        const handleStorage = (event) => {
            if (event.key === link) {
                const updatedData = JSON.parse(event.newValue)
                setUserdata(updatedData)
            }
        }
        window.addEventListener("storage", handleStorage)
        return () => window.removeEventListener("storage", handleStorage)
    }, [link])

    const getuserprofile = async () => {
        try {
            let response = await axios.get('/getuserprofile?id=' + link)

            if (response == null || response.data == null) throw 'Error'
            if (response.data.message != null) delete response.data.message

            response.data.expires = new Date(Date.now() + 60 * 1000)

            setUserdata(response.data)

            localStorage.setItem(link, JSON.stringify(response.data))
        } catch (err) {
            navigate("/home")
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const getfollowstate = async () => {
        try {
            let response = await axios.get('/getfollowstate?user1=' + user.id + '&user2=' + link)

            if (response == null || response.data == null) throw 'Error'
            if (response.data.user1FollowsUser2 == null || response.data.user2FollowsUser1 == null) throw 'Error'

            if (response.data.user1FollowsUser2 == 1) setIsFollowing (true)
            if (response.data.user2FollowsUser1 == 1) setIsFollowed (true)

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const getblockstate = async () => {
        try {
            let response = await axios.get('/getblockstate?user1=' + user.id + '&user2=' + link)

            if (response == null || response.data == null) throw 'Error'
            if (response.data.user1BlockedUser2 == null || response.data.user2BlockedUser1 == null) throw 'Error'

            if (response.data.user1BlockedUser2 == 1) setIsBlocking (true)
            if (response.data.user2BlockedUser1 == 1) setIsBlocked (true)

        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }


    const processfollow = async () => {
        try {
            let choice = "follow"
            if (isFollowing) choice = "unfollow"
            let response = await axios.post("/auth/" + choice, {
                followeeid: link
            }, {
                withCredentials: true
            })

            if (response == null) throw 'Error'
            if (isFollowing) setIsFollowing(false)
            else setIsFollowing(true)
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const processblock = async () => {
        try {
            let choice = "block"
            if (isBlocking) choice = "unblock"
            let response = await axios.post("/auth/" + choice, {
                blockedid: link
            }, {
                withCredentials: true
            })

            if (response == null) throw 'Error'
            if (isBlocking) setIsBlocking(false)
            else setIsBlocking(true)
            setIsFollowed(false)
            setIsFollowing(false)
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    return (
        <>
            <h1>{userdata.username ? userdata.username : ""}</h1>
            <img src={userdata.avatar} alt="Avatar" />


            { isBlocked || isBlocking ? <>

                {isBlocked ? <h2>User blocked you</h2> : <h2>You blocked this user</h2>}
                
                </> : <>

                { user && user.id != link ? <>
                <button onClick={() => navigate("/messages/" + link)}>Send message</button>
                <button onClick={() => processfollow()}>
                    {
                        isFollowing ? "Unfollow" : (isFollowed ? "Follow back" : "Follow")
                    }
                </button>
                {isFollowed ? <>Follows you</> : <></>}
                
                </> : <>

                <button onClick={() => setShowProfileEditor(!showProfileEditor)}>Open editor</button>
                
                {showProfileEditor ? <ProfileEditor /> : null}

                </>}
                
            </>}

            { user && user.id != link ? <button onClick={() => processblock()}>
                {
                    isBlocking ? "Unblock" : (isBlocked ? "Block back" : "Block")
                }
            </button> : null}
        </>
    )
}

export default Profile