var jwt = require('jsonwebtoken')
require('dotenv').config()
const db = require('../../config/database')
const { getClientIp } = require('../../config/geo')
const bcrypt = require('bcrypt')
const { validateuuid } = require('../../tools/tools')
const { setCachedValue, getCachedValue, deleteCachedValue } = require('../../config/redis')


const GetTokenData = async (req, token, type) => {
    try {
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
    
        const decode = jwt.verify(token, secret)
        if (decode == null || decode.jti == null || decode.id == null) return null
        if (isNaN(decode.id) || !validateuuid(decode.jti)) return null

        let cachedtoken
        if (type == "access") cachedtoken = await getCachedValue(`${type}/${decode.id}/${decode.jti}`)

        if (cachedtoken == null)
        {
            const [requests] = await db.query(`
                SELECT userid, value, expires_at, ip, id
                FROM tokens
                WHERE type=? AND value=? AND userid=?
                LIMIT 1
            `, [type, decode.jti, decode.id])

            cachedtoken = requests[0]
            if (cachedtoken == null) return null

            if (type == "access"){
                await setCachedValue(`${type}/${decode.id}/${cachedtoken.value}`, process.env.ACCESS_TOKEN_DURATION * 60 + 10, JSON.stringify({
                    id: decode.id,
                    tokenid: cachedtoken.id,
                    jti: cachedtoken.value,
                    type,
                    expires_at: cachedtoken.expires_at,
                    ip: cachedtoken.ip
                }))
            }
        } else {
            cachedtoken = JSON.parse(cachedtoken)
        }

        if (cachedtoken.expires_at == null || cachedtoken.id == null) return null

        if (new Date(cachedtoken.expires_at) < new Date())
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
            `, [type, decode.jti, cachedtoken.id, decode.id])

            if (type == "access") await deleteCachedValue(`${type}/${decode.id}/${cachedtoken.jti}`)

            return null
        }

        if (type == "refresh" || type == "access")
        {
            if (decode.ip == null || cachedtoken.ip == null) return null

            const ip = getClientIp(req)
            const match = await bcrypt.compare(ip, cachedtoken.ip)
            if (!match) return null
        }

        decode.tokenid = cachedtoken.id
        return decode
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return null
    }
}

module.exports = { GetTokenData }