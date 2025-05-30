var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../../tools/gettokendata')

const IsTokenValid = async (req, res) => {

    if (!req.cookies) return res.status(400).json("Wrong request")
    if (!req.cookies.accesstoken) return res.status(400).json("Missing token")

    const accesstoken = req.cookies.accesstoken

    try {
        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json("Invalid token")

        return res.status(200).json("Token is valid")
    } catch (err) {
        return res.status(400).json("Invalid token")
    }
}

module.exports = { IsTokenValid }