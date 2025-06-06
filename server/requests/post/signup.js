const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()
var jwt = require('jsonwebtoken')
require('dotenv').config()
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

    try {

        const verifytoken = jwt.sign({ email }, process.env.VERIFYEMAIL_TOKEN_SECRET)
        res.cookie("verifytoken", verifytoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: process.env.VERIFYEMAIL_TOKEN_DURATION * 60 * 1000
        })

        await db.query(`
            INSERT INTO users (username, email, password, verificationtoken)
            VALUES (?, ?, ?, ?)
        `, [username, email, cryptedpassword, verifytoken])

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

        return res.status(200).json("Verification link sent to your email")
    } catch (err) {
        if (err.errno == 1062) return res.status(400).json("This email is already taken")

        return res.status(400).json("An error occured, please try again later")
    }

}

module.exports = { Signup }