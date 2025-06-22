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
  const [ischangingemail, setIschangingemail] = useState(false)
  const [newemail, setNewemail] = useState("")
  const [newemailcheck, setNewemailcheck] = useState("")

  const [newpassword, setNewpassword] = useState("")
  const [newpasswordcheck, setNewpasswordcheck] = useState("")

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
        const request = await axios.post('/auth/getsensitivedata', {
            password
        }, {
            withCredentials: true
        })

        addToast(request.data.message, "green")
        setEmail(request.data.data.email)
        setIsauth(true)
    } catch (err) {
        addToast(err.response.data, "red")
    }
  }

  const requestnewemail = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    try {
        const request = await axios.post('/auth/sensitivedata/requestemailchange', {
            newemail, newemailcheck
        }, {
            withCredentials: true
        })

        setNewemail("")
        setNewemailcheck("")

        addToast(request.data, "green")
    } catch (err) {
        addToast(err.response.data, "red")
    }
  }

  const requestnewpassword = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    try {
        const request = await axios.post('/auth/sensitivedata/requestpasswordchange', {
            password, newpassword, newpasswordcheck
        }, {
            withCredentials: true
        })

        setNewpassword("")
        setNewpasswordcheck("")

        addToast(request.data, "green")
    } catch (err) {
        addToast(err.response.data, "red")
    }
  }

  return (

    isauth ? <>

    <p>Email: {email}</p>

        <form onSubmit={(e) => requestnewemail(e)}>
          <label>New email</label>
          <input value={newemail} onChange={(e) => setNewemail(e.target.value)} />
          <input value={newemailcheck} onChange={(e) => setNewemailcheck(e.target.value)} />

          <button disabled={isbuttondisabled}>Change email</button>
        </form>

        <form onSubmit={(e) => requestnewpassword(e)}>
          <label>New password</label>
          <input value={newpassword} onChange={(e) => setNewpassword(e.target.value)} />
          <input value={newpasswordcheck} onChange={(e) => setNewpasswordcheck(e.target.value)} />

          <button disabled={isbuttondisabled}>Change password</button>
        </form>
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