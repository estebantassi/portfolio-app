var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../config/database')
const { getClientIp } = require('../config/geo')

const GetTokenData = async (req, token, type) => {
    try {
        let secret = ""
        if (type == "access") secret = process.env.ACCESS_TOKEN_SECRET
        if (type == "refresh") secret = process.env.REFRESH_TOKEN_SECRET
        if (type == "temp") secret = process.env.TEMP_TOKEN_SECRET
        if (type == "verifyemail") secret = process.env.VERIFYEMAIL_TOKEN_SECRET

        const decode = jwt.verify(token, secret)

        if (!decode.iat) return null

        if (type == "refresh" || type == "access") {
            const [[newrequest]] = await db.query(`
                SELECT id, value
                FROM tokens
                WHERE type=? AND value=? AND userid=?
            `, [type, token, decode.id])
            if (!newrequest) return null

            const ip = getClientIp(req)
            if (ip != decode.ip) return null
        }

        return decode
    } catch (err) {
        return null
    }
}

module.exports = { GetTokenData }