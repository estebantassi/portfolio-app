var jwt = require('jsonwebtoken')
require('dotenv').config()

const IsTokenValid = async (req, res) => {

    if (!req.cookies) return res.status(400).json("Wrong request")

    if (!req.cookies.accesstoken) return res.status(400).json("Missing token")

    console.log(req.cookies)
    const accesstoken = req.cookies.accesstoken

    try {
        jwt.verify(accesstoken, process.env.ACCESS_TOKEN_SECRET)

        return res.status(200).json("Token is valid")
    } catch (err) {
        return res.status(400).json("Invalid token")
    }
}

module.exports = { IsTokenValid }