const db = require('../../config/database')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { GetTokenData } = require('../get/gettokendata')

const VerifyEmail = async (req, res) => {

    if (req.body == null || req.body.token == null) return res.status(400).json({message: "Missing token"})

    const data = await GetTokenData(req, req.body.token, "signup")
    if (data == null || data.email == null) return res.status(400).json({message: "Invalid link"})

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [data.tokenid])

        await connection.query(`
            UPDATE users
            SET verified=1, tag=?
            WHERE id=?
            `, [data.id, data.id])

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

        await connection.commit()
        return res.status(200).json({message: "Email verified"})
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }

}

module.exports = { VerifyEmail }