const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { v4: uuidv4 } = require('uuid')
const { hash, validateemail } = require('../../tools/tools')
const srp = require('secure-remote-password/server')
const { setCachedValue } = require('../../config/redis')

const LoginStart = async (req, res) => {
    try {
        if (req.body == null || req.body.email == null) return res.status(400).json({message: "Please fill out all the necessary fields"})

        const email = req.body.email
        const emailtest = validateemail(email)
        if (emailtest.valid == false) return res.status(400).json({ message: emailtest.message })
        const hashedemail = hash(email, process.env.EMAIL_HASH_KEY)

        const [[request]] = await db.query(`
            SELECT id, verified, srpsalt, srpverifier
            FROM users
            WHERE email_hash=?
        `, [hashedemail])

        if (request == null || request.id == null || request.verified == null || request.srpsalt == null || request.srpverifier == null) return res.status(400).json({message: "User not found"})
        if (request.verified === 0) return res.status(400).json({message: "Your email isn't verified, please check your inbox"})
        const srpSalt = request.srpsalt
        const srpVerifier = request.srpverifier

        const tempDurationMs = Number(process.env.TEMP_TOKEN_DURATION) * 60 * 60 * 1000
        const date = new Date(Date.now() + tempDurationMs)
        const temptokenjti = uuidv4()
        const temptoken = jwt.sign({ id: request.id, jti: temptokenjti, step: 0 }, process.env.TEMP_TOKEN_SECRET)
        res.cookie("logintoken", temptoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/logintoken",
            maxAge: tempDurationMs
        })

        const srpServerEphemeral = srp.generateEphemeral(srpVerifier)
        await setCachedValue(`login/ephemeral/${hashedemail}/${temptokenjti}`, 60 * 5, srpServerEphemeral.secret)

        await db.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.id, 'logintoken', temptokenjti, date.toISOString()])

        return res.status(200).json({ srpSalt, srpServerEphemeral: srpServerEphemeral.public })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { LoginStart }