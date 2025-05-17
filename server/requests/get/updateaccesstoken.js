const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()

const UpdateAccessToken = async (req, res) => {
    if (!req.cookies) return res.status(400).json("Wrong request")
    if (!req.cookies.refreshtoken) return res.status(400).json("Missing token")

    let id
    try {
        const decode = jwt.verify(req.cookies.refreshtoken, process.env.REFRESH_TOKEN_SECRET)
        id = decode.id
    } catch (err) {
        return res.status(400).json("Invalid token")
    }

    try {
        const [[request]] = await db.query(`
            SELECT email
            FROM users
            WHERE id=?
        `, [id])

        if (!request) return res.status(400).json("User not found")

        var accesstoken = jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: 60 * 1000
        })

        return res.status(200).json("Updated token")
    } catch (err) {
        return res.status(400).json("An error occured, please try again later")
    }
}

module.exports = { UpdateAccessToken }