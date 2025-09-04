const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { getIO } = require('../../../config/socketio')
const { setCachedValue } = require('../../../config/redis')
require('dotenv').config()

const Block = async (req, res) => {
    let connection
    try {
        const blockedid = req?.body?.blockedid
        if (!validateid(blockedid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const [[user]] = await db.query(`
            SELECT 1
            FROM users
            WHERE id=?
        `, [blockedid])

        if (user == null) return res.status(400).json({message: "This user doesn't exist"})

        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[block]] = await connection.query(`
            SELECT 1
            FROM block
            WHERE blocker_id=? AND blocked_id=?
        `, [data.id, blockedid])

        let message
        let blocked
        if (block) {
            await connection.query(`
                DELETE FROM block
                WHERE blocker_id=? AND blocked_id=?
            `, [data.id, blockedid])

            blocked = false
            message = "Unblocked user"
        } else {
            await connection.query(`
                INSERT INTO block (blocker_id, blocked_id)
                VALUES (?, ?)
            `, [data.id, blockedid])

            blocked = true
            message = "Blocked user"
        }

        await connection.commit()
        if (block) {
            try {
                await db.query(`
                    DELETE FROM follow
                    WHERE (followee_id=? AND follower_id=?)
                    OR (followee_id=? AND follower_id=?)
                `, [data.id, blockedid, blockedid, data.id])
            } catch (err) {}
        }
        await setCachedValue(`follow/${data.id}/${blockedid}`, process.env.FOLLOW_CACHE_DURATION, "0")
        await setCachedValue(`follow/${blockedid}/${data.id}`, process.env.FOLLOW_CACHE_DURATION, "0")

        await setCachedValue(`block/${data.id}/${blockedid}`, process.env.BLOCK_CACHE_DURATION, blocked ? "1" : "0")

        getIO().to(blockedid.toString()).emit(blocked ? 'block' : "unblock", { id: blockedid, from: data.id })
        getIO().to(data.id.toString()).emit(blocked ? 'block' : "unblock", { id: blockedid, from: data.id })

        return res.status(200).json({message, blocked})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Block }