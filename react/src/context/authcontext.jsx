import { createContext, useState, useContext } from "react"
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import Cookies from 'js-cookie'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {

    const { addToast } = useContext(ToastContext)
    const [user, setUser] = useState(JSON.parse(Cookies.get("user")))

    const login = async (data) => {
        try {
            const response = await axios.post('/login', {
                ...data
            }, {
                withCredentials: true
            })

            setUser(response.data.user)
            Cookies.set("user", JSON.stringify(response.data.user))
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

            addToast(response.data, "green")
        } catch (err) {
            addToast(err.response.data, "red")
        }
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
            return false
        }
    }

    let contextData = {
        user,
        login,
        signup
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    )

}