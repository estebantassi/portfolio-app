const { GetTokenData } = require('../get/gettokendata')

const CheckAccessToken = async (req, res) => {

    if (!req.cookies || !req.cookies.accesstoken) return res.status(400).json("Missing token")

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (!data) return res.status(400).json("Invalid token")

    return res.status(200).json("Token is valid")
}

module.exports = { CheckAccessToken }