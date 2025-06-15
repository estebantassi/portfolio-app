var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')

const GetSensitiveData = async (req, res) => {

    if (req.cookies == null || req.body == null) return res.status(400).json("Wrong request")
    if (req.cookies.accesstoken == null) return res.status(400).json("Missing token")
    if (req.body.password == null) return res.status(400).json("Please fill out all the necessary fields")

    try {
        const data = await GetTokenData(req, req.cookies.accesstoken, "access")
        if (data == null) return res.status(400).json("Invalid token")

        const [[request]] = await db.query(`
            SELECT email, password
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null || request.email == null || request.password == null) return res.status(400).json("User not found")
        const match = await bcrypt.compare(req.body.password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        return res.status(200).json({data: {email: request.email}})
    } catch (err) {
        return res.status(500).json("An error occured, please try again later")
    }
}

module.exports = { GetSensitiveData }