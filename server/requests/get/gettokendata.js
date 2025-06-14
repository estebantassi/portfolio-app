var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp } = require('../../config/geo')

const GetTokenData = async (req, token, type) => {
    const secretMap = {
        access: process.env.ACCESS_TOKEN_SECRET,
        refresh: process.env.REFRESH_TOKEN_SECRET,
        temp: process.env.TEMP_TOKEN_SECRET,
        verifyemail: process.env.VERIFYEMAIL_TOKEN_SECRET,
    }
    const secret = secretMap[type]
    if (secret == null) return null

    try {
        const decode = jwt.verify(token, secret)
        if (decode == null) return null

        if (type == "refresh" || type == "access") {
            if (decode.jti == null || decode.id == null || decode.ip == null) return null

            const [[request]] = await db.query(`
                SELECT id, value, expires_at
                FROM tokens
                WHERE type=? AND value=? AND userid=?
            `, [type, decode.jti, decode.id])

            if (request == null || request.expires_at == null || new Date(request.expires_at) < new Date()) return null

            const ip = getClientIp(req)
            if (ip != decode.ip) return null
        }

        return decode
    } catch (err) {
        return null
    }
}

module.exports = { GetTokenData }