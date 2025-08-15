require('dotenv').config()
const db = require('../../../config/database')
const { setCachedValue, getCachedValue } = require('../../../config/redis')
const { getIO } = require('../../../config/socketio')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatesessiondescription } = require('../../../tools/tools')
const { GetFollowStateServer } = require('../../profile/follow/getfollowstateserver')

const AcceptCall = async (req, res) => {
    try {
        const answer = req?.body?.answer
        const callerid = req?.body?.callerid
        if (!validatesessiondescription(answer) == null) return res.status(400).json({message: "Invalid answer format"})
        if (!validateid(callerid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const call1 = JSON.parse(await getCachedValue(`call/${callerid}`))
        if (call1?.status != "pending" || call1?.id != data.id) return res.status(400).json({message: "Call ended"})

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