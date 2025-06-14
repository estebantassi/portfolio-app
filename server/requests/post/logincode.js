const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../../get/gettokendata')
const { v4: uuidv4 } = require('uuid')

const LoginCode = async (req, res) => {

    if (!req.body || !req.cookies || !req.body.code || !req.cookies.temptoken) return res.status(400).json("Please fill out all the necessary fields")

    const connection = await db.getConnection()
    try {
        await connection.beginTransaction()

        const data = await GetTokenData(req, req.cookies.temptoken, "temp")
        if (!data) {
            connection.rollback()
            return res.status(400).json("Invalid code")
        }

        const [[request]] = await connection.query(`
            SELECT users.id AS userid, username, email, value, expires_at, tokens.id AS tokenid
            FROM tokens
            INNER JOIN users ON tokens.userid = users.id
            WHERE userid = ? AND value=?
            FOR UPDATE
            `, [data.id, req.body.code])

        if (!request || !request.userid || !request.tokenid || !request.username || !request.email) {
            connection.rollback()
            return res.status(400).json("Invalid code")
        }

        const ip = getClientIp(req)
        const geo = getGeoFromIp(ip)

        res.clearCookie("refreshtoken", { path: "/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/auth" })
        res.clearCookie("logintoken", { path: "/logintoken" })
        
        const accessdate = new Date(Date.now() + accessDurationMs)
        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000
        const accesstokenjti = uuidv4()
        var accesstoken = jwt.sign({ id: request.userid, ip: ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth",
            maxAge: accessDurationMs
        })

        const [[tokenrequest]] = await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.userid, 'access', accesstokenjti, accessdate])

        if (!tokenrequest || !tokenrequest.id)
        {
            await connection.rollback()
            return res.status(400).json("Error")
        }

        const refreshdate = new Date(Date.now() + refreshDurationMs)
        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const refreshtokenjti = uuidv4()
        var refreshtoken = jwt.sign({ id: request.userid, ip: ip, jti: refreshtokenjti, accesstokenid: tokenrequest.id }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/refreshtoken",
            maxAge: refreshDurationMs
        })

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.userid, 'refresh', refreshtokenjti, refreshdate])

        await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [request.tokenid])

        await transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + request.email + '>',
            subject: "New login on your account",
            html: "<p>Hello ! Someone logged into your account ! If it's not you, there's an issue !</p>",
        })

        await connection.commit()
        return res.status(200).json({ message: "Successfully logged in", user: { username: request.username, id: request.userid } })
    } catch (err) {
        await connection.rollback()
        return res.status(400).json("An error occured, please try again later")
    } finally {
        connection.release()
    }
}

module.exports = { LoginCode }