const db = require('../../../config/database')
const { validateid } = require('../../../tools/tools')
const { getCachedValue, setCachedValue } = require('../../../config/redis')
require('dotenv').config()

const GetBlockState = async (req, res) => {
    try {
        if (req.query == null || req.query.user1 == null || req.query.user2 == null) return res.status(400).json({message: "Missing data"})
        
        const user1 = parseInt(req.query.user1, 10)
        const user2 = parseInt(req.query.user2, 10)
        if (!validateid(user1)) return res.status(400).json({message: "Invalid id format"})
        if (!validateid(user2)) return res.status(400).json({message: "Invalid id format"})

        let user1BlockedUser2
        let user2BlockedUser1

        let cache1 = await getCachedValue(`block/${user1}/${user2}`)
        if (cache1 == "1") user1BlockedUser2 = true
        else if (cache1 == "0") user1BlockedUser2 = false

        let cache2 = await getCachedValue(`block/${user2}/${user1}`)
        if (cache2 == "1") user2BlockedUser1 = true
        else if (cache2 == "0") user2BlockedUser1 = false
    
        if (user1BlockedUser2 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM block WHERE blocker_id = ? AND blocked_id = ?
                ) AS user1_blocked_user2
            `, [user1, user2])

            if (request == null) return res.status(400).json({message: "Error with database"})

            user1BlockedUser2 = request.user1_blocked_user2
            await setCachedValue(`block/${user1}/${user2}`, process.env.BLOCK_CACHE_DURATION, user1BlockedUser2 ? "1" : "0")
        }

        if (user2BlockedUser1 == null)
        {
            const [[request]] = await db.query(`
                SELECT
                EXISTS (
                SELECT 1 FROM block WHERE blocker_id = ? AND blocked_id = ?
                ) AS user2_blocked_user1
            `, [user2, user1])

            if (request == null) return res.status(400).json({message: "Error with database"})

            user2BlockedUser1 = request.user2_blocked_user1
            await setCachedValue(`block/${user2}/${user1}`, process.env.BLOCK_CACHE_DURATION, user2BlockedUser1 ? "1" : "0")
        }

        return res.status(200).json({message: "Fetched", user1BlockedUser2, user2BlockedUser1})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetBlockState }