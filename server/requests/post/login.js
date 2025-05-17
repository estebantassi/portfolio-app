const db = require('../../config/database')
const bcrypt = require('bcrypt')
require('dotenv').config()

const Login = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.email || !req.body.password) return res.status(400).json("Please fill out all the necessary fields")

    const email = req.body.email
    const password = req.body.password

    try {
        const [[request]] = await db.query(`
            SELECT password
            FROM users
            WHERE email=?
            `, [email])

        if (!request) return res.status(400).json("User not found")

        const match = await bcrypt.compare(password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        //Log the user
        res.cookie("accesstoken", "test token, replace with actual token", {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 60 * 1000
        })

        res.cookie("refreshtoken", "test token, replace with actual token", {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 10 * 1000
        })

        return res.status(200).json("Successfully logged in")
    } catch (err) {
        return res.status(400).json("An error occured, please try again later")
    }

}

module.exports = { Login }