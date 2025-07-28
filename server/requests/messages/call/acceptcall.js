require('dotenv').config()
const db = require('../../../config/database')
const { setCachedValue, getCachedValue } = require('../../../config/redis')
const { getIO } = require('../../../config/socketio')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { GetFollowStateServer } = require('../../profile/follow/getfollowstateserver')

const AcceptCall = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.callerid == null || req.body.answer == null) return res.status(400).json({message: "Missing data"})
        
        const answer = req.body.answer
        const callerid = req.body.callerid
        const accesstoken = req.cookies.accesstoken
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!validateid(callerid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        const call1 = JSON.parse(await getCachedValue(`call/${callerid}`))
        if (!call1 || call1.status != "pending" || call1.id != data.id) return res.status(400).json({message: "Call ended"})

        await setCachedValue(`call/${callerid}`, process.env.CALL_TIMEOUT_DURATION, JSON.stringify({status: "online", id: data.id}))
        await setCachedValue(`call/${data.id}`, process.env.CALL_TIMEOUT_DURATION, JSON.stringify({status: "online", id: callerid}))

        getIO().to(callerid.toString()).emit('acceptedcall', { from: data.id, answer })

        return res.status(200).json({message: "Call accepted"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { AcceptCall }