import { Outlet } from "react-router"
import Navbar from "../components/navbar"
import { useAuth } from '../context/authcontext'
import { useEffect } from "react"
import { useNavigate } from "react-router"

function Protectedroute() {
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) navigate("/login")
    }, [])

    return (
        <>
            {user ? <>
                <Navbar />
                <Outlet />
            </>
                : <></>}
        </>
    )
}

export default Protectedroute