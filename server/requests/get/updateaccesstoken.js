const db = require('../../config/database')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const { GetTokenData } = require("../../tools/gettokendata")
const { generatelogincode } = require("../../tools/tools")
const { getClientIp, getGeoFromIp } = require('../../config/geo')

const UpdateAccessToken = async (req, res) => {
    if (!req.cookies) return res.status(400).json("Wrong request")
    if (!req.cookies.refreshtoken) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.cookies.refreshtoken, "refresh")
    if (data == null) return res.status(400).json("Invalid token")

    try {
        const [[request]] = await db.query(`
            SELECT email, refreshtokens, accesstokens
            FROM users
            WHERE id=?
        `, [data.id])

        if (!request) return res.status(400).json("User not found")

        //check if the tokens are expired in the database
        let newaccesstokens = []
        for (const element of request.accesstokens.split(" , ")) {
            try {
                const decode = jwt.verify(element, process.env.ACCESS_TOKEN_SECRET)
                if (decode.exp) newaccesstokens.push(element)
            } catch (err) {
            }
        }

        let newrefreshtokens = []
        for (const element of request.refreshtokens.split(" , ")) {
            try {
                const decode = jwt.verify(element, process.env.REFRESH_TOKEN_SECRET)
                if (decode.exp) newrefreshtokens.push(element)
            } catch (err) {
            }
        }

        //Remove the refresh token we're currently using, we're going to generate a new one
        const index = newrefreshtokens.indexOf(req.cookies.refreshtoken)
        if (index > -1) newrefreshtokens.splice(index, 1)
        const ip = getClientIp(req)

        var accesstoken = jwt.sign({ id: data.id, ip: ip }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: process.env.ACCESS_TOKEN_DURATION * 60 * 60 * 1000
        })

        var refreshtoken = jwt.sign({ id: data.id, ip: ip }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/refreshtoken",
            maxAge: process.env.REFRESH_TOKEN_DURATION * 60 *  60 * 1000
        })

        let oldrefreshtokens = newrefreshtokens.slice(-2)
        oldrefreshtokens.push(refreshtoken)

        let newrefreshtokensstr = ""
        oldrefreshtokens.forEach(element => {
            if (element != "") {
                if (newrefreshtokensstr == "") newrefreshtokensstr = element
                else newrefreshtokensstr = newrefreshtokensstr + " , " + element
            }
        })

        let oldaccesstokens = newaccesstokens.slice(-2)
        oldaccesstokens.push(accesstoken)

        let newaccesstokensstr = ""
        oldaccesstokens.forEach(element => {
            if (element != "") {
                if (newaccesstokensstr == "") newaccesstokensstr = element
                else newaccesstokensstr = newaccesstokensstr + " , " + element
            }
        })

        await db.query(`
            UPDATE users
            SET accesstokens=?, refreshtokens=?
            WHERE email=?
            `, [newaccesstokensstr, newrefreshtokensstr, request.email])

        return res.status(200).json("Updated token")
    } catch (err) {
        return res.status(400).json("An error occured, please try again later")
    }
}

module.exports = { UpdateAccessToken }