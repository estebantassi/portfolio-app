const { validatetoken } = require('../../tools/tools')
const { GetTokenData } = require('../get/gettokendata')
require('dotenv').config()

const CheckAccessToken = async (req, res) => {

    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})

        const accesstoken = req.cookies.accesstoken

        if(!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        return res.status(200).json({message: "Token is valid"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { CheckAccessToken }