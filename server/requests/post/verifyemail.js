const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { GetTokenData } = require('../../get/gettokendata')

const VerifyEmail = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.token) return res.status(400).json("Error")


    const connection = await db.getConnection()
    try {
        const data = await GetTokenData(req, req.body.token, "verifyemail")
        if (!data || !data.id || !data.jti || !data.email) return res.status(400).json("Invalid link")

        const [[request]] = await connection.query(`
            SELECT value, id, userid
            FROM tokens
            WHERE userid=? AND value=? AND type=?
            FOR UPDATE
            `, [data.id, data.jti, "signup"])

        if (!request) return res.status(400).json("Error")

        await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [request.id])

        await connection.query(`
            UPDATE users
            SET verified=1
            WHERE id=?
            `, [request.userid])

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