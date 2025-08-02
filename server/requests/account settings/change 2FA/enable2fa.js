require('dotenv').config()
const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const transporter = require('../../../config/mailsender').transporter
const speakeasy = require('speakeasy')
const { decrypt, validatetoken, validatecode, validatesalt, validateprivatekey } = require('../../../tools/tools')
var jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')

const Enable2FA = async (req, res) => {
    let connection

    try {
        //CHANGE ALLAT
        const oldsensitivedatatoken = req?.cookies?.sensitivedatatoken
        const data2 = await GetTokenData(req, oldsensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step == null || data2.step != 1) return res.status(400).json({message: "Invalid token"})

        const code = req?.body?.code
        const privatekey = req?.body?.privatekey
        const salt = req?.body?.salt
        if (!validateprivatekey(privatekey))  return res.status(400).json({ message: "Invalid key format" })
        if (!validatesalt(salt)) return res.status(400).json({ message: "Invalid salt format" })
        if (!validatecode(code)) return res.status(400).json({ message: "Invalid code format" })
        
        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })
        
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT 2FAsecret, 2FA, username, email_encrypted
            FROM users
            WHERE id=?
            FOR UPDATE
            `, [data.id])

        if (request == null) return res.status(400).json({message: "User not found"})

        if (request["2FA"] == true) return res.status(400).json({message: "2FA already enabled"})
        if (request["2FAsecret"] == "") return res.status(400).json({message: "Invalid request"})

        let secret = decrypt(request["2FAsecret"], process.env.SECRET_ENCRYPTION_KEY)

        const isVerified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code
        })

        if (!isVerified) return res.status(400).json({message: "Invalid code"})

        await connection.query(`
            UPDATE users
            SET 2FA=1, messagekey_encrypted=?, messagesalt=?
            WHERE id=?
            `, [privatekey, salt, data.id])

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

        await connection.query(`
            DELETE FROM tokens
            WHERE value=? AND userid=? AND type=?
        `, [data2.jti, data.id, "sensitivedata"])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [data.id, 'sensitivedata', sensitivedatatokenjti, sensitivedatadate.toISOString()])

        const decryptedemail = decrypt(request.email_encrypted, process.env.EMAIL_ENCRYPTION_KEY)

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + decryptedemail + '>',
            subject: "2FA has been enabled on your account",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">2FA has successfully been enabled on your account !</h2>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not initiate this, please contact our support team to get this resolved.
                </h3>
            </div>
            `,
        })

        await connection.commit()
        return res.status(200).json({message: "2FA successfully enabled"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Enable2FA }