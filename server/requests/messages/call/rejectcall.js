require('dotenv').config()
const db = require('../../../config/database')
const { setCachedValue, getCachedValue, deleteCachedValue } = require('../../../config/redis')
const { getIO } = require('../../../config/socketio')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { GetFollowStateServer } = require('../../profile/follow/getfollowstateserver')

const RejectCall = async (req, res) => {
    try {
        const from = parseInt(req?.body?.from, 10)
        if (!validateid(from)) return res.status(400).json({ message: "Invalid id format" })

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const call1 = JSON.parse(await getCachedValue(`call/${from}`))
        if (call1?.status != "pending" && call1?.id != data.id) return res.status(400).json({message: "That user isn't calling you"})

        await deleteCachedValue(`call/${from}`)
        getIO().to(from.toString()).emit('endedcall')

        return res.status(200).json({message: "Call rejected"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { RejectCall }