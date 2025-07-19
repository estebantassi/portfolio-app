var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../../../config/database')
const { getClientIp, getGeoFromIp } = require('../../../../config/geo')
const { GetTokenData } = require('../../../../tools/helper functions/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../../../config/mailsender').transporter
const { encrypt, decrypt, hash, validatetoken, validateemail, validateusername } = require('../../../../tools/tools')

const NewEmailCheck = async (req, res) => {

    let connection
    try {

        if (req.body == null || req.body.token == null) return res.status(400).json({message: "Missing token"})

        const token = req.body.token
        if (!validatetoken(token)) return res.status(400).json({message: "Invalid token format"})

        const data = await GetTokenData(req, req.body.token, "newemailcheck")
        if (data == null || data.oldemail == null || data.newemail == null) return res.status(400).json({message: "Invalid link"})

        const oldemailtest = validateemail(data.oldemail)
        if (oldemailtest.valid == false) return res.status(400).json({ message: oldemailtest.message })
        const newemailtest = validateemail(data.newemail)
        if (newemailtest.valid == false) return res.status(400).json({ message: newemailtest.message })

        connection = await db.getConnection()
        await connection.beginTransaction()

        const hashedemail = hash(data.newemail, process.env.EMAIL_HASH_KEY)

        const [[request]] = await connection.query(`
            SELECT id
            FROM users
            WHERE email_hash=?
        `, [hashedemail])

        if (request != null) {
            await connection.rollback()
            return res.status(400).json({message: "This email is already taken"})
        }

        const [[request2]] = await connection.query(`
            SELECT email_encrypted, username
            FROM users
            WHERE id=?
            FOR UPDATE
        `, [data.id])

        if (request2 == null || request2.email_encrypted == null || request2.username == null) {
            await connection.rollback()
            return res.status(400).json({message: "User not found"})
        }

        const decryptedemail = decrypt(request2.email_encrypted, process.env.EMAIL_ENCRYPTION_KEY)

        if (decryptedemail != data.oldemail) {
            await connection.rollback()
            return res.status(400).json({message: "Your email has been changed already"})
        }

        const encryptedemail = encrypt(data.newemail, process.env.EMAIL_ENCRYPTION_KEY)

        await connection.query(`
            UPDATE users
            SET email_encrypted=?, email_hash=?
            WHERE id=?
            `, [encryptedemail, hashedemail, data.id])

        await connection.query(`
            DELETE FROM tokens
            WHERE type=? AND value=? AND userid=?
        `, ["newemailcheck", data.jti, data.id])

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request2.username + ' <' + data.oldemail + '>',
            subject: "Your email has been changed",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">This email will no longer be used on your account.</h2>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not initiate this, please contact our support team to get this resolved.
                </h3>
            </div>
            `,
        })

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request2.username + ' <' + data.newemail + '>',
            subject: "Your email has been changed",
            html: `
            <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: black;">This email will now be used on your account.</h2>
                <h3 style="margin-top: 20px; color: black;">
                    If you did not initiate this, please contact our support team to get this resolved.
                </h3>
            </div>
            `,
        })

        await connection.commit()
        return res.status(200).json({message: "Email changed"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { NewEmailCheck }