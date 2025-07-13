const { GetTokenData } = require('../get/gettokendata')
const db = require('../../config/database')
const { CheckUserExpirations } = require("../remove/checkuserexpirations")
const { validatetoken } = require('../../tools/tools')

const Logout = async (req, res) => {

    if (req.cookies == null || req.cookies.refreshtoken == null) return res.status(400).json({message: "Already logged out"})
    
    const refreshtoken = req.cookies.refreshtoken
    if (!validatetoken(refreshtoken)) return res.status(400).json({message: "Invalid token format"})

    res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
    res.clearCookie("accesstoken", { path: "/auth" })

    try {
        const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        await db.query(`
            DELETE FROM tokens
            WHERE userid=? AND value=? AND type=?
            `, [data.id, data.jti, 'refresh'])

        const accesstoken = req.cookies.accesstoken

        if (accesstoken && validatetoken(accesstoken)) {
            try {
                const data2 = await GetTokenData(req, accesstoken, "access")
                if (data2 != null && data2.jti != null) {
                    await db.query(`
                    DELETE FROM tokens
                    WHERE userid=? AND value=? AND type=?
                `, [data.id, data2.jti, 'access'])
                }
            } catch { }
        }

        CheckUserExpirations(data.id)

        return res.status(200).json({message: "Successfully logged out"})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Logout }