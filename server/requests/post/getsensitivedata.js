var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')

const GetSensitiveData = async (req, res) => {

    if (!req.cookies || !req.body) return res.status(400).json("Wrong request")
    if (!req.cookies.accesstoken) return res.status(400).json("Missing token")
    if (!req.body.password) return res.status(400).json("Please fill out all the necessary fields")

    try {
        const data = await GetTokenData(req, req.cookies.accesstoken, "access")
        if (!data) return res.status(400).json("Invalid token")

        const [[request]] = await db.query(`
            SELECT email, password
            FROM users
            WHERE id=?
        `, [data.id])

        if (!request) return res.status(400).json("User not found")
        const match = await bcrypt.compare(req.body.password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        return res.status(200).json({data: {email: request.email}})
    } catch (err) {
        return res.status(400).json("Error")
    }
}

module.exports = { GetSensitiveData }