const { validatetoken } = require('../../tools/tools')
const { GetTokenData } = require('../get/gettokendata')

const CheckAccessToken = async (req, res) => {

    if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})

    const accesstoken = req.cookies.accesstoken

    if(!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})

    const data = await GetTokenData(req, accesstoken, "access")
    if (data == null) return res.status(400).json({message: "Invalid token"})

    return res.status(200).json({message: "Token is valid"})
}

module.exports = { CheckAccessToken }