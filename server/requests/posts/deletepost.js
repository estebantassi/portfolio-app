require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid } = require('../../tools/tools')
const bucket = require('../../config/gcs')
const { deleteCachedValue } = require('../../config/redis')
const { DeleteImageFromFolder } = require('../../tools/helper functions/getimage')

const DeletePost = async (req, res) => {
    try {
        const postid = req?.body?.postid
        if (!validateid(postid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })
            
        const [[post]] = await db.query(`
            SELECT image, replied_to
            FROM posts
            WHERE id=? AND poster_id=?
        `, [postid, data.id])

        if (post == null) return res.status(400).json({message: "Post not found"})

        await db.query(`
            DELETE FROM posts
            WHERE id=? AND poster_id=?
        `, [postid, data.id])

        if (post.replied_to != 0)
        {
            await db.query(`
                UPDATE posts
                SET reply_count=reply_count-1
                WHERE id = ?
            `, [post.replied_to])
        }

        if (post.image == 1) {
            try {
                await DeleteImageFromFolder(`users/${data.id}/posts/${postid}/`)
            } catch (err) {
                if (err.code !== 404) throw err
            }
        }

        return res.status(200).json({message: "Post removed" })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { DeletePost }