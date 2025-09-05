import { createContext, useState, useContext, useEffect, useRef } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'
import { useNavigate } from "react-router"
import { fetchbase64image } from "../tools/tools"
import { io } from 'socket.io-client'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate()
    const { addToast } = useContext(ToastContext)

    //User data
    const [user, setUser] = useState(Cookies.get("user") ? JSON.parse(Cookies.get("user")) : null)
    const [avatar, setAvatar] = useState(localStorage.getItem("avatar"))
    const [banner, setBanner] = useState(localStorage.getItem("banner"))

    //TimeoutRef for updating/checking user
    const authCheckTimeoutRef = useRef(null)

    //Main network pipeline (singular non-stackable requests)
    const [isNetworkButtonDisabled, setIsNetworkButtonDisabled] = useState(true)
    const networkTimeoutRef = useRef(null)
    const networkControllerRef = useRef(null)

    //WebSockets
    const socketioRef = useRef(null)
    const socketTimeoutRef = useRef(null)
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user) return
        if (socketioRef.current) return

        socketTimeoutRef.current = setTimeout(async () => {
            try {
                //Connect to websockets after 1 second on page reload to prevent spamming
                socketioRef.current = io('http://localhost:4444', {
                    path: '/auth/socket.io',
                    withCredentials: true,
                })

                //Initiate socket
                socketioRef.current.on('connect', () => {
                    setSocket(socketioRef.current)
                })

                //Log the errors (might not need in release)
                socketioRef.current.on('error', (data) => {
                    console.log(data?.message || "Error with websockets")
                })

                //Update profile in real-time
                socketioRef.current.on('profileupdate', async (data) => {
                    setUser(prev => ({...prev, username: data.username, bio: data.bio, tag: data.tag}))

                    if (data?.avatar) {
                        localStorage.setItem("avatar", data.avatar)
                        setAvatar(data.avatar)
                    }
                    if (data?.banner) {
                        localStorage.setItem("banner", data.banner)
                        setBanner(data.banner)
                    }
                })

                //Fetch profile on page reload to check for changes
                let response = await axios.get('/getuserprofile', {
                    params: { id: user.id }
                })
                response.data = response.data.profiles[0]

                const avatarBase64 = await fetchbase64image(response.data.avatar)
                if (avatarBase64 && avatar != avatarBase64){
                    setAvatar(avatarBase64)
                    localStorage.setItem("avatar", avatarBase64)
                }

                const bannerBase64 = await fetchbase64image(response.data.banner)
                if (bannerBase64 && banner != bannerBase64){
                    setBanner(bannerBase64)
                    localStorage.setItem("banner", bannerBase64)
                }

                const newuserdata = {username: response.data.username, tag: response.data.tag, bio: response.data.bio}

                JSON.stringify(user) != JSON.stringify({...user, ...newuserdata}) && setUser(prev => ({...prev, ...newuserdata}))

            } catch (err) {
                console.log(err)
                addToast(err.response?.data?.message || "An error occurred", "red")
            }
        }, 1000)

        return () => {
            if (socketTimeoutRef.current) {
                clearTimeout(socketTimeoutRef.current)
                socketTimeoutRef.current = null
            }
            if (socketioRef.current) {
                socketioRef.current.off('audioStream')
                socketioRef.current.off('profileupdate')
                socketioRef.current.off('error')
                socketioRef.current.disconnect()
                socketioRef.current = null
            }
        }
    }, [user?.id])

    //Update user on change and restart the auth logic
    useEffect(() => {
        if (!user) return
        if (!authCheckTimeoutRef.current) checkauth()
        Cookies.set("user", JSON.stringify(user))

        return () => {
            if (authCheckTimeoutRef.current) {
                clearTimeout(authCheckTimeoutRef.current)
                authCheckTimeoutRef.current = null
            }
        }
    }, [user])
    
    //Check for expired items in localstorage
    useEffect(() => {
        startnetworkrequest()

        const keys = Object.keys(localStorage)
        for (const key of keys) {
            try {
                const data = JSON.parse(localStorage.getItem(key))
                if (data && data.expires && new Date(data.expires) < new Date()) {
                    localStorage.removeItem(key)
                }
            } catch {}
        }

        return () => {
            if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current)
            if (networkControllerRef.current) networkControllerRef.current.abort()
        }
    }, [])

    const startnetworkrequest = (timeout=true) => {
        setIsNetworkButtonDisabled(true)
        if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current)

        if (networkControllerRef.current) networkControllerRef.current.abort()
        networkControllerRef.current = new AbortController()

        if (timeout) networkTimeoutRef.current = setTimeout(() => {
            setIsNetworkButtonDisabled(false)
        }, 1000)
    }

    const logout = async () => {
        startnetworkrequest(false)

        setUser(null)
        Cookies.remove("user")
        localStorage.removeItem("avatar")
        localStorage.removeItem("banner")
        localStorage.removeItem("authtimer")
        localStorage.removeItem("messagekey")

        if (socketioRef.current) { socketioRef.current.disconnect() }

        try {
            const response = await axios.get('/auth/refreshtoken/logout', {
                withCredentials: true,
                signal: networkControllerRef.current.signal
            })

            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
        navigate("/home")
        setIsNetworkButtonDisabled(false)
    }

    const checkauth = async () => {
        const timer = 1000 * 60 * 15
        const now = Date.now()
        const lastCheck = parseInt(localStorage.getItem("authtimer") || "0", 10)
        const nextCheckDelay = Math.max(timer, lastCheck + timer - now)

        if (now - lastCheck >= timer) {
            localStorage.setItem("authtimer", now)
            if (await checktoken()) authCheckTimeoutRef.current = setTimeout(checkauth, timer)
        } else {
            authCheckTimeoutRef.current = setTimeout(checkauth, nextCheckDelay)
        }
    }

    const checktoken = async () => {
        try {
            await axios.get('/auth/checkaccesstoken', { withCredentials: true })
            return true
        } catch (err) {
            return await updatetoken()
        }
    }

    const updatetoken = async () => {
        try {
            await axios.get('/auth/refreshtoken/update', { withCredentials: true })
            return true
        } catch (err) {
            logout()
            return false
        }
    }

    let contextData = {
        user,
        setUser,
        logout,
        startnetworkrequest,
        setIsNetworkButtonDisabled,
        isNetworkButtonDisabled,
        networkControllerRef,
        socket,
        avatar,
        setAvatar,
        banner,
        setBanner
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    )
    
}

export const useAuth = () => useContext(AuthContext)