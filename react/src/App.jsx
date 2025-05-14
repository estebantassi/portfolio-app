import { useState } from 'react';
import axios from './api/axios';

function App() {

  const [username, setUsername] = useState("")

  const signupform = async (e) => {
    e.preventDefault()

    try {

      await axios.post('/signup', {
        username: username,
      })

      setUsername("")
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <>
      <h1>Welcome</h1>

      <form onSubmit={(e) => signupform(e)}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
        <button>SIGNUP</button>
      </form>
    </>
  )
}

export default App
