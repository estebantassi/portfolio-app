const db = require('../../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../../config/mailsender').transporter
const { generatelogincode } = require("../../../tools/tools")
const { v4: uuidv4 } = require('uuid')
const { encrypt, decrypt, hash, validatetoken, validatecode, validatehex } = require('../../../tools/tools')
const srp = require('secure-remote-password/server')
const { getCachedValue, setCachedValue } = require('../../../config/redis')
const { GetTokenData } = require('../../get/gettokendata')
const { Check2FAcode } = require('../../post/2FA/check2facode')

const Check2FA = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.code == null) return res.status(400).json({message: "Please fill out all the necessary fields"})

        const accesstoken = req.cookies.accesstoken
        const oldsensitivedatatoken = req.cookies.sensitivedatatoken
        const code = req.body.code

        if (!validatecode(code)) return res.status(400).json({ message: "Invalid code format" })
        if (!validatetoken(accesstoken)) return res.status(400).json({ message: "Invalid token format" })
        if (!validatetoken(oldsensitivedatatoken)) return res.status(400).json({ message: "Invalid token format" })

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})
        const data2 = await GetTokenData(req, oldsensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step == null || data2.step != 1) return res.status(400).json({message: "Invalid token"})

        const is2FAvalid = await Check2FAcode(data.id, code)
        if (!is2FAvalid) return res.status(400).json({message: "Invalid code"})

        const [[request]] = await db.query(`
            SELECT email_encrypted
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null || request.email_encrypted == null) return res.status(400).json({message: "User not found"})
        const encryptedemail = request.email_encrypted
        const decryptedemail = decrypt(encryptedemail, process.env.EMAIL_ENCRYPTION_KEY)

        const sensitivedataDurationMs = Number(process.env.SENSITIVEDATA_TOKEN_DURATION) * 60 * 60 * 1000
        const sensitivedatadate = new Date(Date.now() + sensitivedataDurationMs)
        const sensitivedatatokenjti = uuidv4()
        var sensitivedatatoken = jwt.sign({ id: data.id, jti: sensitivedatatokenjti, step: 2 }, process.env.SENSITIVEDATA_TOKEN_SECRET)
        res.cookie("sensitivedatatoken", sensitivedatatoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth/sensitivedata",
            maxAge: sensitivedataDurationMs
        })

        await db.query(`
            DELETE FROM tokens
            WHERE value=? AND userid=? AND type=?
        `, [data2.jti, data.id, "sensitivedata"])

        await db.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [data.id, 'sensitivedata', sensitivedatatokenjti, sensitivedatadate])

        let user = {}
        user.email = decryptedemail

        return res.status(200).json({ user, message: "Access granted" })
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }

}

module.exports = { Check2FA }