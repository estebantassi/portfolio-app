const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { GetTokenData } = require("../get/gettokendata")
const { v4: uuidv4 } = require('uuid')
const { CheckUserExpirations } = require("../remove/checkuserexpirations")
const { validatetoken } = require('../../tools/tools')

const UpdateAccessToken = async (req, res) => {
    if (req.cookies == null || req.cookies.refreshtoken == null) return res.status(400).json({message: "Missing token"})

    const refreshtoken = req.cookies.refreshtoken

    if (!validatetoken(refreshtoken)) return res.status(400).json({message: "Invalid token format"})

    const data = await GetTokenData(req, refreshtoken, "refresh")
    if (data == null || data.accesstokenid == null || isNaN(data.accesstokenid)) return res.status(400).json({message: "Invalid token"})

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[request]] = await connection.query(`
            SELECT value, expires_at
            FROM tokens
            WHERE value=? AND type=? AND userid=?
            LIMIT 1
            FOR UPDATE
        `, [data.jti, 'refresh', data.id])

        if (request == null || request.expires_at == null) {
            await connection.rollback()
            return res.status(400).json({message: "Token revoked"})
        }

        res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/auth" })
        
        const ipsalt = await bcrypt.genSalt()
        const cryptedip = await bcrypt.hash(data.ip, ipsalt)

        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000
        const accessdate = new Date(Date.now() + accessDurationMs)
        const accesstokenjti = uuidv4()
        const accesstoken = jwt.sign({ id: data.id, ip: data.ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
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
            INSERT INTO tokens (userid, type, value, expires_at, ip)
            VALUES (?, ?, ?, ?, ?)
        `, [data.id, 'access', accesstokenjti, accessdate, cryptedip])

        if (tokenrequest == null || tokenrequest.insertId == null)
        {
            await connection.rollback()
            return res.status(400).json({message: "Error"})
        }
        
        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const refreshdate = new Date(Date.now() + refreshDurationMs)
        const refreshtokenjti = uuidv4()
        const newrefreshtoken = jwt.sign({ id: data.id, ip: data.ip, jti: refreshtokenjti, accesstokenid: tokenrequest.insertId }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", newrefreshtoken, {
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
            `, [refreshtokenjti, refreshdate, data.id])

        CheckUserExpirations(data.id)

        await connection.commit()
        return res.status(200).json({message: "Updated token"})
    } catch (err) {
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { UpdateAccessToken }