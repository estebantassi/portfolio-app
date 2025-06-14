const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()
var jwt = require('jsonwebtoken')
const transporter = require('../../config/mailsender').transporter
const { v4: uuidv4 } = require('uuid')

const Signup = async (req, res) => {

    if (req.body == null || req.body.username == null || req.body.email == null || req.body.emailcheck == null || req.body.password == null || req.body.passwordcheck == null) return res.status(400).json("Please fill out all the necessary fields")

    const username = req.body.username
    const email = req.body.email
    const emailcheck = req.body.emailcheck
    const password = req.body.password
    const passwordcheck = req.body.passwordcheck

    if (username.length > process.env.MAX_USERNAME_LENGTH) return res.status(400).json("Username is too long")
    if (username.length < process.env.MIN_USERNAME_LENGTH) return res.status(400).json("Username is too short")

    if (password.length > process.env.MAX_PASSWORD_LENGTH) return res.status(400).json("Password is too long")
    if (password.length < process.env.MIN_PASSWORD_LENGTH) return res.status(400).json("Password is too short")

    if (password != passwordcheck) return res.status(400).json("Passwords don't match")
    if (email != emailcheck) return res.status(400).json("Emails don't match")
        
    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegexp.test(email)) return res.status(400).json("Email isn't valid")

    const passwordsalt = await bcrypt.genSalt()
    const cryptedpassword = await bcrypt.hash(password, passwordsalt)

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const date = new Date()
        const [request] = await connection.query(`
            INSERT INTO users (username, email, password, created_at)
            VALUES (?, ?, ?, ?)
        `, [username, email, cryptedpassword, date])

        if (request == null || request.insertId == null) {
            await connection.rollback()
            return res.status(400).json("Couldn't create account")
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
        return res.status(200).json("Verification link sent to your email")
    } catch (err) {
        if (connection) await connection.rollback()
        if (err.errno && err.errno == 1062) return res.status(400).json("This email is already taken")
        return res.status(500).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Signup }