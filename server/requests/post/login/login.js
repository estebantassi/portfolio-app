const db = require('../../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../../config/mailsender').transporter
const { generatelogincode } = require("../../../tools/tools")
const { v4: uuidv4 } = require('uuid')
const { encrypt, decrypt, hash, validatetoken, validateemail, validatehex } = require('../../../tools/tools')
const srp = require('secure-remote-password/server')
const { getCachedValue, setCachedValue } = require('../../../config/redis')
const { GetTokenData } = require('../../get/gettokendata')

const Login = async (req, res) => {
    let connection
    try {
        if (req.cookies == null || req.cookies.logintoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.email == null || req.body.srpProof == null || req.body.srpClientEphemeral == null) return res.status(400).json({message: "Missing data"})

        const logintoken = req.cookies.logintoken
        const email = req.body.email
        const srpProof = req.body.srpProof
        const srpClientEphemeral = req.body.srpClientEphemeral

        if (!validatehex(srpProof)) return res.status(400).json({ message: "Invalid proof format" })
        if (!validatehex(srpClientEphemeral)) return res.status(400).json({ message: "Invalid ephemeral format" })
        if (!validatetoken(logintoken)) return res.status(400).json({ message: "Invalid token format" })

        const emailtest = validateemail(email)
        if (emailtest.valid == false) return res.status(400).json({ message: emailtest.message })

        const data = await GetTokenData(req, logintoken, "logintoken")
        if (data == null || data.step == null || data.step != 0) return res.status(400).json({message: "Invalid token"})

        const hashedemail = hash(email, process.env.EMAIL_HASH_KEY)

        connection = await db.getConnection()
        await connection.beginTransaction()
        const [[request]] = await connection.query(`
            SELECT id, verified, 2FA, srpsalt, srpverifier
            FROM users
            WHERE email_hash=?
            FOR UPDATE
            `, [hashedemail])

        if (request == null || request.verified == null || request.id == null || request['2FA'] == null || request.srpsalt == null || request.srpverifier == null) {
            await connection.rollback()
            return res.status(400).json({message: "User not found"})
        }
        const srpSalt = request.srpsalt
        const srpVerifier = request.srpverifier

        if (request.verified === 0) {
            await connection.rollback()
            return res.status(400).json({message: "Your email isn't verified, please check your inbox"})
        }

        const srpSecretEphemeral = await getCachedValue(`login/ephemeral/${hashedemail}/${data.jti}`)
        let srpServerSession
        try {
            srpServerSession = srp.deriveSession(srpSecretEphemeral, srpClientEphemeral, srpSalt, email, srpVerifier, srpProof)
        } catch {
            await connection.rollback()
            return res.status(400).json({message: "Wrong password"})
        }
        if (!srpServerSession || !srpServerSession.proof) {
            await connection.rollback()
            return res.status(400).json({message: "Wrong password"})
        }

        const tempDurationMs = Number(process.env.TEMP_TOKEN_DURATION) * 60 * 60 * 1000
        const date = new Date(Date.now() + tempDurationMs)
        const temptokenjti = uuidv4()
        const temptoken = jwt.sign({ id: request.id, jti: temptokenjti, step: 1 }, process.env.TEMP_TOKEN_SECRET)
        res.cookie("logintoken", temptoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/logintoken",
            maxAge: tempDurationMs
        })

        await connection.query(`
            DELETE FROM tokens
            WHERE value=? AND userid=? AND type=?
        `, [data.jti, data.id, "logintoken"])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.id, 'logintoken', temptokenjti, date])

        if (request['2FA'] == 0) {
            const code = generatelogincode()

            await connection.query(`
                INSERT INTO tokens (userid, type, value, expires_at)
                VALUES (?, ?, ?, ?)
            `, [request.id, 'logincode', code, date])

            transporter.sendMail({
                from: '"Portfolio security system" <' + process.env.EMAIL + '>',
                to: request.username + ' <' + email + '>',
                subject: "Login code",
                html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">Here is your login code:</h2>
                <h1 style="margin-top: 10; color: #2c3e50;">${code}</h1>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not request this code, please contact our support team and change your password.
                </h3>
            </div>
            `,
            })
        }

        await connection.commit()
        return res.status(200).json({ srpProof: srpServerSession.proof, message: request['2FA'] ? "Enter your 2FA Authenticator Code" : "A login code has been sent to your email", "2FA": request['2FA'] })
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }

}

module.exports = { Login }