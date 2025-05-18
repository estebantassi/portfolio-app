import { Outlet } from "react-router"
import Navbar from "../components/navbar"
import { AuthContext } from '../context/authcontext'
import { useEffect, useContext } from "react"
import { useNavigate } from "react-router"

function Logoutroute() {
    const { user } = useContext(AuthContext)
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