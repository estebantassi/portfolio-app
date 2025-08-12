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
        postIds = postIds.slice(0, 2)

        if (postIds.length === 0) {
            return res.status(200).json({ message: "No posts found", posts: [], end: true })
        }

        let sql = `
            SELECT posts.*, 
            ${data?.id ? "CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END AS liked" : "false AS liked"}
            FROM posts
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