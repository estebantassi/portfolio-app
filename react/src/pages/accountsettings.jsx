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

  const [has2FA, setHas2FA] = useState(false)
  const [email, setEmail] = useState('')
  const [ischangingemail, setIschangingemail] = useState(false)
  const [newemail, setNewemail] = useState("")
  const [newemailcheck, setNewemailcheck] = useState("")

  const [newpassword, setNewpassword] = useState("")
  const [newpasswordcheck, setNewpasswordcheck] = useState("")

  const [qrcode, setQrcode] = useState("")
  const [isqrcodescanned, setIsqrcodescanned] = useState(false)
  const [code2FA, setCode2FA] = useState("")

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
      setHas2FA(request.data.data["2FA"])
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

  const request2fa = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    try {
      const request = await axios.post('/auth/sensitivedata/request2fa', {}, {
        withCredentials: true
      })

      setQrcode(request.data.data)

      addToast(request.data.message, "green")
    } catch (err) {
      addToast(err.response.data, "red")
    }
  }

  const check2FAcode = async (e) => {
    e.preventDefault()

    setIsbuttondisabled(true)
    setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)

    try {
      const request = await axios.post('/auth/sensitivedata/enable2FA', {
        code: code2FA
      }, {
        withCredentials: true
      })

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

      {has2FA ? <h1>2FA Enabled</h1> : <></>}

      {!qrcode && !isqrcodescanned && !has2FA ? <>

        <form onSubmit={(e) => request2fa(e)}>
          <button disabled={isbuttondisabled}>Enable 2FA</button>
        </form>

      </> : <>
      </>}


      {qrcode && !has2FA ? <>
        <form onSubmit={(e) => {
          setIsqrcodescanned(true)
          setQrcode(null)
        }}>
          <img
            src={qrcode}
            alt="new"
          />
          <button>I scanned the QR code</button>
        </form>
      </> : <>

      </>}

      {isqrcodescanned && !has2FA ? <>
        <form onSubmit={(e) => check2FAcode(e)}>
          <input value={code2FA} onChange={(e) => setCode2FA(e.target.value)} />
          <button>Enable 2FA</button>
        </form>
      </> : <></>}


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