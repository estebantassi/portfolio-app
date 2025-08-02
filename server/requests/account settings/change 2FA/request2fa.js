require('dotenv').config()
const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { encrypt, validatetoken } = require('../../../tools/tools')

const Request2FA = async (req, res) => {

    let connection
    try {
        //CHANGE ALLAT
        const sensitivedatatoken = req?.cookies?.sensitivedatatoken
        const data2 = await GetTokenData(req, sensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step == null || data2.step != 1) return res.status(400).json({message: "Invalid token"})

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const secret = speakeasy.generateSecret({ name: 'Portfolio' })
        let cryptedsecret = encrypt(secret.base32, process.env.SECRET_ENCRYPTION_KEY)
    
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT 2FAsecret, 2FA
            FROM users
            WHERE id=?
            FOR UPDATE
            `, [data.id])

        if (request == null) {
            await connection.rollback()
            return res.status(400).json({message: "User not found"})
        }

        if (request["2FA"] == true) {
            await connection.rollback()
            return res.status(400).json({message: "2FA already enabled"})
        }

        await connection.query(`
            UPDATE users
            SET 2FAsecret=?
            WHERE id=?
            `, [cryptedsecret, data.id])

        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err || data_url == null) {
                connection.rollback()
                return res.status(400).json({message: "Error generating QR code"})
            }

            connection.commit()
            return res.status(200).json({
                message: "Please scan the QR code on your authenticator app",
                qrcode: data_url,
                encrypted2FAsecret: cryptedsecret
            })
        })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Request2FA }