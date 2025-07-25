import { useEffect } from 'react'
import { useAuth } from '../context/authcontext'

function Logout() {

  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [])

  return (
    <>
    </>
  )
}

export default Logout