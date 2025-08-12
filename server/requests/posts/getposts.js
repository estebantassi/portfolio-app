require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validatetoken, validateid } = require('../../tools/tools')

const GetPosts = async (req, res) => {

    try {
        const offset = parseInt(req?.query?.offset, 10)
        const repliedto = parseInt(req?.query?.repliedto, 10)
        const date = new Date(req?.query?.date)
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})
        if (!validateid(repliedto)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")

        let sql = `
            SELECT posts.*, 
            ${data?.id ? "CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END AS liked" : "false AS liked"}
            FROM posts
            ${data?.id ? "LEFT JOIN likes AS user_likes ON posts.id = user_likes.post_id AND user_likes.user_id = ?" : ""}
            WHERE posts.created_at <= ? AND posts.replied_to = ?
            ORDER BY posts.id DESC
            LIMIT 3
            OFFSET ?
        `

        let params = data?.id ? [data.id, date.toISOString(), repliedto, offset] : [date.toISOString(), repliedto, offset]
        let [request] = await db.query(sql, params)

        const hasMore = request.length > 2
        request = request.slice(0, 2)

        for (const post of request) {
            post.image = post.image ? await GetImage(`posts/${post.id}`) : null
        }

        return res.status(200).json({message: "Data retrieved", posts: request, end: hasMore})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetPosts }