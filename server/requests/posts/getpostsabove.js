require('dotenv').config()
const db = require('../../config/database')
const { GetImage } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')

const GetPostsAbove = async (req, res) => {
    try {
        const postid = parseInt(req?.query?.postid, 10)
        if (!validateid(postid)) return res.status(400).json({ message: "Invalid id format" })

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")

        let currentid = postid
        let postIds = []

        while (true) {
            const [[post]] = await db.query(`
                SELECT id, replied_to
                FROM posts
                WHERE id=?`,
            [currentid])

            if (!post) break
            
            postIds.unshift(post.id)
            if (post?.replied_to == 0) break

            currentid = post.replied_to

            if (postIds.length > 2) break
        }

        const hasMore = postIds.length > 2
        postIds.slice(0, 2)

        let sql = `
            SELECT 
                posts.*, 
                COALESCE(likes_count.count, 0) AS like_count,
                COALESCE(replies_count.count, 0) AS reply_count,
                ${data?.id ? "CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END AS liked" : "false AS liked"}
            FROM posts
            LEFT JOIN (
                SELECT replied_to, COUNT(*) AS count
                FROM posts
                GROUP BY replied_to
            ) AS replies_count ON posts.id = replies_count.replied_to
            LEFT JOIN (
                SELECT post_id, COUNT(*) AS count
                FROM likes
                GROUP BY post_id
            ) AS likes_count ON posts.id = likes_count.post_id
            ${data?.id ? "LEFT JOIN likes AS user_likes ON posts.id = user_likes.post_id AND user_likes.user_id = ?" : ""}
            WHERE posts.id IN (?)
        `
        let params = data?.id ? [data.id, postIds] : [postIds]
        const [posts] = await db.query(sql, params)

        posts.reverse()

        return res.status(200).json({ message: "Data retrieved", posts, end: hasMore})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({ message: "An error occured, please try again later" })
    }
}

module.exports = { GetPostsAbove }