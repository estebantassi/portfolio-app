import { useContext, useState } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'

function Home() {

  const { addToast } = useContext(ToastContext)
  const { user } = useContext(AuthContext)

  const [banner, setBanner] = useState(localStorage.getItem('banner'))
  const [avatar, setAvatar] = useState(localStorage.getItem('avatar'))

  return (
    <>
      <h1>{ user ? user.username : "home"}</h1>
      <button onClick={() => {
        console.log(user.key)
      }}></button>

      {avatar ? <img src={avatar} alt="image" /> : null}
      {banner ? <img src={banner} alt="image" /> : null}
    </>
  )
}

export default Home