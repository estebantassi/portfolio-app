require('dotenv').config()
const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const transporter = require('../../../config/mailsender').transporter
const speakeasy = require('speakeasy')
const { decrypt } = require('../../../tools/tools')

const Check2FAcode = async (userid, code) => {

    try {
        const [[request]] = await db.query(`
            SELECT 2FAsecret, 2FA
            FROM users
            WHERE id=?
            `, [userid])

        if (request == null || request["2FAsecret"] == null || request["2FA"] == null) return false
        if (request["2FA"] == 0) return false
        if (request["2FAsecret"] == "") return false

        let secret = decrypt(request["2FAsecret"], process.env.SECRET_ENCRYPTION_KEY)
        
        const isVerified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code
        })
        
        if (!isVerified) return false
        
        return true
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return false
    }
}

module.exports = { Check2FAcode }