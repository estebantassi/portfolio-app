require('dotenv').config()
const db = require('../../../config/database')
const { validatetoken, validatesalt, validateprivatekey } = require('../../../tools/tools')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')

const Disable2FA = async (req, res) => {

    try {
        const privatekey = req?.body?.privatekey
        const salt = req?.body?.salt
        if (!validateprivatekey(privatekey)) return res.status(400).json({ message: "Invalid key format" })
        if (!validatesalt(salt)) return res.status(400).json({ message: "Invalid salt format" })

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const data2 = await GetTokenData(req, req?.cookies?.sensitivedatatoken, "sensitivedata")
        if (data2?.step != 2) return res.status(401).json({ message: "Authentication required" })

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