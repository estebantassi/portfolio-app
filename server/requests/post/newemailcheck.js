var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const bcrypt = require('bcrypt')
const { v4: uuidv4 } = require('uuid')
const transporter = require('../../config/mailsender').transporter

const NewEmailCheck = async (req, res) => {

    if (req.body == null || req.body.token == null) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.body.token, "newemailcheck")

    if (data == null || data.oldemail == null || data.newemail == null || data.username == null) return res.status(400).json("Invalid link")

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT id
            FROM users
            WHERE email=?
        `, [data.newemail])

        if (request != null) {
            await connection.rollback()
            return res.status(400).json("This email is already taken")
        }

        const [[request2]] = await connection.query(`
            SELECT email
            FROM users
            WHERE id=?
            FOR UPDATE
        `, [data.id])

        

        if (request2 == null || request2.email == null) {
            await connection.rollback()
            return res.status(400).json("Invalid token")
        }

        if (request2.email != data.oldemail) {
            await connection.rollback()
            return res.status(400).json("Your email has been changed already")
        }

        await connection.query(`
            UPDATE users
            SET email=?
            WHERE id=?
            `, [data.newemail, data.id])

        await db.query(`
            DELETE FROM tokens
            WHERE type=? AND value=? AND userid=?
        `, ["newemailcheck", data.jti, data.id])

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: data.username + ' <' + data.oldemail + '>',
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
            to: data.username + ' <' + data.newemail + '>',
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
        return res.status(200).json("Email changed")
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { NewEmailCheck }