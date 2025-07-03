const crypto = require('crypto')
require('dotenv').config()

function generatelogincode() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < 5; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const ALGORITHM = 'aes-256-gcm';

function hash(value, key)
{
  const output = crypto
    .createHmac('sha256', key)
    .update(value)
    .digest('hex')

  return output
}

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

module.exports = { generatelogincode, encrypt, decrypt, hash }