import { NavLink } from "react-router"
import {  useAuth } from '../context/authcontext'
import "../css/navbar.css"
import { House, ClipboardPen, LogIn, LogOut, Settings, Bell } from 'lucide-react';


function Navbar() {
  const { user, avatar } = useAuth()
  
  return (
    <>
    <nav className="navbar">
      <NavLink className="navbar-element" to="/home"><span className="navbar-text">Home</span><House /></NavLink>

      {!user && <NavLink className="navbar-element" to="/login"><span className="navbar-text">Login</span><LogIn /></NavLink>}
      {!user && <NavLink className="navbar-element" to="/signup"><span className="navbar-text">Signup</span><ClipboardPen /></NavLink>}

      {user && <NavLink className="navbar-element" to={`/profile/${user.tag}`}><img src={avatar} alt="avatar" /></NavLink> }
      {user && <NavLink className="navbar-element" to="/notifications"><span className="navbar-text">Notification</span><Bell /></NavLink> }
      {user && <NavLink className="navbar-element" to="/accountsettings"><span className="navbar-text">Settings</span><Settings /></NavLink> }
      {user && <NavLink className="navbar-element" to="/logout"><span className="navbar-text">Logout</span><LogOut /></NavLink> }
    </nav>
    </>
  )
}

export default Navbar