const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()
var jwt = require('jsonwebtoken')
const transporter = require('../../config/mailsender').transporter

const Signup = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.username || !req.body.email || !req.body.emailcheck || !req.body.password || !req.body.passwordcheck) return res.status(400).json("Please fill out all the necessary fields")

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

    const connection = await db.getConnection()
    try {
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?, ?)
        `, [username, email, cryptedpassword])

        if (!request) return res.status(400).json("Error with database")

        const verifytoken = jwt.sign({ email, id: request.id }, process.env.VERIFYEMAIL_TOKEN_SECRET)

        await connection.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, NOW() + INTERVAL 30 MINUTE)
        `, ["signup", verifytoken, request.id])

        await transporter.sendMail({
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
        if (err.errno == 1062) return res.status(400).json("This email is already taken")

        return res.status(400).json("An error occured, please try again later")
    } finally {
        connection.release()
    }

}

module.exports = { Signup }