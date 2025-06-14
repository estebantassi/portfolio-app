const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { GetTokenData } = require("../../tools/gettokendata")
const { generatelogincode } = require("../../tools/tools")
const { getClientIp, getGeoFromIp } = require('../../config/geo')

const UpdateAccessToken = async (req, res) => {
    if (!req.cookies) return res.status(400).json("Wrong request")
    if (!req.cookies.refreshtoken) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
    if (data == null) return res.status(400).json("Invalid token")

    const connection = await db.getConnection()
    try {
        await connection.beginTransaction()

        const [[newrequest]] = await connection.query(`
            SELECT value, id
            FROM tokens
            WHERE value=? AND type=? AND userid=?
            FOR UPDATE
        `, [req.cookies.refreshtoken, 'refresh', data.id])

        if (!newrequest) return res.status(400).json("User not found")

        const ip = getClientIp(req)


        res.clearCookie("refreshtoken", { path: "/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/" })

        var accesstoken = jwt.sign({ id: data.id, ip: ip }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: 10 * 1000
        })

        var refreshtoken = jwt.sign({ id: data.id, ip: ip }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/refreshtoken",
            maxAge: process.env.REFRESH_TOKEN_DURATION * 60 *  60 * 1000
        })

        await connection.query(`
            UPDATE tokens
            SET value=?, expires_at=NOW() + INTERVAL ` + process.env.REFRESH_TOKEN_DURATION + ` HOUR
            WHERE id=?
            `, [refreshtoken, newrequest.id])

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, NOW() + INTERVAL 30 SECOND)
        `, [data.id, 'access', accesstoken])

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