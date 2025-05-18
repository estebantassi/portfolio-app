import { useContext, useEffect } from 'react'
import { AuthContext } from '../context/authcontext'

function Logout() {

  const { logout } = useContext(AuthContext)

  useEffect(() => {
    logout()
  }, [])

  return (
    <>
    </>
  )
}

export default Logout