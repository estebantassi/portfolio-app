const db = require('../../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { v4: uuidv4 } = require('uuid')
const { decrypt, validatetoken } = require('../../../tools/tools')
const srp = require('secure-remote-password/server')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { setCachedValue } = require('../../../config/redis')

const CheckStart = async (req, res) => {
    try {
        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const [[request]] = await db.query(`
            SELECT email_hash, srpsalt, srpverifier, email_encrypted
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null) return res.status(400).json({message: "User not found"})
            
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
        `, [data.id, 'sensitivedata', sensitivedatatokenjti, sensitivedatadate.toISOString()])

        const srpServerEphemeral = srp.generateEphemeral(srpVerifier)
        await setCachedValue(`accountsettings/ephemeral/${hashedemail}/${sensitivedatatokenjti}`, 60 * 5, srpServerEphemeral.secret)

        return res.status(200).json({ srpSalt, srpServerEphemeral: srpServerEphemeral.public, email: decryptedemail })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { CheckStart }