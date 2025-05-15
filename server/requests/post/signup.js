const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()

const IsEmailValid = require('../../tools/checks').IsEmailValid

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
    if (!IsEmailValid(email)) return res.status(400).json("Email isn't valid")

    const passwordsalt = await bcrypt.genSalt()
    const cryptedpassword = await bcrypt.hash(password, passwordsalt)

    try {
        await db.query(`
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
            `, [username, email, cryptedpassword])


        return res.status(200).json("Account successfully created")
    } catch (err) {
        if (err.errno == 1062) return res.status(400).json("This email is already taken")

        console.log(err)
    }

}

module.exports = { Signup }