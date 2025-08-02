const crypto = require('crypto')
require('dotenv').config()

function generatelogincode() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 6; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }

  return result;
}

function hash(value, key)
{
  const output = crypto
    .createHmac('sha256', key)
    .update(value)
    .digest('hex')

  return output
}

const ALGORITHM = 'aes-256-gcm'

function encrypt(secret, keyvalue) {
  const KEY = Buffer.from(keyvalue, 'hex')

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)

  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final()
  ])

  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

function decrypt(encryptedString, keyvalue) {
  const KEY = Buffer.from(keyvalue, 'hex')

  const [ivHex, tagHex, encryptedHex] = encryptedString.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')

  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ])

  return decrypted.toString('utf8')
}

function validatehex(value) {
    return value != null && typeof value === 'string' &&
         /^[0-9a-fA-F]+$/.test(value) &&
         value.length % 2 === 0 &&
         value.length >= 64 && value.length <= 512
}

function validatesrpsalt(salt) {
  return salt != null && typeof salt === 'string' &&
         /^[0-9a-fA-F]+$/.test(salt) &&
         salt.length >= 32 && salt.length <= 64
}

function validatesrpverifier(verifier) {
  return verifier != null && typeof verifier === 'string' &&
         /^[0-9a-fA-F]+$/.test(verifier) &&
         verifier.length === 512
}

function validatecode(value) {
  return value != null && typeof value === 'string' && /^[A-Za-z0-9]{6}$/.test(value)
}

function validateemail(email) {
    if (email == null) return { valid: false, message: "Email is empty" }
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (typeof email !== "string" || !emailRegexp.test(email)) return { valid: false, message: "Invalid email format" }

    if (email.length < process.env.MIN_EMAIL_LENGTH) return { valid: false, message: "Email is too short" }
    if (email.length > process.env.MAX_EMAIL_LENGTH) return { valid: false, message: "Email is too long" }

    return { valid: true }
}

function validateusername(username) {
    return username != null && typeof username === "string"
    && username.length >= process.env.MIN_USERNAME_LENGTH
    && username.length <= process.env.MAX_USERNAME_LENGTH
}

function validatetag(tag, id) {
    return tag != null && typeof tag === "string"
    && (isNaN(tag) || tag == id)
    && tag.length >= process.env.MIN_USERNAME_LENGTH
    && tag.length <= process.env.MAX_USERNAME_LENGTH
}

function validatebio(bio) {
    return bio != null && typeof bio === "string"
    && bio.length >= process.env.MIN_BIO_LENGTH
    && bio.length <= process.env.MAX_BIO_LENGTH
}

function validateid(id) {
  if (id == null || isNaN(id) || id < 0) return false
  return true
}

function validatetoken(token) {
  return token != null && typeof token === "string"
    && token.length > 9
    && token.length < 5001
    && token.split(".").length === 3
}

function validatesalt(salt) {
  if (salt == null || typeof salt !== 'string') return false
  try { return Buffer.from(salt, 'base64').length === 16 } catch { return false }
}

function validateprivatekey(key) {
  if (key == null) return false
  try {
    if (typeof key !== 'string') return false

    const [ivB64, cipherB64] = key.split(':')
    if (!ivB64 || !cipherB64) return false

    const iv = Buffer.from(ivB64, 'base64')
    const cipher = Buffer.from(cipherB64, 'base64')

    if (iv.length !== 12) return false
    if (cipher.length === 0) return false
  } catch {
      return false
  }

  return true
}

function validatepublickey(key) {
  if (key == null) return false
  try {
    const pubBuf = Buffer.from(key, 'base64')
    if (pubBuf.length !== 65) return false
    if (pubBuf[0] !== 0x04) return false
  } catch { return false }

  return true
}

function validateuuid(uuid) {
  if (uuid == null) return false
  const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidv4Regex.test(uuid)
}

function validatemessage(message) {
  if (message == null || typeof message !== "string") return false

  const parts = message.split(":")
  if (parts.length !== 2) return false

  const [ivBase64, ciphertextBase64] = parts

  if (!ivBase64 || !ciphertextBase64) return false

  const base64Regex = /^[A-Za-z0-9+/=]+$/
  if (!base64Regex.test(ivBase64) || !base64Regex.test(ciphertextBase64)) return false

  const maxCiphertextLength = Math.ceil((process.env.MAX_MESSAGE_LENGTH + 16) / 3) * 4
  if (ciphertextBase64.length > maxCiphertextLength || ivBase64.length != 16) return false

  return true
}

function validateposttext(text) {
  return text != null && typeof text === "string" && text.length <= 500 && text.length > 0
}

function validateanswer(answer) {
  if (answer == null) return false
}

function validateoffer(offer) {
  if (offer == null) return false
}


module.exports = {
  generatelogincode,
  generateRandomString,
  encrypt,
  decrypt,
  hash,
  validateemail,
  validatetoken,
  validatehex,
  validatecode,
  validatesalt,
  validateprivatekey,
  validatepublickey,
  validatesrpsalt,
  validatesrpverifier,
  validateuuid,
  validateusername,
  validateid,
  validatemessage,
  validatetag,
  validatebio,
  validateposttext,
  validateanswer,
  validateoffer
}