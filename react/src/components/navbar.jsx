import { NavLink } from "react-router"
import {  useAuth } from '../context/authcontext'
import "../css/navbar.css"
import { House, ClipboardPen, LogIn, LogOut, Settings, Bell } from 'lucide-react';


function Navbar() {
  const { user, avatar } = useAuth()
  
  return (
    <>
    <nav className="navbar">
      <NavLink className="navbar-element" to="/home"><House /></NavLink>

      {!user && <NavLink className="navbar-element" to="/login"><LogIn /></NavLink>}
      {!user && <NavLink className="navbar-element" to="/signup"><ClipboardPen /></NavLink>}

      {user && <NavLink className="navbar-element" to={`/profile/${user.tag}`}><img src={avatar} alt="avatar" /></NavLink> }
      {user && <NavLink className="navbar-element" to="/notifications"><Bell /></NavLink> }
      {user && <NavLink className="navbar-element" to="/accountsettings"><Settings /></NavLink> }
      {user && <NavLink className="navbar-element" to="/logout"><LogOut /></NavLink> }
    </nav>
    </>
  )
}

export default Navbar