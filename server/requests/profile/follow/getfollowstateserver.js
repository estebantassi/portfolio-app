const db = require('../../../config/database')
const { setCachedValue, getCachedValue } = require('../../../config/redis')
require('dotenv').config()

const GetFollowStateServer = async (user1, user2) => {
    try {
        let user1FollowsUser2
        let user2FollowsUser1

        let cache1 = await getCachedValue(`follow/${user1}/${user2}`)
        if (cache1 == "1") user1FollowsUser2 = true
        else if (cache1 == "0") user1FollowsUser2 = false


        let cache2 = await getCachedValue(`follow/${user2}/${user1}`)
        if (cache2 == "1") user2FollowsUser1 = true
        else if (cache2 == "0") user2FollowsUser1 = false

        if (user1FollowsUser2 && user2FollowsUser1) return 2
        if (user1FollowsUser2 || user2FollowsUser1) return 1
    
        if (user1FollowsUser2 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM follow WHERE follower_id = ? AND followee_id = ?
                ) AS user1_follows_user2
            `, [user1, user2])

            user1FollowsUser2 = request.user1_follows_user2
            await setCachedValue(`follow/${user1}/${user2}`, process.env.FOLLOW_CACHE_DURATION, user1FollowsUser2 ? "1" : "0")
        }

        if (user2FollowsUser1 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM follow WHERE follower_id = ? AND followee_id = ?
                ) AS user2_follows_user1
            `, [user2, user1])
            user2FollowsUser1 = request.user2_follows_user1
            await setCachedValue(`follow/${user2}/${user1}`, process.env.FOLLOW_CACHE_DURATION, user2FollowsUser1 ? "1" : "0")
        }

        if (user1FollowsUser2 && user2FollowsUser1) return 2
        if (user1FollowsUser2 || user2FollowsUser1) return 1

        return 0
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return null
    }
}

module.exports = { GetFollowStateServer }