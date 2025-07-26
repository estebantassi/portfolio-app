const db = require('../../../config/database')
const { setCachedValue, getCachedValue } = require('../../../config/redis')
require('dotenv').config()

const GetBlockStateServer = async (user1, user2) => {
    try {
        let user1BlockedUser2
        let user2BlockedUser1

        let cache1 = await getCachedValue(`block/${user1}/${user2}`)
        if (cache1 == "1") user1BlockedUser2 = true
        else if (cache1 == "0") user1BlockedUser2 = false
        if (user1BlockedUser2) return 1

        let cache2 = await getCachedValue(`block/${user2}/${user1}`)
        if (cache2 == "1") user2BlockedUser1 = true
        else if (cache2 == "0") user2BlockedUser1 = false
        if (user2BlockedUser1) return 1
    
        if (user1BlockedUser2 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM block WHERE blocker_id = ? AND blocked_id = ?
                ) AS user1_blocked_user2
            `, [user1, user2])

            user1BlockedUser2 = request.user1_blocked_user2
            await setCachedValue(`block/${user1}/${user2}`, process.env.BLOCK_CACHE_DURATION, user1BlockedUser2 ? "1" : "0")
            if (user1BlockedUser2) return 1
        }

        if (user2BlockedUser1 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM block WHERE blocker_id = ? AND blocked_id = ?
                ) AS user2_blocked_user1
            `, [user2, user1])

            user2BlockedUser1 = request.user2_blocked_user1
            await setCachedValue(`block/${user2}/${user1}`, process.env.BLOCK_CACHE_DURATION, user2BlockedUser1 ? "1" : "0")
            if (user2BlockedUser1) return 1
        }

        return 0
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return null
    }
}

module.exports = { GetBlockStateServer }