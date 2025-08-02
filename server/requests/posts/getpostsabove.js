require('dotenv').config()
const db = require('../../config/database')
const { GetImage } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')

const GetPostsAbove = async (req, res) => {
    try {
        const postid = parseInt(req?.query?.postid, 10)

        if (!validateid(postid)) return res.status(400).json({message: "Invalid id format"})

        const data = req.accesstokendata

        let currentid = postid
        let posts = []
        for (let i = 0; i < 5; i++) {
            const [[request]] = await db.query(`
                SELECT *
                FROM posts
                WHERE id=?
            `, [currentid])

            request.liked = false
            if (data?.id && request?.id)
            {
                const [[liked]] = await db.query(`
                    SELECT *
                    FROM likes
                    WHERE post_id=? AND user_id=?
                `, [request.id, data.id])

                if (liked) request.liked = true
            }
            
            if (request?.image == 1) request.image = await GetImage(`posts/${currentid}`)
            else request.image = null

            posts.unshift(request)
            if (request.replied_to != 0) currentid = request.replied_to
            else break
        }

        if (posts.length == 0) return res.status(404).json({message: "This post doesn't exist"})

        return res.status(200).json({message: "Data retrieved", posts})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetPostsAbove }