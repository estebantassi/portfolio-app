const { GetTokenData } = require('../../tools/gettokendata')
const db = require('../../config/database')

const Logout = async (req, res) => {

    if (!req.cookies || !req.cookies.refreshtoken) return res.status(400).json("Already logged out")

    res.clearCookie("refreshtoken", { path: "/refreshtoken" })
    res.clearCookie("accesstoken", { path: "/" })

    try {
        const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
        if (!data || !data.id) return res.status(400).json("Invalid token")

        await db.query(`
            DELETE FROM tokens
            WHERE userid=? AND value=? AND type=?
            `, [data.id, req.cookies.refreshtoken, 'refresh'])

        if (req.cookies.accesstoken)
        {
            try {
            await db.query(`
                DELETE FROM tokens
                WHERE userid=? AND value=? AND type=?
                `, [data.id, req.cookies.accesstoken, 'access'])
            } catch (err) {}
        }

        return res.status(200).json("Successfully logged out")
    } catch (err) {
        return res.status(400).json("Error logging you out")
    }
}

module.exports = { Logout }