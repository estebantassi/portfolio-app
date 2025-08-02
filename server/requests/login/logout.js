const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const db = require('../../config/database')
const { CheckUserExpirations } = require("../../tools/helper functions/checkuserexpirations")
const { validatetoken } = require('../../tools/tools')
require('dotenv').config()

const Logout = async (req, res) => {

    try {
        res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/auth" })
        
        const data = req.accesstokendata
        const data2 = req.refreshtokendata

        if (data2 != null)
        {
            await db.query(`
                DELETE FROM tokens
                WHERE userid=? AND value=? AND type=?
            `, [data2.id, data2.jti, 'refresh'])
        }

        if (data != null)
        {
            await db.query(`
                DELETE FROM tokens
                WHERE userid=? AND value=? AND type=?
            `, [data.id, data.jti, 'access'])
        }

        if (data != null) CheckUserExpirations(data.id)
        else if (data2 != null) CheckUserExpirations(data2.id)

        return res.status(200).json({message: "Successfully logged out"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Logout }