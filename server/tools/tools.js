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
    return typeof value === 'string' &&
         /^[0-9a-fA-F]+$/.test(value) &&
         value.length % 2 === 0 &&
         value.length >= 64 && value.length <= 512
}

function validatesrpsalt(salt) {
  return typeof salt === 'string' &&
         /^[0-9a-fA-F]+$/.test(salt) &&
         salt.length >= 32 && salt.length <= 64
}

function validatesrpverifier(verifier) {
  return typeof verifier === 'string' &&
         /^[0-9a-fA-F]+$/.test(verifier) &&
         verifier.length === 512
}

function validatecode(value) {
  return typeof value === 'string' && /^[A-Za-z0-9]{6}$/.test(value)
}

function validateemail(email) {
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (typeof email !== "string" || !emailRegexp.test(email)) return { valid: false, message: "Invalid email format" }

    if (email.length < process.env.MIN_EMAIL_LENGTH) return { valid: false, message: "Email is too short" }
    if (email.length > process.env.MAX_EMAIL_LENGTH) return { valid: false, message: "Email is too long" }

    return { valid: true }
}

function validatetoken(token) {
  return typeof token === "string"
    && token.length > 9
    && token.length < 5001
    && token.split(".").length === 3
}

function validatesalt(salt) {
  if (typeof salt !== 'string') return false
  try { return Buffer.from(salt, 'base64').length === 16 } catch { return false }
}

function validateprivatekey(key) {
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
  try {
    const pubBuf = Buffer.from(key, 'base64')
    if (pubBuf.length !== 65) return false
    if (pubBuf[0] !== 0x04) return false
  } catch { return false }

  return true
}

module.exports = {
  generatelogincode,
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
  validatesrpverifier
}