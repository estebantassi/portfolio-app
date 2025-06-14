const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { generatelogincode } = require("../../tools/tools")

const Login = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.email || !req.body.password) return res.status(400).json("Please fill out all the necessary fields")

    const email = req.body.email
    const password = req.body.password

    const connection = await db.getConnection()
    try {
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT password, id, verified
            FROM users
            WHERE email=?
            FOR UPDATE
            `, [email])

        if (!request) return res.status(400).json("User not found")

        if (request.verified == 0) return res.status(400).json("Your email isn't verified, please check your inbox")

        const match = await bcrypt.compare(password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        const code = generatelogincode()

        const tempDurationMs = Number(process.env.TEMP_TOKEN_DURATION) * 60 * 60 * 1000
        const temptoken = jwt.sign({ id: request.id }, process.env.TEMP_TOKEN_SECRET)
        res.cookie("temptoken", temptoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: tempDurationMs
        })

        const date = new Date()
        date.setTime(date.getTime() + tempDurationMs)

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.id, 'logincode', code, date])

        await connection.commit()

    transporter.sendMail({
        from: '"Portfolio security system" <' + process.env.EMAIL + '>',
        to: request.username + ' <' + email + '>',
        subject: "Login code",
        html: `
        <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
            <h2 style="color: black;">Here is your login code:</h2>
            <h1 style="margin-top: 10; color: #2c3e50;">${code}</h1>
            <h3 style="margin-top: 20px; color: black;">
                If you did not request this code, please contact our support team and change your password.
            </h3>
        </div>
        `,
    })

        return res.status(200).json({ message: "A login code has been sent to your email" })
    } catch (err) {
        await connection.rollback()
        return res.status(400).json("An error occured, please try again later")
    } finally {
        connection.release()
    }

}

module.exports = { Login }