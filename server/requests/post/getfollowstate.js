const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')

const GetFollowState = async (req, res) => {
    try {
        if (req.query == null || req.query.user1 == null || req.query.user2 == null) return res.status(400).json({message: "Missing data"})
        
        const user1 = parseInt(req.query.user1, 10)
        const user2 = parseInt(req.query.user2, 10)
        if (!validateid(user1)) return res.status(400).json({message: "Invalid id format"})
        if (!validateid(user2)) return res.status(400).json({message: "Invalid id format"})
    
        const [[request]] = await db.query(`
            SELECT
            EXISTS (
                SELECT 1 FROM follow WHERE follower_id = ? AND followee_id = ?
            ) AS user1_follows_user2,
            EXISTS (
                SELECT 1 FROM follow WHERE follower_id = ? AND followee_id = ?
            ) AS user2_follows_user1
        `, [user1, user2, user2, user1])

        if (request == null) return res.status(400).json({message: "Follow not found"})

        const user1FollowsUser2 = request.user1_follows_user2
        const user2FollowsUser1 = request.user2_follows_user1

        return res.status(200).json({message: "Fetched", user1FollowsUser2, user2FollowsUser1})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetFollowState }