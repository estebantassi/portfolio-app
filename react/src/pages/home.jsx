import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'

function Home() {

  const { addToast } = useContext(ToastContext)
  const { user, logout } = useContext(AuthContext)

  return (
    <>
      <h1>{ user ? user.username : "home"}</h1>
      <button onClick={logout}>Clear Cookies</button>
    </>
  )
}

export default Home