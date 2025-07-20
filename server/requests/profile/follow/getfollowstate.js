const db = require('../../../config/database')
const { validateid } = require('../../../tools/tools')
const { getCachedValue, setCachedValue } = require('../../../config/redis')
require('dotenv').config()

const GetFollowState = async (req, res) => {
    try {
        if (req.query == null || req.query.user1 == null || req.query.user2 == null) return res.status(400).json({message: "Missing data"})
        
        const user1 = parseInt(req.query.user1, 10)
        const user2 = parseInt(req.query.user2, 10)
        if (!validateid(user1)) return res.status(400).json({message: "Invalid id format"})
        if (!validateid(user2)) return res.status(400).json({message: "Invalid id format"})

        let user1FollowsUser2
        let user2FollowsUser1

        let cache1 = await getCachedValue(`follow/${user1}/${user2}`)
        if (cache1 == "1") user1FollowsUser2 = true
        else if (cache1 == "0") user1FollowsUser2 = false

        let cache2 = await getCachedValue(`follow/${user2}/${user1}`)
        if (cache2 == "1") user2FollowsUser1 = true
        else if (cache2 == "0") user2FollowsUser1 = false
    
        if (user1FollowsUser2 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM follow WHERE follower_id = ? AND followee_id = ?
                ) AS user1_follows_user2
            `, [user1, user2])

            if (request == null) return res.status(400).json({message: "Error with database"})

            user1FollowsUser2 = request.user1_follows_user2
            await setCachedValue(`follow/${user1}/${user2}`, process.env.FOLLOW_CACHE_DURATION, user1FollowsUser2.toString())
        }

        if (user2FollowsUser1 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM follow WHERE follower_id = ? AND followee_id = ?
                ) AS user2_follows_user1
            `, [user2, user1])

            if (request == null) return res.status(400).json({message: "Error with database"})

            user2FollowsUser1 = request.user2_follows_user1
            await setCachedValue(`follow/${user2}/${user1}`, process.env.FOLLOW_CACHE_DURATION, user2FollowsUser1.toString())
        }

        return res.status(200).json({message: "Fetched", user1FollowsUser2, user2FollowsUser1})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetFollowState }