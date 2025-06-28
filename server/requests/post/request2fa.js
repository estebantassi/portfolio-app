require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { encryptSecret } = require('../../tools/tools')

const Request2FA = async (req, res) => {

    if (req.cookies == null) return res.status(400).json("Wrong request")
    if (req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json("Invalid token")
    const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
    if (data2 == null) return res.status(400).json("Invalid token")

    const secret = speakeasy.generateSecret({ name: 'Portfolio' })
    let cryptedsecret = encryptSecret(secret.base32, process.env.SECRET_ENCRYPTION_KEY)

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT 2FAsecret, 2FA
            FROM users
            WHERE id=?
            FOR UPDATE
            `, [data.id])

        if (request == null || request["2FA"] == null) {
            await connection.rollback()
            return res.status(400).json("User not found")
        }
        if (request["2FA"] == true) {
            await connection.rollback()
            return res.status(400).json("2FA already enabled")
        }

        await connection.query(`
            UPDATE users
            SET 2FAsecret=?
            WHERE id=?
            `, [cryptedsecret, data.id])

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err || data_url == null) {
                connection.rollback()
                return res.status(400).json("Error generating QR code" )
            }

            connection.commit()
            return res.status(200).json({
                message: "Please scan the QR code on your authenticator app",
                data: data_url
            })
        })
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Request2FA }