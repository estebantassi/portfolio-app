import { useContext, useEffect } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from "react-router"

function AccountSettings() {

  const navigate = useNavigate()
  const controllerRef = useRef(null)
  const timeoutRef = useRef(null)

  const { addToast } = useContext(ToastContext)
  const { user } = useContext(AuthContext)
  const [isauth, setIsauth] = useState(false)
  const [password, setPassword] = useState("")
  const [showaccesscode2FA, setShowaccesscode2FA] = useState(false)
  const [accesscode2FA, setAccesscode2FA] = useState("")

  const [isbuttondisabled, setIsbuttondisabled] = useState(true)

  const [has2FA, setHas2FA] = useState(false)
  const [email, setEmail] = useState('')
  const [newemail, setNewemail] = useState("")
  const [newemailcheck, setNewemailcheck] = useState("")

  const [newpassword, setNewpassword] = useState("")
  const [newpasswordcheck, setNewpasswordcheck] = useState("")

  const [qrcode, setQrcode] = useState("")
  const [isqrcodescanned, setIsqrcodescanned] = useState(false)
  const [code2FA, setCode2FA] = useState("")

  useEffect(() => {
    startrequest()

    const leavepagetimeout = setTimeout(() => {
      navigate('/home')
    }, 10 * 60 * 1000)

    return () => {
      clearTimeout(leavepagetimeout)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (controllerRef.current) controllerRef.current.abort()
    }
  }, [])

  const startrequest = () => {
    setIsbuttondisabled(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    if (controllerRef.current) controllerRef.current.abort()
    controllerRef.current = new AbortController()

    timeoutRef.current = setTimeout(() => {
      setIsbuttondisabled(false)
    }, 3000)
  }

  const accesssettings = async (e) => {
    e.preventDefault()
    startrequest()

    try {
      const request = await axios.post('/auth/getsensitivedata', {
        password,
        code: accesscode2FA
      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      if (request.data.hasaccess) {
        setPassword("")
        addToast(request.data.message, "green")
        setEmail(request.data.data.email)
        setHas2FA(request.data.data["2FA"])
        setIsauth(true)
      } else {
        setShowaccesscode2FA(true)
      }

    } catch (err) {
      if (axios.isCancel(err)) {
        console.log("Request cancelled", err.message)
      } else {
        addToast(err.response?.data || "An error occurred", "red")
      }
    }
  }

  const requestnewemail = async (e) => {
    e.preventDefault()
    startrequest()

    try {
      const request = await axios.post('/auth/sensitivedata/requestemailchange', {
        newemail, newemailcheck
      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
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
    startrequest()

    try {
      const request = await axios.post('/auth/sensitivedata/requestpasswordchange', {
        newpassword, newpasswordcheck
      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
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
    startrequest()

    try {
      const request = await axios.post('/auth/sensitivedata/request2fa', {}, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      setQrcode(request.data.data)

      addToast(request.data.message, "green")
    } catch (err) {
      addToast(err.response.data, "red")
    }
  }

  const check2FAcode = async (e) => {
    e.preventDefault()
    startrequest()

    try {
      const request = await axios.post('/auth/sensitivedata/enable2FA', {
        code: code2FA
      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      setCode2FA("")
      setHas2FA(true)
      addToast(request.data, "green")
    } catch (err) {
      addToast(err.response.data, "red")
    }
  }

  const disable2FA = async (e) => {
    e.preventDefault()
    startrequest()

    try {
      const request = await axios.post('/auth/sensitivedata/disable2fa', {

      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      setHas2FA(false)
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

      {has2FA ? <>
        <h1>2FA Enabled</h1>

        <form onSubmit={(e) => disable2FA(e)}>
          <button>Disable 2FA</button>
        </form>
      </> : <></>}

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
          {
            showaccesscode2FA ? <>
              <label>Enter 2FA code from Authenticator App</label>
              <input value={accesscode2FA} onChange={(e) => setAccesscode2FA(e.target.value)} />
            </>
              :
              <>
                <label>Password</label>
                <input value={password} onChange={(e) => setPassword(e.target.value)} />
              </>
          }

          <button disabled={isbuttondisabled}>Verify password</button>
        </form>
      </>
  )
}

export default AccountSettings