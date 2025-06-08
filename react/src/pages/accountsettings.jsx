import { useContext, useEffect } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'
import { useState } from 'react'

function AccountSettings() {

  const { addToast } = useContext(ToastContext)
  const { user } = useContext(AuthContext)
  const [isauth, setIsauth] = useState(false)
  const [password, setPassword] = useState("")
  const [isbuttondisabled, setIsbuttondisabled] = useState(true)

  const [email, setEmail] = useState('')

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    return () => clearTimeout(timeout)
  }, [])

  const accesssettings = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    try {
        const request = await axios.post('/getsensitivedata', {
            password
        }, {
            withCredentials: true
        })

        setEmail(request.data.data.email)
        setIsauth(true)
    } catch (err) {
        addToast(err.response.data, "red")
    }
  }

  return (

    isauth ? <>

    <p>Email: {email}</p>

    </>
      :
      <>
        <form onSubmit={(e) => accesssettings(e)}>
          <p>Please enter your password to access this data.</p>
          <label>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} />

          <button disabled={isbuttondisabled}>Verify password</button>
        </form>
      </>
  )
}

export default AccountSettings