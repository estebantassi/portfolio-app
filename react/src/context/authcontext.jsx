import { createContext, useState, useContext, useEffect, useRef } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'
import { useNavigate } from "react-router"
import { deriveKey, encryptDataKey, decryptDataKey, arrayBufferToBase64 } from "../tools/tools"
import srp from "secure-remote-password/client"

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate()
    const { addToast } = useContext(ToastContext)
    const [user, setUser] = useState(Cookies.get("user") ? JSON.parse(Cookies.get("user")) : null)
    const timeoutRef = useRef(null)

    const login = async (data) => {
        try {
            const firstResponse = await axios.post('/loginstart',
                {
                    email: data.email
                }, {
                withCredentials: true
            })

            if (firstResponse == null || firstResponse.data == null || firstResponse.data.srpSalt == null || firstResponse.data.srpServerEphemereal == null) throw "Error"
            const srpSalt = firstResponse.data.srpSalt
            const srpServerEphemereal = firstResponse.data.srpServerEphemereal

            const srpClientEphemeral = srp.generateEphemeral()
            const srpPrivateKey = srp.derivePrivateKey(srpSalt, data.email, data.password)
            const srpClientSession = srp.deriveSession(srpClientEphemeral.secret, srpServerEphemereal, srpSalt, data.email, srpPrivateKey)

            const response = await axios.post('/logintoken/login', {
                email: data.email, srpProof: srpClientSession.proof, srpClientEphemereal: srpClientEphemeral.public
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

            const passwordKey = await deriveKey(password, response.data.user.salt)
            const key = await decryptDataKey(response.data.user.encryptedkey, passwordKey)

            const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', key)
            const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

            const newuser = {
                username: response.data.user.username,
                id: response.data.user.id,
                tag: response.data.user.tag,
                key: keyBase64
            }

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
            const passwordKey = await deriveKey(data.password, salt)

            const keypair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"])

            const privatekey = await encryptDataKey(keypair.privateKey, passwordKey)

            const publickey = await crypto.subtle.exportKey('raw', keypair.publicKey)
            const publickeybase64 = arrayBufferToBase64(publickey)

            const srpSalt = srp.generateSalt()
            const srpPrivatekey = srp.derivePrivateKey(srpSalt, data.email, data.password)
            const srpVerifier = srp.deriveVerifier(srpPrivatekey)

            const response = await axios.post('/signup', {
                ...data, salt, privatekey, publickey: publickeybase64, srpSalt, srpVerifier
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

            addToast(response?.data?.message || "Success", "green")
        } catch (err) {
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
        navigate("/home")
    }

    useEffect(() => {
        checkauth()

        return () => {
            if (timeoutRef.current)
                clearTimeout(timeoutRef.current)
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
            updatetoken()
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
        logout,
        login,
        signup,
        logincode
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    )

}