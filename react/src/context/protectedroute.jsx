import { Outlet } from "react-router"
import Navbar from "../components/navbar"
import { AuthContext } from '../context/authcontext'
import { useEffect, useContext } from "react"
import { useNavigate } from "react-router"

function Protectedroute() {
    const { user } = useContext(AuthContext)
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