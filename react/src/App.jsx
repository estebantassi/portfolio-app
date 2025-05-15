import { useState } from 'react';
import axios from './api/axios';

function App() {

  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [emailcheck, setEmailcheck] = useState("")
  const [password, setPassword] = useState("")
  const [passwordcheck, setPasswordcheck] = useState("")

  const signupform = async (e) => {
    e.preventDefault()

    //PERFORM CHECKS HERE

    try {

      const response = await axios.post('/signup', {
        username: username,
        email: email,
        emailcheck: emailcheck,
        password: password,
        passwordcheck: passwordcheck
      })

      console.log(response.data)

      setUsername("")
    } catch (err) {
      console.log(err.response.data)
    }
  }

  return (
    <>
      <h1>Welcome</h1>

      <form onSubmit={(e) => signupform(e)}>
        <label>Username</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />

        <label>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} />

        <label>Email Check</label>
        <input value={emailcheck} onChange={(e) => setEmailcheck(e.target.value)} />

        <label>Password</label>
        <input value={password} onChange={(e) => setPassword(e.target.value)} />

        <label>Password Check</label>
        <input value={passwordcheck} onChange={(e) => setPasswordcheck(e.target.value)} />

        <button>SIGNUP</button>
      </form>
    </>
  )
}

export default App