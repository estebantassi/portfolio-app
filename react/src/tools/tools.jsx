async function deriveKey(password, encrypted2FAsecret, base64Salt) {
  const salt = Uint8Array.from(atob(base64Salt), c => c.charCodeAt(0))
  const encoder = new TextEncoder()

  const secretvalue = password + "" + encrypted2FAsecret
  console.log(secretvalue)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secretvalue),
    'PBKDF2',
    false,
    ['deriveKey']
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )

  return key
}

async function encryptDataKey(dataKey, passwordKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const rawDataKey = await crypto.subtle.exportKey('pkcs8', dataKey)

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    passwordKey,
    rawDataKey
  )

  const ivBase64 = btoa(String.fromCharCode(...iv))
  const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))

  return `${ivBase64}:${cipherBase64}`
}

async function decryptDataKey(encryptedDataKey, passwordKey) {
  
  const [ivBase64, cipherBase64] = encryptedDataKey.split(':')
  if (!ivBase64 || !cipherBase64) {
    throw new Error('Invalid encryptedDataKey format')
  }

  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0))
  const ciphertext = Uint8Array.from(atob(cipherBase64), c => c.charCodeAt(0))

  const decryptedPkcs8 = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    passwordKey,
    ciphertext
  )

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    decryptedPkcs8,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  )

  return privateKey
}

function uint8ArrayToBase64(u8Arr) {
  let CHUNK_SIZE = 0x8000 // 32KB chunk size
  let index = 0
  const length = u8Arr.length
  let result = ''
  let slice

  while (index < length) {
    slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length))
    result += String.fromCharCode.apply(null, slice)
    index += CHUNK_SIZE
  }

  return btoa(result)
}

function base64ToUint8Array(base64) {
  const raw = atob(base64)
  const rawLength = raw.length
  const array = new Uint8Array(rawLength)
  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i)
  }
  return array
}

async function encryptMessage(secretKey, plaintext, type) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  let encoded

  if (type === "image") {
    encoded = new Uint8Array(plaintext)
  } else {
    const encoder = new TextEncoder()
    encoded = encoder.encode(plaintext)
  }

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    secretKey,
    encoded
  )

  const ivBase64 = uint8ArrayToBase64(iv)
  const ciphertextBase64 = uint8ArrayToBase64(new Uint8Array(ciphertext))

  return `${ivBase64}:${ciphertextBase64}`
}

async function decryptMessage(secretKey, encryptedData, type) {
  if (type === "image") {
    const data = new Uint8Array(encryptedData)
    const iv = data.slice(0, 12)
    const ciphertext = data.slice(12)

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      secretKey,
      ciphertext
    )

    return decrypted
  } else {
    const [ivBase64, ciphertextBase64] = encryptedData.split(':')
    if (!ivBase64 || !ciphertextBase64) throw new Error("Invalid format")

    const iv = base64ToUint8Array(ivBase64)
    const ciphertext = base64ToUint8Array(ciphertextBase64)

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      secretKey,
      ciphertext
    )
    
    return new TextDecoder().decode(decrypted)
  }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function validatehex(value) {
    return typeof value === 'string' &&
         /^[0-9a-fA-F]+$/.test(value) &&
         value.length % 2 === 0 &&
         value.length >= 64 && value.length <= 128
}

function validatecode(value) {
  return typeof value === 'string' && /^[0-9]{6}$/.test(value)
}

function validateemail(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (typeof email !== "string" || !emailRegexp.test(email)) return json({ valid: false, message: "Invalid email format" })

    if (email.length < process.env.MIN_EMAIL_LENGTH) return json({ valid: false, message: "Email is too short" })
    if (email.length > process.env.MAX_EMAIL_LENGTH) return json({ valid: false, message: "Email is too long" })

    return json({ valid: true })
}

function validatetoken(token) {
  return typeof token === "string"
    && token.length > 9
    && token.length < 5001
    && token.split(".").length === 3
}

function imageToBase64(file)
{
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
    reader.readAsDataURL(file)
  })
}

export {
    deriveKey,
    encryptDataKey,
    decryptDataKey,
    arrayBufferToBase64,
    base64ToArrayBuffer,
    encryptMessage,
    decryptMessage,
    validatehex,
    validatecode,
    validateemail,
    validatetoken,
    imageToBase64
}