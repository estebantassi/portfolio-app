import { useAuth } from '../context/authcontext'

function Notifications() {

  const { user, avatar, banner } = useAuth()

  return (
    <>
      <h1>Notifications</h1>

      {user ? <img src={avatar} alt="image" /> : null}
      {user ? <img src={banner} alt="image" /> : null}
    </>
  )
}

export default Notifications