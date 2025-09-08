import { useContext, useEffect, useRef } from 'react'
import { ToastContext } from '../context/toastcontext'
import { useAuth } from '../context/authcontext'
import axios from '../api/axios'
import { useState } from 'react'
import { useNavigate } from "react-router"
import { decryptDataKey, deriveKey, encryptDataKey, arrayBufferToBase64, base64ToArrayBuffer } from "../tools/tools"
import srp from "secure-remote-password/client"
import { CodeInput, EmailInput, PasswordInput } from '../components/inputs'

function AccountSettings() {

  const navigate = useNavigate()

  const { addToast } = useContext(ToastContext)
  const { logout, setUser, startnetworkrequest, networkControllerRef, isNetworkButtonDisabled, setIsNetworkButtonDisabled, updatetoken } = useAuth()
  const [isauth, setIsauth] = useState(false)
  const [password, setPassword] = useState("")
  const [showaccesscode2FA, setShowaccesscode2FA] = useState(false)
  const [accesscode2FA, setAccesscode2FA] = useState("")

  const [has2FA, setHas2FA] = useState(false)
  const [email, setEmail] = useState('')
  const [newemail, setNewemail] = useState("")
  const [newemailcheck, setNewemailcheck] = useState("")

  const [newpassword, setNewpassword] = useState("")
  const [newpasswordcheck, setNewpasswordcheck] = useState("")

  const [qrcode, setQrcode] = useState("")
  const [isqrcodescanned, setIsqrcodescanned] = useState(false)
  const [code2FA, setCode2FA] = useState("")
  const [encrypted2FAsecret, setEncrypted2FAsecret] = useState("")

  useEffect(() => {
    const leavepagetimeout = setTimeout(() => {
      navigate('/home')
    }, 10 * 60 * 1000)

    return () => {
      clearTimeout(leavepagetimeout)
    }
  }, [])

  //ACCESS THE PAGE
  const accesssettings = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      if (showaccesscode2FA) {
        const response = await axios.post('/auth/sensitivedata/accountsettings/check2fa', {
          code: accesscode2FA,
        }, {
          withCredentials: true,
          signal: networkControllerRef.current.signal
        })

        if (response == null || response.data == null || response.data.user == null || response.data.encrypted2FAsecret == null) throw "Error"

        addToast(response?.data?.message || "Success", "green")
        setEncrypted2FAsecret(response.data.encrypted2FAsecret)
        setEmail(response.data.user.email)
        setHas2FA(true)
        setIsauth(true)
        return
      }

      const firstResponse = await axios.post('/auth/accountsettings/checkstart', {}, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      if (firstResponse == null || firstResponse.data == null || firstResponse.data.srpSalt == null || firstResponse.data.srpServerEphemeral == null || firstResponse.data.email == null) throw "Error"
      const srpSalt = firstResponse.data.srpSalt
      const srpServerEphemeral = firstResponse.data.srpServerEphemeral
      const email = firstResponse.data.email

      const srpClientEphemeral = srp.generateEphemeral()
      const srpPrivateKey = srp.derivePrivateKey(srpSalt, email, password)
      const srpClientSession = srp.deriveSession(srpClientEphemeral.secret, srpServerEphemeral, srpSalt, email, srpPrivateKey)

      const response = await axios.post('/auth/sensitivedata/accountsettings/check', {
        srpProof: srpClientSession.proof, srpClientEphemeral: srpClientEphemeral.public
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      if (response == null || response.data == null || response.data["2FA"] == null || response.data.srpProof == null) throw "Error"

      try { srp.verifySession(srpClientEphemeral.public, srpClientSession, response.data.srpProof) } catch { throw "Error" }

      addToast(response?.data?.message || "Success", "green")
      if (response.data["2FA"] == 0) {
        if (response.data.user == null) throw "Error"
        setEmail(response.data.user.email)
        setHas2FA(response.data["2FA"])
        setIsauth(true)
      } else {
        setShowaccesscode2FA(true)
      }
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) accesssettings(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }

    setIsNetworkButtonDisabled(false)
  }

  //INITIATE EMAIL CHANGE
  const requestnewemail = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      const request = await axios.post('/auth/sensitivedata/accountsettings/requestemailchange', {
        newemail, newemailcheck
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      setNewemail("")
      setNewemailcheck("")

      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) requestnewemail(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }
    setIsNetworkButtonDisabled(false)
  }

  //INITIATE PASSWORD CHANGE
  const requestnewpassword = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      const rawsalt = crypto.getRandomValues(new Uint8Array(16))
      const salt = btoa(String.fromCharCode(...rawsalt))

      const userkey = localStorage.getItem("messagekey")
      const rawKey = base64ToArrayBuffer(userkey)
      const dataKey = await crypto.subtle.importKey(
        'pkcs8',
        rawKey,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
      )

      const passwordKey = await deriveKey(newpassword, encrypted2FAsecret, salt)
      const privatekey = await encryptDataKey(dataKey, passwordKey)

      const decryptedkey = await decryptDataKey(privatekey, passwordKey)
      const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', decryptedkey)
      const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

      const srpSalt = srp.generateSalt()
      const srpPrivatekey = srp.derivePrivateKey(srpSalt, email, newpassword)
      const srpVerifier = srp.deriveVerifier(srpPrivatekey)

      const request = await axios.post('/auth/sensitivedata/accountsettings/requestpasswordchange', {
        privatekey, salt, srpSalt, srpVerifier
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      setNewpassword("")
      setNewpasswordcheck("")
      setUser(prev => ({ ...prev, key: keyBase64 }))

      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) requestnewpassword(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }
    setIsNetworkButtonDisabled(false)
  }

  //INITIATE 2FA
  const request2fa = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      const request = await axios.post('/auth/sensitivedata/accountsettings/request2fa', {}, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })
      if (request == null || request.data == null || request.data.qrcode == null) throw "Error"
      setQrcode(request.data.qrcode)

      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) request2fa(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }
    setIsNetworkButtonDisabled(false)
  }

  //CHECK 2FA CODE
  const check2FAcode = async (e) => {
    e.preventDefault()
    
    const rawsalt = crypto.getRandomValues(new Uint8Array(16))
    const salt = btoa(String.fromCharCode(...rawsalt))
    
    const userkey = localStorage.getItem("messagekey")
    const rawKey = base64ToArrayBuffer(userkey)
    const dataKey = await crypto.subtle.importKey(
      'pkcs8',
      rawKey,
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      true,
      ['deriveKey', 'deriveBits']
    )
    
    const passwordKey = await deriveKey(password, encrypted2FAsecret, salt)
    const privatekey = await encryptDataKey(dataKey, passwordKey)
    
    const decryptedkey = await decryptDataKey(privatekey, passwordKey)
    const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', decryptedkey)
    const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)
    
    startnetworkrequest(false)

    try {
      const request = await axios.post('/auth/sensitivedata/accountsettings/enable2FA', {
        code: code2FA,
        salt,
        privatekey
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      setUser(prev => ({ ...prev, key: keyBase64 }))

      setCode2FA("")
      setHas2FA(true)
      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) check2FAcode(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }
    setIsNetworkButtonDisabled(false)
  }

  //DISABLE 2FA
  const disable2FA = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      const rawsalt = crypto.getRandomValues(new Uint8Array(16))
      const salt = btoa(String.fromCharCode(...rawsalt))

      const userkey = localStorage.getItem("messagekey")
      const rawKey = base64ToArrayBuffer(userkey)
      const dataKey = await crypto.subtle.importKey(
        'pkcs8',
        rawKey,
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        true,
        ['deriveKey', 'deriveBits']
      )

      const passwordKey = await deriveKey(password, "", salt)
      const privatekey = await encryptDataKey(dataKey, passwordKey)

      const decryptedkey = await decryptDataKey(privatekey, passwordKey)
      const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', decryptedkey)
      const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

      const request = await axios.post('/auth/sensitivedata/accountsettings/disable2fa', {
        salt,
        privatekey
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      setUser(prev => ({ ...prev, key: keyBase64 }))

      setHas2FA(false)
      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) disable2FA(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }

    setIsNetworkButtonDisabled(false)
  }

  //LOGOUT ALL SESSIONS
  const LogoutAllUsers = async () => {
    startnetworkrequest(false)

    try {
      const request = await axios.post('/auth/sensitivedata/accountsettings/logoutallusers', {}, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      logout()
      addToast(request?.data?.message || "Success", "green")
    } catch (err) {
      if (err?.response?.status == 401) {
        const isloggedin = await updatetoken()
        if (isloggedin) LogoutAllUsers(e)
      }
      else addToast(err.response?.data?.message || "An error occurred", "red")
    }

    setIsNetworkButtonDisabled(false)
  }

  const newemailInputRef = useRef(null)
  const newemailcheckInputRef = useRef(null)
  const newemailButtonDisabled = isNetworkButtonDisabled || !newemailInputRef.current?.checkValidity() || !newemailcheckInputRef.current?.checkValidity()

  const newpasswordInputRef = useRef(null)
  const newpasswordcheckInputRef = useRef(null)
  const newpasswordButtonDisabled = isNetworkButtonDisabled || !newpasswordInputRef.current?.checkValidity() || !newpasswordcheckInputRef.current?.checkValidity()

  const accesscode2FAInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const accesscode2FAButtonDisabled = isNetworkButtonDisabled || !accesscode2FAInputRef.current?.checkValidity()
  const passwordButtonDisabled = isNetworkButtonDisabled || !passwordInputRef.current?.checkValidity()

  const code2FAInputRef = useRef(null)
  const code2FAButtonDisabled = isNetworkButtonDisabled || !code2FAInputRef.current?.checkValidity()

  return (
    <div>
      {isauth ? <>
      
        <p>Email: {email}</p>
        <button onClick={() => { LogoutAllUsers() }} disabled={isNetworkButtonDisabled}>Logout all sessions</button>

        {/*//////////////////// CHANGE EMAIL ////////////////////*/}

        <form onSubmit={(e) => requestnewemail(e)}>
          <label>New email</label>
          <EmailInput value={newemail} onChange={(e) => setNewemail(e.target.value)} inputRef={newemailInputRef} />
          <EmailInput value={newemailcheck} onChange={(e) => setNewemailcheck(e.target.value)} inputRef={newemailcheckInputRef} />

          <button disabled={newemailButtonDisabled}>Change email</button>
        </form>

        {/*//////////////////// CHANGE PASSWORD ////////////////////*/}

        <form onSubmit={(e) => requestnewpassword(e)}>
          <label>New password</label>
          <PasswordInput value={newpassword} onChange={(e) => setNewpassword(e.target.value)} inputRef={newpasswordInputRef} />
          <PasswordInput value={newpasswordcheck} onChange={(e) => setNewpasswordcheck(e.target.value)} inputRef={newpasswordcheckInputRef} />

          <button disabled={newpasswordButtonDisabled}>Change password</button>
        </form>

        {/*//////////////////// TOGGLE 2FA ////////////////////*/}

        {has2FA ? <>
          <h1>2FA Enabled</h1>

          <form onSubmit={(e) => disable2FA(e)}>
            <button disabled={isNetworkButtonDisabled}>Disable 2FA</button>
          </form>
        </> : <></>}

        {!qrcode && !isqrcodescanned && !has2FA ? <>

          <form onSubmit={(e) => request2fa(e)}>
            <button disabled={isNetworkButtonDisabled}>Enable 2FA</button>
          </form>

        </> : <>
        </>}

        {/*//////////////////// ENABLE 2FA ////////////////////*/}
        {qrcode && !has2FA ? <>
          <form onSubmit={(e) => {
            e.preventDefault()
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
            <CodeInput value={code2FA} onChange={(e) => setCode2FA(e.target.value)} inputRef={code2FAInputRef} />
            <button disabled={code2FAButtonDisabled}>Enable 2FA</button>
          </form>
        </> : <></>}

        {/*//////////////////// ACCESS THE PAGE ////////////////////*/}
      </>
        :
        <>
          <form onSubmit={(e) => accesssettings(e)}>
            {
              showaccesscode2FA ? <>
                <label>Enter 2FA code from Authenticator App</label>
                <CodeInput value={accesscode2FA} onChange={(e) => setAccesscode2FA(e.target.value)} inputRef={accesscode2FAInputRef} />
              </>
                :
                <>
                  <label>Password</label>
                  <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} inputRef={passwordInputRef} />
                </>
            }

            <button disabled={showaccesscode2FA ? accesscode2FAButtonDisabled : passwordButtonDisabled}>Verify password</button>
          </form>
        </>}
      </div>
  )
}

export default AccountSettings