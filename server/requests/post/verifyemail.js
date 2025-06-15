const db = require('../../config/database')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { GetTokenData } = require('../get/gettokendata')

const VerifyEmail = async (req, res) => {

    if (req.body == null || req.body.token == null) return res.status(400).json("Missing token")

    let connection
    try {
        connection = await db.getConnection()
        const data = await GetTokenData(req, req.body.token, "verifyemail")
        if (data == null || data.email == null) return res.status(400).json("Invalid link")

        const [requests] = await connection.query(`
            SELECT value, id, userid, expires_at
            FROM tokens
            WHERE userid=? AND value=? AND type=?
            FOR UPDATE
            `, [data.id, data.jti, "signup"])

        const request = requests[0]
        if (request == null || request.id == null || request.userid == null || request.expires_at == null) {
            await connection.rollback()
            return res.status(400).json("Error")
        }
        
        if (new Date(request.expires_at) < new Date()) {
            await connection.rollback()
            return res.status(400).json("Verification expired, the account you created will be deleted within 24 hours")
        }

        await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [request.id])

        await connection.query(`
            UPDATE users
            SET verified=1
            WHERE id=?
            `, [request.userid])

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
        return res.status(200).json({ message: "Email verified" })
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }

}

module.exports = { VerifyEmail }