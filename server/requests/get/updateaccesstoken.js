const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { GetTokenData } = require("../get/gettokendata")
const { v4: uuidv4 } = require('uuid')

const UpdateAccessToken = async (req, res) => {
    console.log(req.cookies)
    if (!req.cookies || !req.cookies.refreshtoken) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
    if (!data || !data.accesstokenid) return res.status(400).json("Invalid token")

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT value, id, expires_at
            FROM tokens
            WHERE value=? AND type=? AND userid=?
            FOR UPDATE
        `, [data.jti, 'refresh', data.id])

        if (!request || !request.expires_at || !request.id || new Date(request.expires_at) < new Date()) {
            await connection.rollback()
            return res.status(400).json("Token revoked")
        }

        res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/auth" })
        
        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000
        const accessdate = new Date(Date.now() + accessDurationMs)
        const accesstokenjti = uuidv4()
        var accesstoken = jwt.sign({ id: data.id, ip: data.ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth",
            maxAge: accessDurationMs
        })

        try {
            await connection.query(`
                DELETE FROM tokens
                WHERE id=?
            `, [data.accesstokenid])
        } catch (err) {}

        const [tokenrequest] = await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at)
            VALUES (?, ?, ?, ?)
        `, [data.id, 'access', accesstokenjti, accessdate])

        if (!tokenrequest || !tokenrequest.insertId)
        {
            await connection.rollback()
            return res.status(400).json("Error")
        }
        
        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const refreshdate = new Date(Date.now() + refreshDurationMs)
        const refreshtokenjti = uuidv4()
        var refreshtoken = jwt.sign({ id: data.id, ip: data.ip, jti: refreshtokenjti, accesstokenid: tokenrequest.insertId }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth/refreshtoken",
            maxAge: refreshDurationMs
        })

        await connection.query(`
            UPDATE tokens
            SET value=?, expires_at=?
            WHERE id=?
            `, [refreshtokenjti, refreshdate, request.id])

        await connection.commit()
        return res.status(200).json("Updated token")
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(400).json("An error occured, please try again later")
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { UpdateAccessToken }