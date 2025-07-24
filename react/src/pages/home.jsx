import { useContext, useState } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'

function Home() {

  const { addToast } = useContext(ToastContext)
  const { user, avatar, banner } = useContext(AuthContext)

  return (
    <>
      <h1>{ user ? user.username : "home"}</h1>

      {user ? <img src={avatar} alt="image" /> : null}
      {user ? <img src={banner} alt="image" /> : null}
    </>
  )
}

export default Home