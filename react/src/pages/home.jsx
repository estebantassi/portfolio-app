import { useAuth } from '../context/authcontext'

function Home() {

  const { user, avatar, banner } = useAuth()

  return (
    <>
      <h1>{ user ? user.username : "home"}</h1>

      {user ? <img src={avatar} alt="image" /> : null}
      {user ? <img src={banner} alt="image" /> : null}
    </>
  )
}

export default Home