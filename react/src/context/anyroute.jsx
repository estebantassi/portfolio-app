import { Outlet } from "react-router"
import Navbar from "../components/navbar"

function Anyroute() {
  return (
    <>
    <Navbar/>
    <Outlet />
    </>
  )
}

export default Anyroute