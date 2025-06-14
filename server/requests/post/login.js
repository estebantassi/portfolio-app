const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { generatelogincode } = require("../../tools/tools")
const { v4: uuidv4 } = require('uuid')

const Login = async (req, res) => {

    if (req.body == null || req.body.email == null || req.body.password == null) return res.status(400).json("Please fill out all the necessary fields")

    const email = req.body.email
    const password = req.body.password

    
    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT password, id, verified
            FROM users
            WHERE email=?
            FOR UPDATE
            `, [email])

        if (request == null || request.password == null || request.verified == null || request.id == null) {
            await connection.rollback()
            return res.status(400).json("User not found")
        }

        if (request.verified === 0) {
            await connection.rollback()
            return res.status(400).json("Your email isn't verified, please check your inbox")
        }

        const match = await bcrypt.compare(password, request.password)
        if (!match) {
            await connection.rollback()
            return res.status(400).json("Wrong password")
        }

        const code = generatelogincode()

        const tempDurationMs = Number(process.env.TEMP_TOKEN_DURATION) * 60 * 60 * 1000
        const date = new Date(Date.now() + tempDurationMs)
        const temptokenjti = uuidv4()
        const temptoken = jwt.sign({ id: request.id, jti: temptokenjti }, process.env.TEMP_TOKEN_SECRET)
        res.cookie("logintoken", temptoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/logintoken",
            maxAge: tempDurationMs
        })

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.id, 'logincode', code, date])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.id, 'logintoken', temptokenjti, date])

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

        await connection.commit()
        return res.status(200).json("A login code has been sent to your email" )
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }

}

module.exports = { Login }