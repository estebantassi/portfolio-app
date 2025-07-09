import { useContext, useEffect } from 'react'
import { ToastContext } from '../context/toastcontext'
import { AuthContext } from '../context/authcontext'
import axios from '../api/axios'
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from "react-router"
import { deriveKey, encryptDataKey } from "../tools/tools"
import srp from "secure-remote-password/client"

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
      if (showaccesscode2FA)
      {
        const response = await axios.post('/auth/sensitivedata/accountsettings/check2fa', {
          code: accesscode2FA,
        }, {
          withCredentials: true,
          signal: controllerRef.current.signal
        })

        if (response == null || response.data == null || response.data.user == null) throw "Error"

        addToast(response?.data?.message || "Success", "green")
        setEmail(response.data.user.email)
        setHas2FA(true)
        setIsauth(true)
        return
      }

      const firstResponse = await axios.post('/auth/accountsettings/checkstart', {}, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      if (firstResponse == null || firstResponse.data == null || firstResponse.data.srpSalt == null || firstResponse.data.srpServerEphemereal == null || firstResponse.data.email == null) throw "Error"
      const srpSalt = firstResponse.data.srpSalt
      const srpServerEphemereal = firstResponse.data.srpServerEphemereal
      const email = firstResponse.data.email

      const srpClientEphemeral = srp.generateEphemeral()
      const srpPrivateKey = srp.derivePrivateKey(srpSalt, email, password)
      const srpClientSession = srp.deriveSession(srpClientEphemeral.secret, srpServerEphemereal, srpSalt, email, srpPrivateKey)

      const response = await axios.post('/auth/sensitivedata/accountsettings/check', {
        srpProof: srpClientSession.proof, srpClientEphemereal: srpClientEphemeral.public
      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      if (response == null || response.data == null || response.data["2FA"] == null || response.data.srpProof == null) throw "Error"

      try { srp.verifySession(srpClientEphemeral.public, srpClientSession, response.data.srpProof) } catch { throw "Error" }

      addToast(response?.data?.message || "Success", "green")
      setPassword("")
      if (response.data["2FA"] == 0) {
        if (response.data.user == null) throw "Error"
        setEmail(response.data.user.email)
        setHas2FA(response.data["2FA"])
        setIsauth(true)
      } else {
        setShowaccesscode2FA(true)
      }
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
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

      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
  }

  const requestnewpassword = async (e) => {
    e.preventDefault()
    startrequest()

    const rawsalt = crypto.getRandomValues(new Uint8Array(16))
    const salt = btoa(String.fromCharCode(...rawsalt))

    const rawKey = Uint8Array.from(atob(user.key), c => c.charCodeAt(0));
    const dataKey = await crypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "AES-GCM" },
      true,
      ["encrypt", "decrypt"]
    )

    const passwordKey = await deriveKey(newpassword, salt)
    const privatekey = await encryptDataKey(dataKey, passwordKey)

    try {
      const request = await axios.post('/auth/sensitivedata/requestpasswordchange', {
        newpassword, newpasswordcheck, privatekey, salt
      }, {
        withCredentials: true,
        signal: controllerRef.current.signal
      })

      setNewpassword("")
      setNewpasswordcheck("")

      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
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
      if (request == null || request.data == null || request.data.data == null) throw "Error"
      setQrcode(request.data.data)

      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
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
      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
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
      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
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