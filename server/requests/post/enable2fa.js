require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const transporter = require('../../config/mailsender').transporter
const speakeasy = require('speakeasy')
const { decrypt, encrypt } = require('../../tools/tools')

const Enable2FA = async (req, res) => {

    if (req.cookies == null || req.body == null || req.body.code == null) return res.status(400).json({message: "Wrong request"})
    if (req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Missing token"})

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json({message: "Invalid token"})
    const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
    if (data2 == null) return res.status(400).json({message: "Invalid token"})

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT 2FAsecret, 2FA, username, email_encrypted
            FROM users
            WHERE id=?
            FOR UPDATE
            `, [data.id])

        if (request == null || request["2FAsecret"] == null || request["2FA"] == null || request.username == null || request.email_encrypted == null)
            return res.status(400).json({message: "User not found"})

        if (request["2FA"] == true) return res.status(400).json({message: "2FA already enabled"})
        if (request["2FAsecret"] == "") return res.status(400).json({message: "Invalid request"})

        let secret = decrypt(request["2FAsecret"], process.env.SECRET_ENCRYPTION_KEY)

        const isVerified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: req.body.code
        })

        if (!isVerified) return res.status(400).json({message: "Invalid code"})

        await connection.query(`
            UPDATE users
            SET 2FA=1
            WHERE id=?
            `, [data.id])

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
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Enable2FA }