require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validatetoken } = require('../../tools/tools')

const GetPosts = async (req, res) => {

    try {
        const offset = parseInt(req?.query?.offset, 10)
        const repliedto = parseInt(req?.query?.repliedto, 10)
        let date = req?.query?.date

        const data = req.accesstokendata

        if (offset == null || date == null) return res.status(400).json({message: "Missing data"})

        date = new Date(date)
        
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})

        let [request] = await db.query(`
            SELECT *
            FROM posts
            WHERE created_at <= ? AND replied_to=?
            ORDER BY id DESC
            LIMIT 3
            OFFSET ?
        `, [date.toISOString(), repliedto, offset])

        const hasMore = request.length > 2
        request = request.slice(0, 2)

        for (const post of request) {
            post.liked = false
            if (data?.id && request?.id)
            {
                const [[liked]] = await db.query(`
                    SELECT *
                    FROM likes
                    WHERE post_id=? AND user_id=?
                `, [request.id, data.id])

                if (liked) request.liked = true
            }

            if (post?.image) post.image = await GetImage(`posts/${post.id}`)
            else post.image = null
        }

        return res.status(200).json({message: "Data retrieved", posts: request, end: !hasMore})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetPosts }