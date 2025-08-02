var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../../config/mailsender').transporter
const { decrypt, hash, validateemail } = require('../../../tools/tools')

const RequestEmailChange = async (req, res) => {

    try {
        if (req.cookies == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Wrong request"})
        if (req.body == null || req.body.newemail == null || req.body.newemailcheck == null) return res.status(400).json({message: "Please fill out all the necessary fields"})

        const newemail = req.body.newemail
        const newemailcheck = req.body.newemailcheck

        if (newemail != newemailcheck) return res.status(400).json({message: "Emails don't match"})

        const emailtest = validateemail(newemail)
        if (emailtest.valid == false) return res.status(400).json({ message: emailtest.message })

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })
        const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step < 1 || data2.step > 2) return res.status(400).json({message: "Invalid token"})
    
        const hashednewemail = hash(newemail, process.env.EMAIL_HASH_KEY)
        const [[request]] = await db.query(`
            SELECT id
            FROM users
            WHERE email_hash=?
        `, [hashednewemail])

        if (request != null) return res.status(400).json({message: "This email is already taken"})

        const [[request2]] = await db.query(`
            SELECT email_encrypted, username, 2FA
            FROM users
            WHERE id=?
        `, [data.id])

        if (request2 == null || request2.email_encrypted == null || request2.username == null || request2["2FA"] == null) return res.status(400).json({message: "User not found"})
        if (data2.step == 1 && request2["2FA"] == 1) return res.status(400).json({message: "Forbidden"})

        const decryptedemail = decrypt(request2.email_encrypted, process.env.EMAIL_ENCRYPTION_KEY)

        const verifyjti = uuidv4()
        const verifytoken = jwt.sign({ oldemail: decryptedemail, newemail: newemail, id: data.id, jti: verifyjti, username: request2.username }, process.env.OLDEMAILCHECK_TOKEN_SECRET)

                    
        const verificationDurationMs = process.env.OLDEMAILCHECK_TOKEN_DURATION * 60 * 60 * 1000
        const verificationdate = new Date(Date.now() + verificationDurationMs)

        await db.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, ?)
        `, ["oldemailcheck", verifyjti, data.id, verificationdate.toISOString()])

        
        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request2.username + ' <' + decryptedemail + '>',
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
        
        return res.status(200).json({message: "An email has been sent to you to verify your identity"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { RequestEmailChange }