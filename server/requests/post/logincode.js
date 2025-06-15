const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../get/gettokendata')
const { v4: uuidv4 } = require('uuid')

const LoginCode = async (req, res) => {

    if (req.body == null || req.cookies == null || req.body.code == null || req.cookies.logintoken == null) return res.status(400).json("Please fill out all the necessary fields")

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const data = await GetTokenData(req, req.cookies.logintoken, "temp")
        if (data == null || data.jti == null || data.id == null) {
            connection.rollback()
            return res.status(400).json("Invalid code")
        }

        const [[request2]] = await connection.query(`
            SELECT value, id
            FROM tokens
            WHERE value=? AND userid=? AND type=?
            FOR UPDATE
            `, [data.jti, data.id, 'logintoken'])

        if (request2 == null || request2.id == null) {
            connection.rollback()
            return res.status(400).json("Invalid code")
        }

        const [requests] = await connection.query(`
            SELECT users.id AS userid, username, email, value, expires_at, tokens.id AS tokenid
            FROM tokens
            INNER JOIN users ON tokens.userid = users.id
            WHERE userid = ? AND value=? AND type=?
            FOR UPDATE
            `, [data.id, req.body.code, 'logincode'])

        const request = requests[0]

        if (request == null || request.userid == null || request.tokenid == null || request.username == null || request.email == null || request.expires_at == null) {
            connection.rollback()
            return res.status(400).json("Invalid code")
        }

        if (new Date(request.expires_at) < new Date()) {
            connection.rollback()
            return res.status(400).json("Code expired")
        }

        const ip = getClientIp(req)
        const geo = getGeoFromIp(ip)

        res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/auth" })
        res.clearCookie("logintoken", { path: "/logintoken" })

        const ipsalt = await bcrypt.genSalt()
        const cryptedip = await bcrypt.hash(ip, ipsalt)

        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000
        const accessdate = new Date(Date.now() + accessDurationMs)
        const accesstokenjti = uuidv4()
        var accesstoken = jwt.sign({ id: request.userid, ip: ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth",
            maxAge: accessDurationMs
        })

        const [tokenrequest] = await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at, ip)
            VALUES (?, ?, ?, ?, ?)
        `, [request.userid, 'access', accesstokenjti, accessdate, cryptedip])

        if (tokenrequest == null || tokenrequest.insertId == null) {
            await connection.rollback()
            return res.status(400).json("Error")
        }

        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const refreshdate = new Date(Date.now() + refreshDurationMs)
        const refreshtokenjti = uuidv4()
        var refreshtoken = jwt.sign({ id: request.userid, ip: ip, jti: refreshtokenjti, accesstokenid: tokenrequest.insertId }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth/refreshtoken",
            maxAge: refreshDurationMs
        })

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at, ip)
            VALUES (?, ?, ?, ?, ?)
        `, [request.userid, 'refresh', refreshtokenjti, refreshdate, cryptedip])


        try {
            await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [request.tokenid])
        } catch (err) { }

        try {
            await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [request2.id])
        } catch (err) { }

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + request.email + '>',
            subject: "New login on your account",
            html: "<p>Hello ! Someone logged into your account ! If it's not you, there's an issue !</p>",
        })

        await connection.commit()
        return res.status(200).json({ message: "Successfully logged in", user: { username: request.username, id: request.userid } })
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(400).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { LoginCode }