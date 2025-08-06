require('dotenv').config()
const db = require('../../config/database')
const { deleteCachedValue } = require('../../config/redis')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')

const LogoutAllUsers = async (req, res) => {

    let connection
    try {
        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const data2 = await GetTokenData(req, req?.cookies?.sensitivedatatoken, "sensitivedata")
        if (data2?.step != 1 && data2?.step != 2) return res.status(401).json({ message: "Authentication required" })
    
        const [[request]] = await db.query(`
            SELECT email_encrypted, username, 2FA
            FROM users
            WHERE id=?
        `, [data.id])
        
        if (request.length == 0) return res.status(400).json({message: "User not found"})
        if (data2.step == 1 && request["2FA"] == 1) return res.status(400).json({message: "Forbidden"})

        connection = await db.getConnection()
        await connection.beginTransaction()

        const [accesstokens] = await connection.query(`
            SELECT value
            FROM tokens
            WHERE userid=?
            FOR UPDATE
        `, [data.id])

        for (const token in accesstokens) try { deleteCachedValue(`access/${data.id}/${token['value']}`) } catch {}

        await connection.query(`
            DELETE FROM tokens
            WHERE userid=?
        `, [data.id])

        await connection.commit()
        
        return res.status(200).json({message: "Logged out all sessions"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { LogoutAllUsers }