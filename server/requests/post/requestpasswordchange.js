var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../config/mailsender').transporter

const RequestPasswordChange = async (req, res) => {

    if (req.cookies == null || req.body == null) return res.status(400).json("Wrong request")
    if (req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json("Missing token")
    if (req.body.password == null || req.body.newpassword == null || req.body.newpasswordcheck == null) return res.status(400).json("Please fill out all the necessary fields")

    if (req.body.newpassword != req.body.newpasswordcheck) return res.status(400).json("Passwords don't match")

    if (req.body.newpassword.length > process.env.MAX_PASSWORD_LENGTH) return res.status(400).json("Password is too long")
    if (req.body.newpassword.length < process.env.MIN_PASSWORD_LENGTH) return res.status(400).json("Password is too short")

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json("Invalid token")
    const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
    if (data2 == null) return res.status(400).json("Invalid token")

    try {
        const [[request]] = await db.query(`
            SELECT email, username, password
            FROM users
            WHERE id=?
        `, [data.id])
        
        if (request == null || request.email == null || request.username == null || request.password == null) return res.status(400).json("User not found")
            
        const match = await bcrypt.compare(req.body.newpassword, request.password)
        if (match) return res.status(400).json("You can't use the same password")

        const verifyjti = uuidv4()
        const verifytoken = jwt.sign({ newpassword: req.body.newpassword, id: data.id, jti: verifyjti }, process.env.PASSWORDEMAILCHECK_TOKEN_SECRET)
                    
        const verificationDurationMs = process.env.PASSWORDEMAILCHECK_TOKEN_DURATION * 60 * 60 * 1000
        const verificationdate = new Date(Date.now() + verificationDurationMs)

        await db.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, ?)
        `, ["passwordemailcheck", verifyjti, data.id, verificationdate])
        
        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + request.email + '>',
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
        
        return res.status(200).json("An email has been sent to you to verify your identity")
    } catch (err) {
        return res.status(500).json("An error occured, please try again later")
    }
}

module.exports = { RequestPasswordChange }