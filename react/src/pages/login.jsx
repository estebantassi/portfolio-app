import { useState, useContext, useRef } from 'react'
import { ToastContext } from '../context/toastcontext'
import { useAuth } from '../context/authcontext'
import axios from '../api/axios'
import { arrayBufferToBase64, decryptDataKey, deriveKey } from '../tools/tools'
import srp from "secure-remote-password/client"
import { useNavigate } from "react-router"
import { CodeInput, EmailInput, PasswordInput } from '../components/inputs'
import "../css/forms.css"

function Login() {

  const navigate = useNavigate()
  const { addToast } = useContext(ToastContext)
  const { startnetworkrequest, isNetworkButtonDisabled, networkControllerRef, setUser, setIsNetworkButtonDisabled } = useAuth()

  const [data, setData] = useState({
    email: "",
    password: "",
    code: ""
  })

  const [showLoginCode, setShowLoginCode] = useState(false)
  const [isusing2FA, setIsusing2FA] = useState(false)

  //Function to INITIATE login
  const loginform = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      //Fetch semi-public user data
      const firstResponse = await axios.post('/loginstart',
        {
          email: data.email
        }, {
        signal: networkControllerRef.current.signal
      })

      const srpSalt = firstResponse.data.srpSalt
      const srpServerEphemeral = firstResponse.data.srpServerEphemeral

      //Generate SRP proof using the password
      const srpClientEphemeral = srp.generateEphemeral()
      const srpPrivateKey = srp.derivePrivateKey(srpSalt, data.email, data.password)
      const srpClientSession = srp.deriveSession(srpClientEphemeral.secret, srpServerEphemeral, srpSalt, data.email, srpPrivateKey)

      //Get validated by the server
      const response = await axios.post('/logintoken/login', {
        email: data.email, srpProof: srpClientSession.proof, srpClientEphemeral: srpClientEphemeral.public
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      //Check if the server isn't a fake
      try { srp.verifySession(srpClientEphemeral.public, srpClientSession, response.data.srpProof) } catch { throw "Error" }

      addToast(response?.data?.message || "Success", "green")
      response.data["2FA"] ? setIsusing2FA(true) : setShowLoginCode(true)
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
    setIsNetworkButtonDisabled(false)
  }

  //Function to FINISH login
  const logincodeform = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      //Finish the login using the 2FA/email code
      const response = await axios.post('/logintoken/logincode', {
        code: data.code
      }, {
        withCredentials: true,
        signal: networkControllerRef.current.signal
      })

      //Generate private encryption key later used to decrypt/encrypt messages
      const encrypted2FAsecret = response.data.has2FA == 1 ? response.data.encrypted2FAsecret : ""
      const passwordKey = await deriveKey(data.password, encrypted2FAsecret, response.data.user.salt)
      const key = await decryptDataKey(response.data.user.encryptedkey, passwordKey)
      const exportedKeyBuffer = await crypto.subtle.exportKey('pkcs8', key)
      const keyBase64 = arrayBufferToBase64(exportedKeyBuffer)

      localStorage.setItem("messagekey", keyBase64)
      setUser({
        id: response.data.user.id,
        username: response.data.user.username,
        tag: response.data.user.tag,
        bio: response.data.user.bio
      })

      navigate("/home")
      addToast(response?.data?.message || "Success", "green")
    } catch (err) {
      addToast(err.response?.data?.message || "An error occurred", "red")
    }
    setIsNetworkButtonDisabled(false)
  }

  const codeInputRef = useRef(null)
  const isCodeButtonDisabled = isNetworkButtonDisabled || !codeInputRef.current?.checkValidity()

  const emailInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const isLoginButtonDisabled = isNetworkButtonDisabled || !emailInputRef.current?.checkValidity() || !passwordInputRef.current?.checkValidity()

  return (
    <>
      

      {
        showLoginCode ?
          <>
            <form className='form' onSubmit={(e) => logincodeform(e)}>

              <h1>Login</h1>

              <label>{isusing2FA ? "Authenticator App Code" : "Email Code"}</label>
              <CodeInput value={data.code} onChange={(e) => setData({ ...data, code: e.target.value })} inputRef={codeInputRef} />

              <button disabled={isCodeButtonDisabled}>Verify code</button>

            </form>
          </>
          :
          <>
            <form className='form' onSubmit={(e) => loginform(e)}>

              <h1>Login</h1>

              <label>Email</label>
              <EmailInput value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} inputRef={emailInputRef} />

              <label>Password</label>
              <PasswordInput value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} inputRef={passwordInputRef} />

              <button disabled={isLoginButtonDisabled}>LOGIN</button>
            </form>
          </>
      }
    </>
  )
}

export default Login