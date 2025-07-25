import { Outlet } from "react-router"
import Navbar from "../components/navbar"
import { useAuth } from '../context/authcontext'
import { useEffect } from "react"
import { useNavigate } from "react-router"

function Logoutroute() {
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (user) navigate("/home")
    }, [])

    return (
        <>
            {user ? <></> : <>
                <Navbar />
                <Outlet />
            </>}
        </>
    )
}

export default Logoutroute