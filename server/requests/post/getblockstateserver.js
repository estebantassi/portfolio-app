const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')

const GetBlockStateServer = async (user1, user2) => {
    try {
        const [[request]] = await db.query(`
            SELECT
            EXISTS (
                SELECT 1 FROM block WHERE blocker_id = ? AND blocked_id = ?
            ) AS user1_blocked_user2,
            EXISTS (
                SELECT 1 FROM block WHERE blocker_id = ? AND blocked_id = ?
            ) AS user2_blocked_user1
        `, [user1, user2, user2, user1])

        if (request == null) return null

        const user1BlockedUser2 = request.user1_blocked_user2
        const user2BlockedUser1 = request.user2_blocked_user1

        return user1BlockedUser2 === 1 || user2BlockedUser1 === 1
    } catch (err) {
        return null
    }
}

module.exports = { GetBlockStateServer }