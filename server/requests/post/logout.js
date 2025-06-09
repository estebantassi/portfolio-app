const { GetTokenData } = require('../../tools/gettokendata')
const db = require('../../config/database')

const Logout = async (req, res) => {

    if (!req.cookies || !req.cookies.refreshtoken) return res.status(400).json("Already logged out")


    res.clearCookie("refreshtoken", { path: "/refreshtoken" })
    res.clearCookie("accesstoken", { path: "/" })

    const connection = await db.getConnection()
    try {
        const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
        if (!data || !data.id) return res.status(400).json("Invalid token")

        const [[request]] = await connection.query(`
            SELECT refreshtokens, accesstokens
            FROM users
            WHERE id=?
            FOR UPDATE
            `, [data.id])

        if (!request) return res.status(400).json("User doesn't exist")

        let refreshtokensarray = request.refreshtokens.split(" , ")
        const index = refreshtokensarray.indexOf(req.cookies.refreshtoken)
        if (index > -1) refreshtokensarray.splice(index, 1)

        let newrefreshtokens = ""
        refreshtokensarray.forEach(element => {
            if (element != "") {
                if (newrefreshtokens == "") newrefreshtokens = element
                else newrefreshtokens = newrefreshtokens + " , " + element
            }
        })

        let accesstokensarray = request.accesstokens.split(" , ")
        const accesstoken = req.cookies.accesstoken ? req.cookies.accesstoken : ",,,"
        const index2 = accesstokensarray.indexOf(accesstoken)
        if (index2 > -1) accesstokensarray.splice(index2, 1)

        let newaccesstokens = ""
        accesstokensarray.forEach(element => {
            if (element != "") {
                if (newaccesstokens == "") newaccesstokens = element
                else newaccesstokens = newaccesstokens + " , " + element
            }
        })

        await connection.query(`
            UPDATE users
            SET accesstokens = ?, refreshtokens = ?
            WHERE id=?
            `, [newaccesstokens, newrefreshtokens, data.id])

        await connection.commit()

        return res.status(200).json("Successfully logged out")
    } catch (err) {
        await connection.rollback()
        return res.status(400).json("Error logging you out")
    } finally {
        connection.release()
    }
}

module.exports = { Logout }