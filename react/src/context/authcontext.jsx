import { createContext, useState, useContext, useEffect, useRef } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'
import { useNavigate } from "react-router"
import { deriveKey, encryptDataKey, decryptDataKey, arrayBufferToBase64, blobToBase64 } from "../tools/tools"
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
    const socketioRef = useRef(null)
    const socketTimeoutRef = useRef(null)
    const [socket, setSocket] = useState(null)

    useEffect(() => {
        if (!socket || !user) return

        socket.on('profileupdate', async (data) => {
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

        return () => {
            socket.off('profileupdate')
        }
    }, [socket, user])

    function cleanLocalStorageCache() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            try {
                const data = JSON.parse(localStorage.getItem(key))
                if (data && data.expires && new Date(data.expires) < new Date()) {
                    localStorage.removeItem(key)
                }
            } catch {}
        }
    }

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

            const avatarreq = await fetch(response.data.user.avatar)
            if (!avatarreq.ok) throw "Error"
            const avatarBlob = await avatarreq.blob()
            const avatarBase64 = await blobToBase64(avatarBlob)
            setAvatar(avatarBase64)
            localStorage.setItem("avatar", avatarBase64)

            const bannerreq = await fetch(response.data.user.banner)
            if (!bannerreq.ok) throw "Error"
            const bannerBlob = await bannerreq.blob()
            const bannerBase64 = await blobToBase64(bannerBlob)
            setBanner(bannerBase64)
            localStorage.setItem("banner", bannerBase64)

            let encrypted2FAsecret = ""
            if (response.data.has2FA == 1) encrypted2FAsecret = response.data.encrypted2FAsecret

            const passwordKey = await deriveKey(password, encrypted2FAsecret, response.data.user.salt)
            const key = await decryptDataKey(response.data.user.encryptedkey, passwordKey)

            const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', key)
            const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

            if (socketioRef.current) { socketioRef.current.disconnect() }

            socketioRef.current = io('http://localhost:4444', {
                path: '/auth/socket.io',
                withCredentials: true,
            })

            setSocket(socketioRef.current)

            socketioRef.current.on('error', (data) => {
                addToast(data?.message || "Error with websocket", "red")
            })

            setUser({
                id: response.data.user.id,
                key: keyBase64,
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
        Cookies.remove("user")
        setUser(null)
        localStorage.removeItem("avatar")
        localStorage.removeItem("banner")

        try {
            const response = await axios.get('/auth/refreshtoken/logout', {
                withCredentials: true
            })

            if (socketioRef.current) { socketioRef.current.disconnect() }

            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
        navigate("/home")
    }

    useEffect(() => {
        cleanLocalStorageCache()

        return () => {
            if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current)
            if (networkControllerRef.current) networkControllerRef.current.abort()

            if (socketioRef.current) {
                socketioRef.current.disconnect()
                socketioRef.current = null
            }
            if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [])

    useEffect(()=> {
        if (!user) return
        checkauth()

        socketTimeoutRef.current = setTimeout(async () => {
            if ((!socketioRef.current || socketioRef.current.disconnected) && user) 
            {
                try {
                const response = await axios.get('/getuserprofile?id=' + user.id)

                if (response == null || response.data == null) throw 'Error'

                const avatarreq = await fetch(response.data.avatar)
                if (!avatarreq.ok) throw "Error"
                const avatarBlob = await avatarreq.blob()
                const avatarBase64 = await blobToBase64(avatarBlob)
                setAvatar(avatarBase64)
                localStorage.setItem("avatar", avatarBase64)

                const bannerreq = await fetch(response.data.banner)
                if (!bannerreq.ok) throw "Error"
                const bannerBlob = await bannerreq.blob()
                const bannerBase64 = await blobToBase64(bannerBlob)
                setBanner(bannerBase64)
                localStorage.setItem("banner", bannerBase64)

                setUser(prev => ({...prev, username: response.data.username, tag: response.data.tag, bio: response.data.bio}))

                socketioRef.current = io('http://localhost:4444', {
                    path: '/auth/socket.io',
                    withCredentials: true,
                })

                setSocket(socketioRef.current)

                socketioRef.current.on('error', (data) => {
                    addToast(data?.message || "Error with websocket", "red")
                })

            } catch (err) {
                addToast(err.response?.data?.message || "An error occurred", "red")
            }
            }
        }, 1000)

        Cookies.set("user", JSON.stringify(user))
    }, [user])

    const checkauth = async () => {
        if (!Cookies.get("user")) return

        if (localStorage.getItem("authtimer") < Date.now() - 3000) {
            localStorage.setItem("authtimer", Date.now())
        }

        timeoutRef.current = setTimeout(() => {

            localStorage.setItem("authtimer", Date.now())
            checktoken()
            checkauth()

        }, localStorage.getItem("authtimer") - Date.now() + 3000)
    }

    //Call this when making requests
    const checktoken = async () => {
        try {
            await axios.get('/auth/checkaccesstoken', { withCredentials: true })
            return true
        } catch (err) {
            await updatetoken()
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