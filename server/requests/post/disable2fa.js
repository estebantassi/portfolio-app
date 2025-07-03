require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const transporter = require('../../config/mailsender').transporter
const speakeasy = require('speakeasy')

const Disable2FA = async (req, res) => {

    if (req.cookies == null) return res.status(400).json({message: "Wrong request"})
    if (req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Missing token"})

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json({message: "Invalid token"})
    const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
    if (data2 == null) return res.status(400).json({message: "Invalid token"})

    try {

        await db.query(`
            UPDATE users
            SET 2FA=0, 2FAsecret=""
            WHERE id=?
            `, [data.id])

        return res.status(200).json({message: "2FA successfully disabled"})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Disable2FA }