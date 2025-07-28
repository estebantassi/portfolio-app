require('dotenv').config()
const db = require('../../../config/database')
const { setCachedValue, getCachedValue, deleteCachedValue } = require('../../../config/redis')
const { getIO } = require('../../../config/socketio')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { GetFollowStateServer } = require('../../profile/follow/getfollowstateserver')

const RequestCall = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.calleeid == null || req.body.offer == null) return res.status(400).json({message: "Missing data"})
        
        const offer = req.body.offer
        const calleeid = req.body.calleeid
        const accesstoken = req.cookies.accesstoken
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!validateid(calleeid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})
        
        const followstate = await GetFollowStateServer(data.id, calleeid)
        if (followstate == null) followstate = 0

        if (followstate != 2) return res.status(400).json({message: "Call failed, are you following each other ?"})

        let end = false

        const call = JSON.parse(await getCachedValue(`call/${data.id}`))
        if (call) {
            await deleteCachedValue(`call/${call.id}`)
            await deleteCachedValue(`call/${data.id}`)

            getIO().to(call.id.toString()).emit('endedcall')
            end = true
        }

        await setCachedValue(`call/${data.id}`, process.env.CALL_TIMEOUT_DURATION, JSON.stringify({status: "pending", id: calleeid}))
        getIO().to(calleeid.toString()).emit('incomingcall', { from: data.id, offer })

        return res.status(200).json({message: "Call started", end})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { RequestCall }