const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { GetTokenData } = require('../../tools/gettokendata')

const VerifyEmail = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.token) return res.status(400).json("Error")


    const connection = await db.getConnection()
    try {
        const data = await GetTokenData(req, req.body.token, "verifyemail")
        if (data == null) return res.status(400).json("Invalid link")


        const [[request]] = await connection.query(`
            SELECT verificationtoken
            FROM users
            WHERE email=?
            FOR UPDATE
            `, [data.email])

        if (request.verificationtoken != req.body.token) return res.status(400).json("Error")

        await connection.query(`
            UPDATE users
            SET verificationtoken="", verified=1
            WHERE email=?
            `, [data.email])

        await connection.commit()

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
        await connection.rollback()
        return res.status(400).json("An error occured, please try again later")
    } finally {
        connection.release()
    }

}

module.exports = { VerifyEmail }