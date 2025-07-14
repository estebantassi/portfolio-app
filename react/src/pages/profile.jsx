import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import axios from '../api/axios'
import { useEffect, useState } from 'react'
import { useParams } from "react-router"
import { useNavigate } from "react-router"
import { AuthContext } from '../context/authcontext'

function Profile() {

    const { user } = useContext(AuthContext)
    const { addToast } = useContext(ToastContext)
    const { link } = useParams()
    const navigate = useNavigate()
    const [userdata, setUserdata] = useState({})

    useEffect(() => {
        const userdata = JSON.parse(localStorage.getItem(link))
        if (userdata == null || new Date(userdata.expires) < new Date()) getuserprofile()
        else setUserdata(userdata)

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

            if (response.data == null) throw 'Error'
            if (response.data.message != null) delete response.data.message

            response.data.expires = new Date(Date.now() + 60 * 1000)

            setUserdata(response.data)

            localStorage.setItem(link, JSON.stringify(response.data))
        } catch (err) {
            navigate("/home")
            addToast(err.response?.data?.message || "An error occurred", "red")
        }
    }

    return (
        <>
            <h1>{userdata.username ? userdata.username : ""}</h1>
            {userdata ? <img src={userdata.avatar} alt="Avatar" /> : <></>}
            {user && user.id != link ? <button onClick={() => navigate("/messages/" + link)}>Send message</button> : <></>}
        </>
    )
}

export default Profile