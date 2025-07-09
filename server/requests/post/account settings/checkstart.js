const db = require('../../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../../config/mailsender').transporter
const { generatelogincode } = require("../../../tools/tools")
const { v4: uuidv4 } = require('uuid')
const { CheckUserExpirations } = require("../../remove/checkuserexpirations")
const { encrypt, decrypt, hash, validateemail, validatetoken } = require('../../../tools/tools')
const srp = require('secure-remote-password/server')
const { getCachedValue, setCachedValue } = require('../../../config/redis')
const { GetTokenData } = require('../../get/gettokendata')

const CheckStart = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})

        const accesstoken = req.cookies.accesstoken
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token"})

        const data = await GetTokenData(req, req.cookies.accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        const [[request]] = await db.query(`
            SELECT email_hash, srpsalt, srpverifier, email_encrypted
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null || request.email_hash == null || request.srpsalt == null || request.srpverifier == null || request.email_encrypted == null) return res.status(400).json({message: "User not found"})
        const hashedemail = request.email_hash
        const encryptedemail = request.email_encrypted
        const decryptedemail = decrypt(encryptedemail, process.env.EMAIL_ENCRYPTION_KEY)
        const srpVerifier = request.srpverifier
        const srpSalt = request.srpsalt

        const sensitivedataDurationMs = Number(process.env.SENSITIVEDATA_TOKEN_DURATION) * 60 * 60 * 1000
        const sensitivedatadate = new Date(Date.now() + sensitivedataDurationMs)
        const sensitivedatatokenjti = uuidv4()
        var sensitivedatatoken = jwt.sign({ id: data.id, jti: sensitivedatatokenjti, step: 0 }, process.env.SENSITIVEDATA_TOKEN_SECRET)
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

        const srpServerEphemeral = srp.generateEphemeral(srpVerifier)
        await setCachedValue(`accountsettings/ephemereal/${hashedemail}/${sensitivedatatokenjti}`, 60 * 5, srpServerEphemeral.secret)

        return res.status(200).json({ srpSalt, srpServerEphemereal: srpServerEphemeral.public, email: decryptedemail })
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { CheckStart }