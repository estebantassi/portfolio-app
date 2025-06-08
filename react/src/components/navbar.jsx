import { NavLink } from "react-router"
import { AuthContext } from '../context/authcontext'
import { useContext } from "react"


function Navbar() {
  const { user } = useContext(AuthContext)
  
  return (
    <>
    <nav>
      <NavLink to="/home">Home</NavLink>
      {user ? <></> : <NavLink to="/signup">Signup</NavLink>}
      {user ? <></> : <NavLink to="/login">Login</NavLink>}
      {user ? <NavLink to="/logout">Logout</NavLink> : <></>}
      {user ? <NavLink to="/accountsettings">Account Settings</NavLink> : <></>}
    </nav>
    </>
  )
}

export default Navbar