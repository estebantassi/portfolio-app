const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { generatelogincode } = require("../../tools/tools")
const { GetTokenData } = require('../../tools/gettokendata')

const LoginCode = async (req, res) => {

    if (!req.body || !req.cookies) return res.status(400).json("Wrong request")
    if (!req.body.code || !req.cookies.temptoken) return res.status(400).json("Please fill out all the necessary fields")

    const code = req.body.code
    const temptoken = req.cookies.temptoken

    try {

        const data = await GetTokenData(req, temptoken, "temp")
        console.log(data)
        if (data == null) return res.status(400).json("Time expired")

        const [[request]] = await db.query(`
            SELECT logincodes, id, username, refreshtokens, accesstokens, email
            FROM users
            WHERE id=?
            `, [data.id])

        if (!request) return res.status(400).json("User not found")

        let logincodes = request.logincodes.split(" , ")
        if (!logincodes.includes(code)) return res.status(400).json("Invalid code")

        const index = logincodes.indexOf(code);
        if (index > -1) {
            logincodes.splice(index, 1)
        }
        let newlogincodes
        logincodes.forEach(element => {
            if (newlogincodes == "") newlogincodes = element
            else newlogincodes = newlogincodes + " , " + element
        })

        const ip = getClientIp(req)
        const geo = getGeoFromIp(ip)

        console.log(geo.city.names.en)
        console.log(geo.country.iso_code)

        var accesstoken = jwt.sign({ id: request.id, ip: ip }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: process.env.ACCESS_TOKEN_DURATION * 60 * 60 * 1000
        })

        var refreshtoken = jwt.sign({ id: request.id, ip: ip }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/refreshtoken",
            maxAge: process.env.REFRESH_TOKEN_DURATION * 60 * 60 * 1000
        })

        res.clearCookie("temptoken", { path: "/" })

        let oldrefreshtokens = request.refreshtokens.split(" , ").slice(-2)
        oldrefreshtokens.push(refreshtoken)

        let newrefreshtokens = ""
        oldrefreshtokens.forEach(element => {
            if (element != "") {
                if (newrefreshtokens == "") newrefreshtokens = element
                else newrefreshtokens = newrefreshtokens + " , " + element
            }
        })

        let oldaccesstokens = request.accesstokens.split(" , ").slice(-2)
        oldaccesstokens.push(accesstoken)

        let newaccesstokens = ""
        oldaccesstokens.forEach(element => {
            if (element != "") {
                if (newaccesstokens == "") newaccesstokens = element
                else newaccesstokens = newaccesstokens + " , " + element
            }
        })

        await db.query(`
            UPDATE users
            SET accesstokens=?, refreshtokens=?, logincodes=?
            WHERE email=?
            `, [newaccesstokens, newrefreshtokens, newlogincodes, request.email])

        transporter.sendMail({
            from: '"Portfolio security system" <' + process.env.EMAIL + '>',
            to: request.username + ' <' + request.email + '>',
            subject: "New login on your account",
            html: "<p>Hello ! Someone logged into your account ! If it's not you, there's an issue !</p>",
        })

        return res.status(200).json({ message: "Successfully logged in", user: { username: request.username, id: request.id } })
    } catch (err) {
        return res.status(400).json("An error occured, please try again later")
    }

}

module.exports = { LoginCode }