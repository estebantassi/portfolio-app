const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()
var jwt = require('jsonwebtoken')
const transporter = require('../../config/mailsender').transporter
const { v4: uuidv4 } = require('uuid')
const { encrypt, decrypt, hash, validateemail } = require('../../tools/tools')

const Signup = async (req, res) => {

    if (req.body == null || req.body.username == null || req.body.email == null || req.body.emailcheck == null || req.body.password == null
        || req.body.passwordcheck == null || req.body.salt == null || req.body.privatekey == null || req.body.publickey == null || req.body.srpSalt == null || req.body.srpVerifier == null)
        return res.status(400).json({ message: "Please fill out all the necessary fields" })

    let salt
    try { salt = Buffer.from(req.body.salt, 'base64') } catch { return res.status(400).json({ message: "Error" }) }
    if (salt.length !== 16) return res.status(400).json({ message: "Error" })

    try {
        const pubBuf = Buffer.from(req.body.publickey, 'base64')
        if (pubBuf.length !== 65) throw 'Error'
        if (pubBuf[0] !== 0x04) throw 'Error'
    } catch { return res.status(400).json({ message: "Error" }) }

    try {
        const [ivB64, cipherB64] = req.body.privatekey.split(':')
        if (!ivB64 || !cipherB64) throw 'Error'

        const iv = Buffer.from(ivB64, 'base64')
        const cipher = Buffer.from(cipherB64, 'base64')

        if (iv.length !== 12) throw 'Error'
        if (cipher.length === 0) throw 'Error'
    } catch { return res.status(400).json({ message: "Error" }) }

    const username = req.body.username
    const email = req.body.email
    const emailcheck = req.body.emailcheck
    const password = req.body.password
    const passwordcheck = req.body.passwordcheck

    if (password != passwordcheck) return res.status(400).json({ message: "Passwords don't match" })
    if (email != emailcheck) return res.status(400).json({ message: "Emails don't match" })

    if (username.length > process.env.MAX_USERNAME_LENGTH) return res.status(400).json({ message: "Username is too long" })
    if (username.length < process.env.MIN_USERNAME_LENGTH) return res.status(400).json({ message: "Username is too short" })

    if (password.length > process.env.MAX_PASSWORD_LENGTH) return res.status(400).json({ message: "Password is too long" })
    if (password.length < process.env.MIN_PASSWORD_LENGTH) return res.status(400).json({ message: "Password is too short" })

    const emailtest = validateemail(email)
    if (emailtest.valid == false) return res.status(400).json({ message: emailtest.message })

    const passwordsalt = await bcrypt.genSalt()
    const cryptedpassword = await bcrypt.hash(password, passwordsalt)
    const encryptedemail = encrypt(email, process.env.EMAIL_ENCRYPTION_KEY)
    const hashedemail = hash(email, process.env.EMAIL_HASH_KEY)

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const date = new Date()
        const [request] = await connection.query(`
            INSERT INTO users (username, email_hash, email_encrypted, password, created_at, messagekey_encrypted, messagesalt, messagekey_public, srpsalt, srpverifier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [username, hashedemail, encryptedemail, cryptedpassword, date, req.body.privatekey, req.body.salt, req.body.publickey, req.body.srpSalt, req.body.srpVerifier])

        if (request == null || request.insertId == null) {
            await connection.rollback()
            return res.status(400).json({ message: "Couldn't create account" })
        }

        const verifyjti = uuidv4()
        const verifytoken = jwt.sign({ email, id: request.insertId, jti: verifyjti }, process.env.VERIFYEMAIL_TOKEN_SECRET)

        const verificationDurationMs = process.env.VERIFYEMAIL_TOKEN_DURATION * 60 * 60 * 1000
        const verificationdate = new Date(Date.now() + verificationDurationMs)

        await connection.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, ?)
        `, ["signup", verifyjti, request.insertId, verificationdate])

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: username + ' <' + email + '>',
            subject: "Verification link",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">Here is your verification link:</h2>
                <a href="http://localhost:5173/verifyemail/${verifytoken}" style="margin-top: 10; color: #2c3e50;">VERIFY</a>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not create this account, please contact our support team to get it removed.
                </h3>
            </div>
            `,
        })

        await connection.commit()
        return res.status(200).json({ message: "Verification link sent to your email" })
    } catch (err) {
        console.log(err)
        if (connection) await connection.rollback()
        if (err.errno && err.errno == 1062) return res.status(400).json({ message: "This email is already taken" })
        return res.status(500).json({ message: "An error occured, please try again later" })
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Signup }