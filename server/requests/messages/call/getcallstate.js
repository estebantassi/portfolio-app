require('dotenv').config()
const db = require('../../../config/database')
const { setCachedValue, getCachedValue, deleteCachedValue } = require('../../../config/redis')
const { getIO } = require('../../../config/socketio')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { GetFollowStateServer } = require('../../profile/follow/getfollowstateserver')

const GetCallState = async (req, res) => {
    try {
        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        let state = true
        const call1 = JSON.parse(await getCachedValue(`call/${data.id}`))
        if (call1 == null) state = false

        if (call1 && call1.status == "online")
        {
            const call2 = JSON.parse(await getCachedValue(`call/${call1.id}`))
            if (call2 == null) state = false
        }

        if (state && call1?.status == "online") {
            await setCachedValue(`call/${data.id}`, process.env.CALL_TIMEOUT_DURATION, JSON.stringify(call1))
        }

        return res.status(200).json({message: "State fetched", state})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetCallState }