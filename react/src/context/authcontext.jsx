import { createContext, useState, useContext, useEffect, useRef } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'
import { useNavigate } from "react-router"
import { deriveKey, encryptDataKey, decryptDataKey, arrayBufferToBase64 } from "../tools/tools"
import srp from "secure-remote-password/client"
import { io } from 'socket.io-client'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate()
    const { addToast } = useContext(ToastContext)
    const [user, setUser] = useState(Cookies.get("user") ? JSON.parse(Cookies.get("user")) : null)
    const timeoutRef = useRef(null)

    const [isNetworkButtonDisabled, setIsNetworkButtonDisabled] = useState(true)
    const networkTimeoutRef = useRef(null)
    const networkControllerRef = useRef(null)
    const socketioRef = useRef(null)
    const socketTimeoutRef = useRef(null)
    const [socket, setSocket] = useState(null)

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

            let encrypted2FAsecret = ""
            if (response.data.has2FA == 1) encrypted2FAsecret = response.data.encrypted2FAsecret

            const passwordKey = await deriveKey(password, encrypted2FAsecret, response.data.user.salt)
            const key = await decryptDataKey(response.data.user.encryptedkey, passwordKey)

            const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', key)
            const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

            const newuser = {
                username: response.data.user.username,
                id: response.data.user.id,
                tag: response.data.user.tag,
                key: keyBase64
            }

            if (socketioRef.current) { socketioRef.current.disconnect() }

            socketioRef.current = io('http://localhost:4444', {
                path: '/auth/socket.io',
                withCredentials: true,
            })

            setSocket(socketioRef.current)

            socketioRef.current.on('error', (data) => {
                addToast(data?.message || "Error with websocket", "red")
            })


            setUser(newuser)
            Cookies.set("user", JSON.stringify(newuser))

            checkauth()
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

        return () => {
            if (networkTimeoutRef.current) clearTimeout(networkTimeoutRef.current)
            if (networkControllerRef.current) networkControllerRef.current.abort()
        }
    }, [])

    useEffect(() => {
        checkauth()

        function reconnectsocket() {
            if ((!socketioRef.current || socketioRef.current.disconnected) && user) {
                socketioRef.current = io('http://localhost:4444', {
                    path: '/auth/socket.io',
                    withCredentials: true,
                })

                setSocket(socketioRef.current)

                socketioRef.current.on('error', (data) => {
                    addToast(data?.message || "Error with websocket", "red")
                })
            }
        }

        socketTimeoutRef.current = setTimeout(() => {
            reconnectsocket()
        }, 1000)

        return () => {
            if (socketioRef.current) {
                socketioRef.current.disconnect()
                socketioRef.current = null
            }
            if (socketTimeoutRef.current) clearTimeout(socketTimeoutRef.current)
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
        }
    }, [user])

    const checkauth = async () => {
        if (!user) return

        if (localStorage.getItem("authtimer") < Date.now() - 3000) {
            localStorage.setItem("authtimer", Date.now())
        }

        timeoutRef.current = setTimeout(() => {

            localStorage.setItem("authtimer", Date.now())
            checktoken()
            checkauth()
            console.log("Checked user")

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
        socket
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    )

}