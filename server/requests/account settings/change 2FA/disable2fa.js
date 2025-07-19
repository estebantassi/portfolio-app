require('dotenv').config()
const db = require('../../../config/database')
const { validatetoken, validatesalt, validateprivatekey } = require('../../../tools/tools')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const transporter = require('../../../config/mailsender').transporter
const speakeasy = require('speakeasy')

const Disable2FA = async (req, res) => {

    try {
        if (req.body == null || req.body.privatekey == null || req.body.salt == null) return res.status(400).json({message: "Missing data"})
        if (req.cookies == null || req.cookies.accesstoken == null || req.cookies.sensitivedatatoken == null) return res.status(400).json({message: "Missing token"})

        const privatekey = req.body.privatekey
        const salt = req.body.salt
        const accesstoken = req.cookies.accesstoken
        const sensitivedatatoken = req.cookies.sensitivedatatoken

        if (!validateprivatekey(privatekey)) return res.status(400).json({ message: "Invalid key format" })
        if (!validatesalt(salt)) return res.status(400).json({ message: "Invalid salt format" })
        if (!validatetoken(accesstoken)) return res.status(400).json({ message: "Invalid token format" })
        if (!validatetoken(sensitivedatatoken)) return res.status(400).json({ message: "Invalid token format" })

        const data = await GetTokenData(req, req.cookies.accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})
        const data2 = await GetTokenData(req, req.cookies.sensitivedatatoken, "sensitivedata")
        if (data2 == null || data2.step == null || data2.step != 2) return res.status(400).json({message: "Invalid token"})
    
        await db.query(`
            UPDATE users
            SET 2FA=0, 2FAsecret="", messagekey_encrypted=?, messagesalt=?
            WHERE id=?
            `, [privatekey, salt, data.id])

        return res.status(200).json({message: "2FA successfully disabled"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Disable2FA }