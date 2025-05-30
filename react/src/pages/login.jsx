import { useEffect, useState, useContext } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'

function Login() {

  const { addToast } = useContext(ToastContext)
  const { login, logincode } = useContext(AuthContext)

  const [data, setData] = useState({
    email: "",
    password: ""
  })
  const [isbuttondisabled, setIsbuttondisabled] = useState(true)

  const [showLoginCode, setShowLoginCode] = useState(false)
  const [code, setCode] = useState("")


  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  const loginform = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    for (const [key, value] of Object.entries(data)) if (value == "") return addToast("Please fill in all the fields", "red")

      login(data).then((data) => {
        if(data == true) setShowLoginCode(true)
      })
  }

    const codeform = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    if (code == "" || code.length > 5 || code.length < 5) return addToast("Code must be 5 characters long", "red")

    logincode(code)
  }

  return (
    <>
      <h1>Log In</h1>

{
  showLoginCode ? 
  <>
        <form onSubmit={(e) => codeform(e)}>
        <label>Code</label>
        <input value={code} onChange={(e) => setCode(e.target.value)}/>

        <button disabled={isbuttondisabled}>Verify code</button>
      </form>
  </>
  :
  <>
      <form onSubmit={(e) => loginform(e)}>
        <label>Email</label>
        <input value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />

        <label>Password</label>
        <input value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} />

        <button disabled={isbuttondisabled}>SIGNUP</button>
      </form>
      </>
      }
    </>
  )
}

export default Login