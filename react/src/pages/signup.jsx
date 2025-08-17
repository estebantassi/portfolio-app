import { useEffect, useState, useContext, useRef } from 'react'
import { ToastContext } from '../context/toastcontext'
import { useAuth } from '../context/authcontext'
import { EmailInput, PasswordInput, UsernameInput } from '../components/inputs'
import { useNavigate } from 'react-router'
import { arrayBufferToBase64, deriveKey, encryptDataKey } from '../tools/tools'
import srp from "secure-remote-password/client"
import axios from '../api/axios'

function Signup() {

  const { addToast } = useContext(ToastContext)
  const navigate = useNavigate()
  const { startnetworkrequest, isNetworkButtonDisabled, networkControllerRef, setIsNetworkButtonDisabled } = useAuth()

  const [data, setData] = useState({
    username: "",
    email: "",
    emailcheck: "",
    password: "",
    passwordcheck: ""
  })

  const signupform = async (e) => {
    e.preventDefault()
    startnetworkrequest(false)

    try {
      //Generate the private key for encryption and its values
      const rawsalt = crypto.getRandomValues(new Uint8Array(16))
      const salt = btoa(String.fromCharCode(...rawsalt))
      const passwordKey = await deriveKey(data.password, "", salt)

      const keypair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"])
      const privatekey = await encryptDataKey(keypair.privateKey, passwordKey)

      const publickey = await crypto.subtle.exportKey('raw', keypair.publicKey)
      const publickeybase64 = arrayBufferToBase64(publickey)

      //Generate SRP values
      const srpSalt = srp.generateSalt()
      const srpPrivatekey = srp.derivePrivateKey(srpSalt, data.email, data.password)
      const srpVerifier = srp.deriveVerifier(srpPrivatekey)

      //Request account creation
      const response = await axios.post('/signup', {
          username: data.username, email: data.email, emailcheck: data.emailcheck, salt, privatekey, publickey: publickeybase64, srpSalt, srpVerifier
      }, {
          signal: networkControllerRef.current.signal
      })

      navigate("/login")
      addToast(response?.data?.message || "Success", "green")
    } catch (err) {
        addToast(err.response?.data?.message || "An error occurred", "red")
    }

    setIsNetworkButtonDisabled(false)
  }

  const usernameInputRef = useRef(null)
  const emailInputRef = useRef(null)
  const emailcheckInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const passwordcheckInputRef = useRef(null)
  const signupButtonDisabled = isNetworkButtonDisabled || !usernameInputRef.current?.checkValidity() || !emailInputRef.current?.checkValidity() || !emailcheckInputRef.current?.checkValidity() || !passwordInputRef.current?.checkValidity() || !passwordcheckInputRef.current?.checkValidity()

  return (
    <>
      <h1>Signup</h1>

      <form onSubmit={(e) => signupform(e)}>
        <label>Username</label>
        <UsernameInput value={data.username} onChange={(e) => setData({ ...data, username: e.target.value })} inputRef={usernameInputRef} />

        <label>Email</label>
        <EmailInput value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} inputRef={emailInputRef} />

        <label>Email Check</label>
        <EmailInput value={data.emailcheck} onChange={(e) => setData({ ...data, emailcheck: e.target.value })} inputRef={emailcheckInputRef} />

        <label>Password</label>
        <PasswordInput value={data.password} onChange={(e) => setData({ ...data, password: e.target.value })} inputRef={passwordInputRef} />

        <label>Password Check</label>
        <PasswordInput value={data.passwordcheck} onChange={(e) => setData({ ...data, passwordcheck: e.target.value })} inputRef={passwordcheckInputRef} />
        
        <button disabled={signupButtonDisabled}>
          SIGNUP
        </button>
      </form>
    </>
  )
}

export default Signup