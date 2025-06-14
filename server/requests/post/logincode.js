const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { generatelogincode } = require("../../tools/tools")
const { GetTokenData } = require('../../tools/gettokendata')
const { v4: uuidv4 } = require('uuid')

const LoginCode = async (req, res) => {

    if (!req.body || !req.cookies) return res.status(400).json("Wrong request")
    if (!req.body.code || !req.cookies.temptoken) return res.status(400).json("Please fill out all the necessary fields")

    const code = req.body.code
    const temptoken = req.cookies.temptoken

    const connection = await db.getConnection()
    try {

        const data = await GetTokenData(req, temptoken, "temp")
        if (data == null) return res.status(400).json("Time expired")

        const [[request]] = await connection.query(`
            SELECT users.id AS userid, username, email, value, expires_at, tokens.id AS tokenid
            FROM tokens
            INNER JOIN users ON tokens.userid = users.id
            WHERE userid = ? AND value=?
            FOR UPDATE
            `, [data.id, code])

        if (!request) return res.status(400).json("Invalid code")

        //DO THIS WHEN MANUAL DATES ARE ADDED TO THE DB
        //if (new Date(request.expires_at) < new Date()) return res.status(400).json("Code expired")

        const ip = getClientIp(req)
        const geo = getGeoFromIp(ip)

        res.clearCookie("refreshtoken", { path: "/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/" })
        res.clearCookie("temptoken", { path: "/" })

        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000

        const accesstokenjti = uuidv4()
        var accesstoken = jwt.sign({ id: request.userid, ip: ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: accessDurationMs
        })

        const refreshtokenjti = uuidv4()
        var refreshtoken = jwt.sign({ id: request.userid, ip: ip, jti: refreshtokenjti }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/refreshtoken",
            maxAge: refreshDurationMs
        })

        const refreshdate = new Date()
        refreshdate.setTime(refreshdate.getTime() + refreshDurationMs)

        const accessdate = new Date()
        accessdate.setTime(accessdate.getTime() + accessDurationMs)

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.userid, 'refresh', refreshtokenjti, refreshdate])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [request.userid, 'access', accesstokenjti, accessdate])

        await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [request.tokenid])

        await connection.commit()

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + request.email + '>',
            subject: "New login on your account",
            html: "<p>Hello ! Someone logged into your account ! If it's not you, there's an issue !</p>",
        })

        return res.status(200).json({ message: "Successfully logged in", user: { username: request.username, id: request.userid } })
    } catch (err) {
        await connection.rollback()
        console.log(err)
        return res.status(400).json("An error occured, please try again later")
    } finally {
        connection.release()
    }

}

module.exports = { LoginCode }