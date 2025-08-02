const db = require('../../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { v4: uuidv4 } = require('uuid')
const { decrypt, validatetoken, validatecode } = require('../../../tools/tools')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { Check2FAcode } = require('../../../tools/helper functions/check2facode')

const Check2FA = async (req, res) => {
    try {
        //CHANGE ALLAT
        const oldsensitivedatatoken = req?.cookies?.sensitivedatatoken
        const data2 = await GetTokenData(req, oldsensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step == null || data2.step != 1) return res.status(400).json({message: "Invalid token"})

        const code = req?.body?.code
        if (!validatecode(code)) return res.status(400).json({ message: "Invalid code format" })

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const is2FAvalid = await Check2FAcode(data.id, code)
        if (!is2FAvalid) return res.status(400).json({message: "Invalid code"})

        const [[request]] = await db.query(`
            SELECT email_encrypted, 2FAsecret
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null) return res.status(400).json({message: "User not found"})
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
        `, [data.id, 'sensitivedata', sensitivedatatokenjti, sensitivedatadate.toISOString()])

        let user = {}
        user.email = decryptedemail

        return res.status(200).json({ user, message: "Access granted", encrypted2FAsecret: request["2FAsecret"] })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }

}

module.exports = { Check2FA }