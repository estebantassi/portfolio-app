const { GetTokenData } = require('../get/gettokendata')
const db = require('../../config/database')

const Logout = async (req, res) => {

    if (req.cookies == null || req.cookies.refreshtoken == null) return res.status(400).json("Already logged out")

    res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
    res.clearCookie("accesstoken", { path: "/auth" })

    try {
        const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
        if (data == null) return res.status(400).json("Invalid token")

        await db.query(`
            DELETE FROM tokens
            WHERE userid=? AND value=? AND type=?
            `, [data.id, data.jti, 'refresh'])

        if (req.cookies.accesstoken) {
            try {
                const data2 = await GetTokenData(req, req.cookies.accesstoken, "access")
                if (data2 && data2.jti) {
                    await db.query(`
                    DELETE FROM tokens
                    WHERE userid=? AND value=? AND type=?
                `, [data.id, data2.jti, 'access'])
                }
            } catch (err) { }
        }

        return res.status(200).json("Successfully logged out")
    } catch (err) {
        return res.status(500).json("An error occured, please try again later")
    }
}

module.exports = { Logout }