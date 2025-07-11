var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../../config/database')
const { getClientIp, getGeoFromIp } = require('../../../config/geo')
const { GetTokenData } = require('../../get/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../../config/mailsender').transporter
const { encrypt, decrypt } = require('../../../tools/tools')

const RequestPasswordChange = async (req, res) => {

    if (req.cookies == null || req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Missing token"})
    if (req.body == null || req.body.salt == null || req.body.privatekey == null || req.body.srpSalt == null || req.body.srpVerifier == null) return res.status(400).json({message: "Missing data"})

    //DO CHECKS HERE

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json({message: "Invalid token"})
    const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
    if (data2 == null || data2.step < 1 || data2.step > 2) return res.status(400).json({message: "Invalid token"})

    try {
        const [[request]] = await db.query(`
            SELECT email_encrypted, username, 2FA
            FROM users
            WHERE id=?
        `, [data.id])
        
        if (request == null || request.email_encrypted == null || request.username == null || request["2FA"] == null) return res.status(400).json({message: "User not found"})
        if (data2.step == 1 && request["2FA"] == 1) return res.status(400).json({message: "Forbidden"})

        const verifyjti = uuidv4()
        const verifytoken = jwt.sign({
            id: data.id,
            jti: verifyjti,
            srpSalt: req.body.srpSalt,
            srpVerifier: req.body.srpVerifier,
            salt: req.body.salt,
            privatekey: req.body.privatekey
        }, process.env.PASSWORDEMAILCHECK_TOKEN_SECRET)
                    
        const verificationDurationMs = process.env.PASSWORDEMAILCHECK_TOKEN_DURATION * 60 * 60 * 1000
        const verificationdate = new Date(Date.now() + verificationDurationMs)

        const decryptedemail = decrypt(request.email_encrypted, process.env.EMAIL_ENCRYPTION_KEY)

        await db.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, ?)
        `, ["passwordemailcheck", verifyjti, data.id, verificationdate])
        
        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + decryptedemail + '>',
            subject: "Confirm password change",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">Here is your verification link:</h2>
                <a href="http://localhost:5173/passwordemailcheck/${verifytoken}" style="margin-top: 10; color: #2c3e50;">CONFIRM</a>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not initiate this, please contact our support team to get this resolved.
                </h3>
            </div>
            `,
        })
        
        return res.status(200).json({message: "An email has been sent to you to verify your identity"})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { RequestPasswordChange }