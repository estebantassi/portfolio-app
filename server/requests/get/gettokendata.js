var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp } = require('../../config/geo')
const bcrypt = require('bcrypt')
const { validateuuid } = require('../../tools/tools')


const GetTokenData = async (req, token, type) => {
    const secretMap = {
        access: process.env.ACCESS_TOKEN_SECRET,
        refresh: process.env.REFRESH_TOKEN_SECRET,
        logintoken: process.env.TEMP_TOKEN_SECRET,
        signup: process.env.VERIFYEMAIL_TOKEN_SECRET,
        sensitivedata: process.env.SENSITIVEDATA_TOKEN_SECRET,
        oldemailcheck: process.env.OLDEMAILCHECK_TOKEN_SECRET,
        newemailcheck: process.env.NEWEMAILCHECK_TOKEN_SECRET,
        passwordemailcheck: process.env.PASSWORDEMAILCHECK_TOKEN_SECRET,
    }
    const secret = secretMap[type]
    if (secret == null) return null

    try {
        const decode = jwt.verify(token, secret)
        if (decode == null || decode.jti == null || decode.id == null) return null
        if (isNaN(decode.id) || !validateuuid(decode.jti)) return null

        const [[request]] = await db.query(`
            SELECT id, value, expires_at, ip
            FROM tokens
            WHERE type=? AND value=? AND userid=?
            LIMIT 1
        `, [type, decode.jti, decode.id])

        if (request == null || request.expires_at == null || request.id == null) return null

        if (new Date(request.expires_at) < new Date())
        {
            if (type == "refresh" && decode.accesstokenid != null)
            {
                if (isNaN(decode.accesstokenid)) return null
                
                await db.query(`
                    DELETE FROM tokens
                    WHERE type=? AND id=? AND userid=?
                `, ["access", decode.accesstokenid, decode.id])
            }

            await db.query(`
                DELETE FROM tokens
                WHERE type=? AND value=? AND id=? AND userid=?
            `, [type, decode.jti, request.id, decode.id])

            return null
        }

       

        if (type == "refresh" || type == "access")
        {
            const [[userreq]] = await db.query(`
                SELECT verified
                FROM users
                WHERE id=?
            `, [decode.id])

            if (userreq == null || userreq.verified == null || userreq.verified == 0) return null

            if (decode.ip == null || request.ip == null) return null

            const ip = getClientIp(req)
            const match = await bcrypt.compare(ip, request.ip)
            if (!match) return null
        }

        decode.tokenid = request.id
        return decode
    } catch (err) {
        return null
    }
}

module.exports = { GetTokenData }