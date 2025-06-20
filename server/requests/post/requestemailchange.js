var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../config/mailsender').transporter

const RequestEmailChange = async (req, res) => {

    if (req.cookies == null || req.body == null) return res.status(400).json("Wrong request")
    if (req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json("Missing token")
    if (req.body.newemail == null || req.body.newemailcheck == null) return res.status(400).json("Please fill out all the necessary fields")

    if (req.body.newemail != req.body.newemailcheck) return res.status(400).json("Emails don't match")

    const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    if (!emailRegexp.test(req.body.newemail)) return res.status(400).json("Email isn't valid")

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json("Invalid token")
    const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
    if (data2 == null) return res.status(400).json("Invalid token")

    try {
        const [[request]] = await db.query(`
            SELECT id
            FROM users
            WHERE email=?
        `, [req.body.newemail])

        if (request != null) return res.status(400).json("This email is already taken")

        const [[request2]] = await db.query(`
            SELECT email, username
            FROM users
            WHERE id=?
        `, [data.id])

        if (request2 == null) return res.status(400).json("Invalid token")


        const verifyjti = uuidv4()
        const verifytoken = jwt.sign({ oldemail: request2.email, newemail: req.body.newemail, id: data.id, jti: verifyjti, username: request2.username }, process.env.OLDEMAILCHECK_TOKEN_SECRET)

                    
        const verificationDurationMs = process.env.OLDEMAILCHECK_TOKEN_DURATION * 60 * 60 * 1000
        const verificationdate = new Date(Date.now() + verificationDurationMs)

        await db.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, ?)
        `, ["oldemailcheck", verifyjti, data.id, verificationdate])

        
        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request2.username + ' <' + request2.email + '>',
            subject: "Confirm email address change",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">Here is your verification link:</h2>
                <a href="http://localhost:5173/oldemailcheck/${verifytoken}" style="margin-top: 10; color: #2c3e50;">CONFIRM</a>
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

module.exports = { RequestEmailChange }