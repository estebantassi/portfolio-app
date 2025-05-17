import { useEffect, useState, useContext } from 'react';
import { ToastContext } from '../context/toastcontext';
import axios from '../api/axios';

function Signup() {

  const { addToast } = useContext(ToastContext)

  const [data, setData] = useState({
    username: "",
    email: "",
    emailcheck: "",
    password: "",
    passwordcheck: ""
  })
  const [isbuttondisabled, setIsbuttondisabled] = useState(true)


  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  const signupform = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    for (const [key, value] of Object.entries(data)) if (value == "") return addToast("Please fill in all the fields", "red")

    if (data.username.length > 15) return addToast("Username is too long", "red")
    if (data.username.length < 3) return addToast("Username is too short", "red")

    if (data.password.length > 30) return addToast("Password is too long", "red")
    if (data.password.length < 8) return addToast("Password is too short", "red")

    if (data.password != data.passwordcheck) return addToast("Passwords don't match", "red")
    if (data.email != data.emailcheck) return addToast("Emails don't match", "red")

    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegexp.test(data.email)) return addToast("Email isn't valid", "red")

    try {

      const response = await axios.post('/signup', {
        ...data
      })

      addToast(response.data, "green")
    } catch (err) {
      addToast(err.response.data, "red")
    }
  }

  return (
    <>
      <h1>Sign Up</h1>

      <form onSubmit={(e) => signupform(e)}>
        <label>Username</label>
        <input value={data.username} onChange={(e) => setData({ ...data, username: e.target.value })} />

        <label>Email</label>
        <input value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />

        <label>Email Check</label>
        <input value={data.emailcheck} onChange={(e) => setData({ ...data, emailcheck: e.target.value })} />

        <label>Password</label>
        <input value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />

        <label>Password Check</label>
        <input value={data.passwordcheck} onChange={(e) => setData({ ...data, passwordcheck: e.target.value })} />

        <button disabled={isbuttondisabled}>SIGNUP</button>
      </form>
    </>
  )
}

export default Signup