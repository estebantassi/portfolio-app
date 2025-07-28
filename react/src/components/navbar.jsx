import { NavLink } from "react-router"
import {  useAuth } from '../context/authcontext'


function Navbar() {
  const { user } = useAuth()
  
  return (
    <>
    <nav>
      <NavLink to="/home">Home</NavLink>
      {user ? <></> : <NavLink to="/signup">Signup</NavLink>}
      {user ? <></> : <NavLink to="/login">Login</NavLink>}
      {user ? <NavLink to="/logout">Logout</NavLink> : <></>}
      {user ? <NavLink to={`/profile/${user.tag}`}>Profile</NavLink> : <></>}
      {user ? <NavLink to="/notifications">Notifications</NavLink> : <></>}
      {user ? <NavLink to="/accountsettings">Account Settings</NavLink> : <></>}
    </nav>
    </>
  )
}

export default Navbar