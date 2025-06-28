var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const { Check2FAcode } = require('../get/check2facode')

const GetSensitiveData = async (req, res) => {

    if (req.cookies == null || req.body == null) return res.status(400).json("Wrong request")
    if (req.cookies.accesstoken == null) return res.status(400).json("Missing token")
    if (req.body.password == null) return res.status(400).json("Please fill out all the necessary fields")

    try {
        const data = await GetTokenData(req, req.cookies.accesstoken, "access")
        if (data == null) return res.status(400).json("Invalid token")

        const [[request]] = await db.query(`
            SELECT email, password, 2FA
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null || request.email == null || request.password == null || request["2FA"] == null) return res.status(400).json("User not found")
        const match = await bcrypt.compare(req.body.password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        if (request["2FA"] == 1)
        {
            if (req.body.code == null || req.body.code == "")
            {
                return res.status(200).json({message: "2FA required", hasaccess: false})
            }
            const is2FAvalid = await Check2FAcode(data.id, req.body.code)
            if (!is2FAvalid) return res.status(400).json("Invalid code")
        }

        const sensitivedataDurationMs = Number(process.env.SENSITIVEDATA_TOKEN_DURATION) * 60 * 60 * 1000
        const sensitivedatadate = new Date(Date.now() + sensitivedataDurationMs)
        const sensitivedatatokenjti = uuidv4()
        var sensitivedatatoken = jwt.sign({ id: data.id, jti: sensitivedatatokenjti }, process.env.SENSITIVEDATA_TOKEN_SECRET)
        res.cookie("sensitivedatatoken", sensitivedatatoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth/sensitivedata",
            maxAge: sensitivedataDurationMs
        })

        await db.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [data.id, 'sensitivedata', sensitivedatatokenjti, sensitivedatadate])

        return res.status(200).json({message: "This is your sensitive data, please do not share it", data: {email: request.email, "2FA": request["2FA"]}, hasaccess: true})
    } catch (err) {
        return res.status(500).json("An error occured, please try again later")
    }
}

module.exports = { GetSensitiveData }