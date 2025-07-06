var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../config/mailsender').transporter
const { encrypt, decrypt } = require('../../tools/tools')

const PasswordEmailCheck = async (req, res) => {

    if (req.body == null || req.body.token == null) return res.status(400).json({message: "Missing token"})

    const data = await GetTokenData(req, req.body.token, "passwordemailcheck")

    if (data == null || data.newpassword == null || data.salt == null || data.privatekey == null) return res.status(400).json({message: "Invalid link"})

    try {
        const [[request]] = await db.query(`
            SELECT email_encrypted, username, password
            FROM users
            WHERE id=?
        `, [data.id])

        if (request == null || request.email_encrypted == null || request.username == null || request.password == null) return res.status(400).json({message: "User not found"})

        const match = await bcrypt.compare(data.newpassword, request.password)
        if (match) return res.status(400).json({message: "You can't use the same password"})

        const decryptedemail = decrypt(request.email_encrypted, process.env.EMAIL_ENCRYPTION_KEY)

        const passwordsalt = await bcrypt.genSalt()
        const cryptedpassword = await bcrypt.hash(data.newpassword, passwordsalt)
        
        await db.query(`
            UPDATE users
            SET password=?, messagekey_encrypted=?, messagesalt=?
            WHERE id=?
            `, [cryptedpassword, data.privatekey, data.salt, data.id])        

        await db.query(`
            DELETE FROM tokens
            WHERE type=? AND value=? AND userid=?
        `, ["passwordemailcheck", data.jti, data.id])

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + decryptedemail + '>',
            subject: "Your password has been changed",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">Your password has been changed.</h2>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not initiate this, please contact our support team to get this resolved.
                </h3>
            </div>
            `,
        })

        return res.status(200).json({message: "Password changed"})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { PasswordEmailCheck }