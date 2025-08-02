const { GetTokenData } = require("../tools/helper functions/gettokendata")
const { validatetoken } = require("../tools/tools")
require('dotenv').config()

const AccessMiddleware = async (req, res, next) => {
    try {
        const token = req?.cookies?.accesstoken
        if (!token) return res.status(400).json({ message: "Missing token" })

        if (!validatetoken(token)) return res.status(400).json({ message: "Invalid token format" })

        req.accesstokendata = await GetTokenData(req, token, "access")

        next()
    } catch (err) {
        if (process.env.STATE === 'dev') console.error(err)
        return res.status(500).json({ message: "Token validation failed" })
    }
}

const RefreshMiddleware = async (req, res, next) => {
    try {
        const token = req?.cookies?.refreshtoken
        if (!token) return res.status(400).json({ message: "Missing token" })

        if (!validatetoken(token)) return res.status(400).json({ message: "Invalid token format" })

        req.refreshtokendata = await GetTokenData(req, token, "refresh")

        next()
    } catch (err) {
        if (process.env.STATE === 'dev') console.error(err)
        return res.status(500).json({ message: "Token validation failed" })
    }
}

module.exports = { AccessMiddleware, RefreshMiddleware }