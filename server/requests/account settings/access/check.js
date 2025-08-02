const db = require('../../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { v4: uuidv4 } = require('uuid')
const { decrypt, validatetoken, validatehex } = require('../../../tools/tools')
const srp = require('secure-remote-password/server')
const { getCachedValue } = require('../../../config/redis')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')

const Check = async (req, res) => {
    let connection
    try {
        if (req.cookies == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.srpProof == null || req.body.srpClientEphemeral == null) return res.status(400).json({message: "Please fill out all the necessary fields"})

        const oldsensitivedatatoken = req.cookies.sensitivedatatoken
        const srpProof = req.body.srpProof
        const srpClientEphemeral = req.body.srpClientEphemeral

        if (!validatehex(srpProof)) return res.status(400).json({ message: "Invalid proof format" })
        if (!validatehex(srpClientEphemeral)) return res.status(400).json({ message: "Invalid ephemeral format" })
        if (!validatetoken(oldsensitivedatatoken)) return res.status(400).json({ message: "Invalid token format" })

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const data2 = await GetTokenData(req, oldsensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step == null || data2.step != 0) return res.status(400).json({message: "Invalid token"})

        connection = await db.getConnection()
        await connection.beginTransaction()
        const [[request]] = await connection.query(`
            SELECT id, 2FA, srpsalt, srpverifier, email_hash, email_encrypted
            FROM users
            WHERE id=?
            FOR UPDATE
        `, [data.id])

        if (request == null || request.id == null || request['2FA'] == null || request.srpsalt == null || request.srpverifier == null || request.email_hash == null || request.email_encrypted == null) {
            await connection.rollback()
            return res.status(400).json({message: "User not found"})
        }
        const srpSalt = request.srpsalt
        const srpVerifier = request.srpverifier
        const hashedemail = request.email_hash
        const encryptedemail = request.email_encrypted
        const decryptedemail = decrypt(encryptedemail, process.env.EMAIL_ENCRYPTION_KEY)

        const srpSecretEphemeral = await getCachedValue(`accountsettings/ephemeral/${hashedemail}/${data2.jti}`)
        let srpServerSession
        try {
            srpServerSession = srp.deriveSession(srpSecretEphemeral, srpClientEphemeral, srpSalt, decryptedemail, srpVerifier, srpProof)
        } catch {
            await connection.rollback()
            return res.status(400).json({message: "Wrong password"})
        }
        if (!srpServerSession || !srpServerSession.proof) {
            await connection.rollback()
            return res.status(400).json({message: "Wrong password"})
        }

        const sensitivedataDurationMs = Number(process.env.SENSITIVEDATA_TOKEN_DURATION) * 60 * 60 * 1000
        const sensitivedatadate = new Date(Date.now() + sensitivedataDurationMs)
        const sensitivedatatokenjti = uuidv4()
        var sensitivedatatoken = jwt.sign({ id: data.id, jti: sensitivedatatokenjti, step: 1 }, process.env.SENSITIVEDATA_TOKEN_SECRET)
        res.cookie("sensitivedatatoken", sensitivedatatoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth/sensitivedata",
            maxAge: sensitivedataDurationMs
        })

        await connection.query(`
            DELETE FROM tokens
            WHERE value=? AND userid=? AND type=?
        `, [data2.jti, data.id, "sensitivedata"])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [data.id, 'sensitivedata', sensitivedatatokenjti, sensitivedatadate.toISOString()])

        let user = {}
        if (request["2FA"] == 0) { user.email = decryptedemail }

        await connection.commit()
        return res.status(200).json({ srpProof: srpServerSession.proof, user, message: request['2FA'] ? "Enter your 2FA Authenticator Code" : "Access granted", "2FA": request['2FA'] })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }

}

module.exports = { Check }