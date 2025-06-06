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

        if (type != "temp" && type != "verifyemail") {
            const [[request]] = await db.query(`
            SELECT accesstokens, refreshtokens
            FROM users
            WHERE id=?
        `, [decode.id])

            if (type == "access") if (!request.accesstokens.split(" , ").includes(token)) return null
            if (type == "refresh") if (!request.refreshtokens.split(" , ").includes(token)) return null

            const ip = getClientIp(req)
            if (ip != decode.ip) return null
        }

        return decode
    } catch (err) {
        return null
    }
}

module.exports = { GetTokenData }