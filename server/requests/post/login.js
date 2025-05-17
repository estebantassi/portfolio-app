const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()

const Login = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.email || !req.body.password) return res.status(400).json("Please fill out all the necessary fields")

    const email = req.body.email
    const password = req.body.password

    try {
        const [[request]] = await db.query(`
            SELECT password, id, username
            FROM users
            WHERE email=?
            `, [email])

        if (!request) return res.status(400).json("User not found")

        const match = await bcrypt.compare(password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        var accesstoken = jwt.sign({ id: request.id }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: 60 * 1000
        })

        var refreshtoken = jwt.sign({ id: request.id }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/refreshtoken",
            maxAge: 60 * 60 * 1000
        })

        return res.status(200).json({ message: "Successfully logged in", user: {username: request.username, id: request.id}})
    } catch (err) {
        return res.status(400).json("An error occured, please try again later")
    }

}

module.exports = { Login }