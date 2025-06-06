const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { GetTokenData } = require('../../tools/gettokendata')

const VerifyEmail = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.token) return res.status(400).json("Error")

    

    try {
        const data = await GetTokenData(req, req.body.token, "verifyemail")
        if (data == null) return res.status(400).json("Invalid link")


        const [[request]] = await db.query(`
            SELECT verificationtoken
            FROM users
            WHERE email=?
            `, [data.email])

        if (request.verificationtoken != req.body.token) return res.status(400).json("Error")

        await db.query(`
            UPDATE users
            SET verificationtoken="", verified=1
            WHERE email=?
            `, [data.email])

    transporter.sendMail({
        from: '"Portfolio security system" <' + process.env.EMAIL + '>',
        to: 'User <' + data.email + '>',
        subject: "Account verified",
        html: `
        <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: black;">Your account has successfully been verified</h2>
        </div>
        `,
    })

        return res.status(200).json({ message: "Email verified" })
    } catch (err) {
        console.log(err)
        return res.status(400).json("An error occured, please try again later")
    }

}

module.exports = { VerifyEmail }