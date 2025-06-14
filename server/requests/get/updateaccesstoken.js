const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { GetTokenData } = require("../../tools/gettokendata")
const { v4: uuidv4 } = require('uuid')

const UpdateAccessToken = async (req, res) => {
    if (!req.cookies) return res.status(400).json("Wrong request")
    if (!req.cookies.refreshtoken) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
    if (!data) return res.status(400).json("Invalid token")

    const connection = await db.getConnection()
    try {
        await connection.beginTransaction()

        const [[newrequest]] = await connection.query(`
            SELECT value, id, expires_at
            FROM tokens
            WHERE value=? AND type=? AND userid=?
            FOR UPDATE
        `, [data.jti, 'refresh', data.id])

        if (!newrequest) return res.status(400).json("User not found")
        if (new Date(newrequest.expires_at) < new Date()) return res.status(400).json("Code expired")

        res.clearCookie("refreshtoken", { path: "/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/" })

        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000

        const accesstokenjti = uuidv4()
        var accesstoken = jwt.sign({ id: data.id, ip: data.ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: accessDurationMs
        })

        const refreshtokenjti = uuidv4()
        var refreshtoken = jwt.sign({ id: data.id, ip: data.ip, jti: refreshtokenjti }, process.env.REFRESH_TOKEN_SECRET)
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
            UPDATE tokens
            SET value=?, expires_at=?
            WHERE id=?
            `, [refreshtokenjti, refreshdate, newrequest.id])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [data.id, 'access', accesstokenjti, accessdate])

        await connection.commit()
        return res.status(200).json("Updated token")
    } catch (err) {
        await connection.rollback()
        return res.status(400).json("An error occured, please try again later")
    } finally {
        connection.release()
    }
}

module.exports = { UpdateAccessToken }