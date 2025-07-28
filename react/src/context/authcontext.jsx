import { createContext, useState, useContext, useEffect, useRef } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'
import { useNavigate } from "react-router"
import { deriveKey, encryptDataKey, decryptDataKey, arrayBufferToBase64, fetchbase64image } from "../tools/tools"
import srp from "secure-remote-password/client"
import { io } from 'socket.io-client'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate()
    const { addToast } = useContext(ToastContext)
    const [user, setUser] = useState(Cookies.get("user") ? JSON.parse(Cookies.get("user")) : null)
    const [avatar, setAvatar] = useState(localStorage.getItem("avatar"))
    const [banner, setBanner] = useState(localStorage.getItem("banner"))
    const timeoutRef = useRef(null)

    const [isNetworkButtonDisabled, setIsNetworkButtonDisabled] = useState(true)
    const networkTimeoutRef = useRef(null)
    const networkControllerRef = useRef(null)
    const audioContextRef = useRef(null)

    const socketioRef = useRef(null)
    const socketTimeoutRef = useRef(null)
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!user) return
        if (socketioRef.current) return

        socketTimeoutRef.current = setTimeout(async () => {
            try {
                socketioRef.current = io('http://localhost:4444', {
                    path: '/auth/socket.io',
                    withCredentials: true,
                })

                socketioRef.current.on('connect', () => {
                    setSocket(socketioRef.current)
                })

                socketioRef.current.on('error', (data) => {
                    addToast(data?.message || "Error with websocket", "red")
                })

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

                const response = await axios.get('/getuserprofile?id=' + user.id)

                const avatarBase64 = await fetchbase64image(response.data.avatar)
                if (avatarBase64){
                    setAvatar(avatarBase64)
                    localStorage.setItem("avatar", avatarBase64)
                }

                const bannerBase64 = await fetchbase64image(response.data.banner)
                if (bannerBase64){
                    setBanner(bannerBase64)
                    localStorage.setItem("banner", bannerBase64)
                }

                setUser(prev => ({...prev, username: response.data.username, tag: response.data.tag, bio: response.data.bio}))

            } catch (err) {
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

    useEffect(() => {
        if (!user) return
        if (!timeoutRef.current) checkauth()
        Cookies.set("user", JSON.stringify(user))

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current)
                timeoutRef.current = null
            }
        }
    }, [user])
    
    useEffect(() => {
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

    const startnetworkrequest = () => {
        setIsNetworkButtonDisabled(true)
        if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current)

        if (networkControllerRef.current) networkControllerRef.current.abort()
        networkControllerRef.current = new AbortController()

        networkTimeoutRef.current = setTimeout(() => {
            setIsNetworkButtonDisabled(false)
        }, 3000)
    }

    const login = async (data) => {
        try {
            const firstResponse = await axios.post('/loginstart',
                {
                    email: data.email
                }, {
                withCredentials: true
            })

            if (firstResponse == null || firstResponse.data == null || firstResponse.data.srpSalt == null || firstResponse.data.srpServerEphemeral == null) throw "Error"
            const srpSalt = firstResponse.data.srpSalt
            const srpServerEphemeral = firstResponse.data.srpServerEphemeral

            const srpClientEphemeral = srp.generateEphemeral()
            const srpPrivateKey = srp.derivePrivateKey(srpSalt, data.email, data.password)
            const srpClientSession = srp.deriveSession(srpClientEphemeral.secret, srpServerEphemeral, srpSalt, data.email, srpPrivateKey)

            const response = await axios.post('/logintoken/login', {
                email: data.email, srpProof: srpClientSession.proof, srpClientEphemeral: srpClientEphemeral.public
            }, {
                withCredentials: true
            })
            if (response == null || response.data == null || response.data.srpProof == null) throw "Error"

            try { srp.verifySession(srpClientEphemeral.public, srpClientSession, response.data.srpProof) } catch { throw "Error" }

            addToast(response?.data?.message || "Success", "green")
            if (response.data["2FA"]) return 2
            else return 1
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
            return 0
        }
    }

    const logincode = async (code, password) => {
        try {
            const response = await axios.post('/logintoken/logincode', {
                code
            }, {
                withCredentials: true
            })

            const encrypted2FAsecret = response.data.has2FA == 1 ? response.data.encrypted2FAsecret : ""
            const passwordKey = await deriveKey(password, encrypted2FAsecret, response.data.user.salt)
            const key = await decryptDataKey(response.data.user.encryptedkey, passwordKey)
            const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', key)
            const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

            localStorage.setItem("messagekey", keyBase64)
            setUser({
                id: response.data.user.id,
                username: response.data.user.username,
                tag: response.data.user.tag,
                bio: response.data.user.bio
            })

            navigate("/home")
            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            console.log(err)
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const signup = async (data) => {
        try {
            const rawsalt = crypto.getRandomValues(new Uint8Array(16))
            const salt = btoa(String.fromCharCode(...rawsalt))
            const passwordKey = await deriveKey(data.password, "", salt)

            const keypair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"])
            const privatekey = await encryptDataKey(keypair.privateKey, passwordKey)

            const publickey = await crypto.subtle.exportKey('raw', keypair.publicKey)
            const publickeybase64 = arrayBufferToBase64(publickey)

            const srpSalt = srp.generateSalt()
            const srpPrivatekey = srp.derivePrivateKey(srpSalt, data.email, data.password)
            const srpVerifier = srp.deriveVerifier(srpPrivatekey)

            const response = await axios.post('/signup', {
                username: data.username, email: data.email, emailcheck: data.emailcheck, salt, privatekey, publickey: publickeybase64, srpSalt, srpVerifier
            })

            navigate("/login")
            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    const logout = async () => {
        setUser(null)
        Cookies.remove("user")
        localStorage.removeItem("avatar")
        localStorage.removeItem("banner")
        localStorage.removeItem("authtimer")
        localStorage.removeItem("messagekey")

        if (socketioRef.current) { socketioRef.current.disconnect() }

        try {
            const response = await axios.get('/auth/refreshtoken/logout', {
                withCredentials: true
            })

            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
        navigate("/home")
    }

    const checkauth = async () => {
        const now = Date.now()
        const lastCheck = parseInt(localStorage.getItem("authtimer") || "0", 10)
        const nextCheckDelay = Math.max(3000, lastCheck + 3000 - now)

        if (now - lastCheck >= 3000) {
            localStorage.setItem("authtimer", now)
            if (await checktoken()) timeoutRef.current = setTimeout(checkauth, 3000)
        } else {
            timeoutRef.current = setTimeout(checkauth, nextCheckDelay)
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
        login,
        signup,
        logincode,
        startnetworkrequest,
        networkControllerRef,
        isNetworkButtonDisabled,
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