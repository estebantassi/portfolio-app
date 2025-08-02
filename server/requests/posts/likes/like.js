const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { getIO } = require('../../../config/socketio')
const { setCachedValue } = require('../../../config/redis')
const { Notify } = require('../../../tools/helper functions/notify')
const { GetBlockStateServer } = require('../../profile/block/getblockstateserver')
require('dotenv').config()

const Like = async (req, res) => {
    let connection
    try {
        const postid = req?.body?.postid

        if (postid == null) return res.status(400).json({message: "Missing data"})
        
        if (!validateid(postid)) return res.status(400).json({message: "Invalid id format"})

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const anyblocked = await GetBlockStateServer(data.id, post.poster_id)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        const [[post]] = await db.query(`
            SELECT poster_id
            FROM posts
            WHERE id=?
        `, [postid])

        if (!post) return res.status(400).json({message: "This post doesn't exist"})

        connection = await db.getConnection()
        await connection.beginTransaction()

        const [[like]] = await connection.query(`
            SELECT 1
            FROM likes
            WHERE user_id=? AND post_id=?
        `, [data.id, postid])

        let message
        let liked
        if (like)
        {
            await connection.query(`
                DELETE FROM likes
                WHERE user_id=? AND post_id=?
            `, [data.id, postid])

            liked = false
            message = "Unliked post"
        } else {
            await connection.query(`
                INSERT INTO likes (user_id, post_id)
                VALUES (?, ?)
            `, [data.id, postid])

            message = "Liked post"
            liked = true
        }
        //await Notify("follow", followeeid, data.id)

        await connection.commit()
        return res.status(200).json({message, liked})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Like }