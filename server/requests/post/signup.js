const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()
var jwt = require('jsonwebtoken')
const transporter = require('../../config/mailsender').transporter
const { v4: uuidv4 } = require('uuid')
const { encrypt, decrypt, hash, validateemail, validatesalt, validatepublickey, validateprivatekey, validatesrpsalt, validatesrpverifier, validateusername } = require('../../tools/tools')

const Signup = async (req, res) => {

    let connection
    try {
     if (req.body == null || req.body.username == null || req.body.email == null || req.body.emailcheck == null || req.body.salt == null || req.body.privatekey == null || req.body.publickey == null || req.body.srpSalt == null || req.body.srpVerifier == null)
            return res.status(400).json({ message: "Missing data" })

        const salt = req.body.salt
        const publickey = req.body.publickey
        const privatekey = req.body.privatekey
        const srpsalt = req.body.srpSalt
        const srpverifier = req.body.srpVerifier
        const username = req.body.username
        const email = req.body.email
        const emailcheck = req.body.emailcheck

        if (!validateusername(username))
        if (!validatesalt(salt)) return res.status(400).json({ message: "Invalid salt format" })
        if (!validatepublickey(publickey)) return res.status(400).json({ message: "Invalid key format" })
        if (!validateprivatekey(privatekey)) return res.status(400).json({ message: "Invalid key format" })
        if (!validatesrpsalt(srpsalt)) return res.status(400).json({ message: "Invalid salt format" })
        if (!validatesrpverifier(srpverifier)) return res.status(400).json({ message: "Invalid verifier format" })

        if (email != emailcheck) return res.status(400).json({ message: "Emails don't match" })
        const emailtest = validateemail(email)
        if (emailtest.valid == false) return res.status(400).json({ message: emailtest.message })

        const encryptedemail = encrypt(email, process.env.EMAIL_ENCRYPTION_KEY)
        const hashedemail = hash(email, process.env.EMAIL_HASH_KEY)

        connection = await db.getConnection()
        await connection.beginTransaction()

        const [request] = await connection.query(`
            INSERT INTO users (username, email_hash, email_encrypted, created_at, messagekey_encrypted, messagesalt, messagekey_public, srpsalt, srpverifier)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [username, hashedemail, encryptedemail, new Date(), privatekey, salt, publickey, srpsalt, srpverifier])

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
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        if (err.errno && err.errno == 1062) return res.status(400).json({ message: "This email is already taken" })
        return res.status(500).json({ message: "An error occured, please try again later" })
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Signup }