import { useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'

function Home() {

  const { addToast } = useContext(ToastContext)
  const { user } = useContext(AuthContext)

  const clearcookies = async () => {
    try {
      const response = await axios.get('/refreshtoken/clearcookies', {
        withCredentials: true
      })

      addToast(response.data, "green")
    } catch (err) {
      addToast(err.response.data, "red")
    }
  }

  return (
    <>
      <h1>{ user ? user.username : "home"}</h1>
      <button onClick={clearcookies}>Clear Cookies</button>
    </>
  )
}

export default Home