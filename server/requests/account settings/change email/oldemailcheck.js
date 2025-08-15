var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { v4: uuidv4 } = require('uuid')
const { validateemail, validateusername } = require('../../../tools/tools')
const transporter = require('../../../config/mailsender').transporter

const OldEmailCheck = async (req, res) => {

    try {
        const data = await GetTokenData(req, req?.body?.token, "oldemailcheck")
        if (data?.oldemail == null || data?.newemail == null || data?.username == null) return res.status(400).json({message: "Invalid link"})

        if (!validateemail(data.oldemail)) return res.status(400).json({ message: "Invalid email format" })
        if (!validateemail(data.newemail)) return res.status(400).json({ message: "Invalid email format" })

        if (!validateusername(data.username)) return res.status(400).json({message: "Invalid username format"})
    
        await db.query(`
            DELETE FROM tokens
            WHERE type=? AND value=? AND userid=?
        `, ["oldemailcheck", data.jti, data.id])

        const verifyjti = uuidv4()
        const verifytoken = jwt.sign({ oldemail: data.oldemail, newemail: data.newemail, id: data.id, jti: verifyjti }, process.env.NEWEMAILCHECK_TOKEN_SECRET)
   
        const verificationDurationMs = process.env.NEWEMAILCHECK_TOKEN_DURATION * 60 * 60 * 1000
        const verificationdate = new Date(Date.now() + verificationDurationMs)

        await db.query(`
            INSERT INTO tokens (type, value, userid, expires_at)
            VALUES (?, ?, ?, ?)
        `, ["newemailcheck", verifyjti, data.id, verificationdate.toISOString()])

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: data.username + ' <' + data.newemail + '>',
            subject: "Confirm new email address",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">Here is your verification link:</h2>
                <a href="http://localhost:5173/newemailcheck/${verifytoken}" style="margin-top: 10; color: #2c3e50;">CONFIRM</a>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not initiate this, please contact our support team to get this resolved.
                </h3>
            </div>
            `,
        })

        return res.status(200).json({message: "An email has been sent to your new email"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { OldEmailCheck }