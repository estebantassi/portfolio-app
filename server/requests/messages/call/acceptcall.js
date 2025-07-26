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

        const call = await getCachedValue(`call/${callerid}/${data.id}`)
        if (!call && call != "pending") return res.status(400).json({message: "Call ended"})

        console.log(`from acceptcall : call/${callerid}/${data.id}`)
        await setCachedValue(`call/${callerid}/${data.id}`, process.env.CALL_TIMEOUT_DURATION, "online")
        await setCachedValue(`call/${data.id}/${callerid}`, process.env.CALL_TIMEOUT_DURATION, "online")

        getIO().to(callerid.toString()).emit('acceptedcall', { from: data.id, answer })

        return res.status(200).json({message: "Call accepted"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { AcceptCall }