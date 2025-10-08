const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { getIO } = require('../../../config/socketio')
const { GetBlockStateServer } = require('../block/getblockstateserver')
const { setCachedValue } = require('../../../config/redis')
const { Notify } = require('../../../tools/helper functions/notify')
require('dotenv').config()

const Follow = async (req, res) => {
    let connection
    try {
        const followeeid = req?.body?.followeeid
        if (!validateid(followeeid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const anyblocked = await GetBlockStateServer(data.id, followeeid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})
    
        const [[user]] = await db.query(`
            SELECT 1
            FROM users
            WHERE id=?
        `, [followeeid])

        if (user == null) return res.status(400).json({message: "This user doesn't exist"})

        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[follow]] = await connection.query(`
            SELECT 1
            FROM follow
            WHERE follower_id=? AND followee_id=?
        `, [data.id, followeeid])

        let message
        let followed
        if (follow)
        {
            await connection.query(`
                DELETE FROM follow
                WHERE follower_id=? AND followee_id=?
            `, [data.id, followeeid])

            followed = false
            message = "Unfollowed user"
        } else {
            await connection.query(`
                INSERT INTO follow (follower_id, followee_id)
                VALUES (?, ?)
            `, [data.id, followeeid])

            followed = true
            message = "Followed user"
        }

        await connection.commit()

        await setCachedValue(`follow/${data.id}/${followeeid}`, process.env.FOLLOW_CACHE_DURATION, followed ? "1" : "0")

        getIO().to(followeeid.toString()).emit(followed ? 'follow' : "unfollow", { id: followeeid, from: data.id })
        getIO().to(data.id.toString()).emit(followed ? 'follow' : "unfollow", { id: followeeid, from: data.id })

        if (!follow) await Notify("follow", followeeid, data.id)

        return res.status(200).json({message, followed})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Follow }