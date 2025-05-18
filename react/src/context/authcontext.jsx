import { createContext, useState, useContext, useEffect, useRef } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'
import { useNavigate } from "react-router"

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const navigate = useNavigate()
    const { addToast } = useContext(ToastContext)
    const [user, setUser] = useState(Cookies.get("user") ? JSON.parse(Cookies.get("user")) : null)
    const timeoutRef = useRef(null)

    const login = async (data) => {
        try {
            const response = await axios.post('/login', {
                ...data
            }, {
                withCredentials: true
            })

            setUser(response.data.user)
            Cookies.set("user", JSON.stringify(response.data.user))
            checkauth()
            navigate("/home")
            addToast(response.data.message, "green")
        } catch (err) {
            addToast(err.response.data, "red")
        }
    }

    const signup = async (data) => {
        try {
            const response = await axios.post('/signup', {
                ...data
            })

            navigate("/login")
            addToast(response.data, "green")
        } catch (err) {
            addToast(err.response.data, "red")
        }
    }

    const logout = async () => {
        Cookies.remove("user")
        setUser(null)

        try {
            const response = await axios.get('/refreshtoken/logout', {
                withCredentials: true
            })

            addToast(response.data, "green")
        } catch (err) {
            addToast(err.response.data, "red")
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
            await axios.get('/istokenvalid', { withCredentials: true })
            return true
        } catch (err) {
            if (err.response.data == "Missing token" || err.response.data == "Invalid token") {
                return updatetoken()
            }
            return false
        }
    }

    const updatetoken = async () => {
        try {
            await axios.get('/refreshtoken/update', { withCredentials: true })
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
        signup
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    )

}