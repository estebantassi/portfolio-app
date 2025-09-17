require('dotenv').config()
const db = require('../../config/database')
const { GetImage, GetImagesFromFolder } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken, makeFakeReqRes } = require('../../tools/tools')
const { GetUserProfile } = require('../profile/getuserprofile')

const GetPostsAbove = async (req, res) => {
    try {
        const postid = parseInt(req?.query?.postid, 10)
        if (!validateid(postid)) return res.status(400).json({ message: "Invalid id format" })
            
        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")

        let currentid = postid
        let postIds = []

        const batchSize = parseInt(process.env.POSTSABOVE_FETCH_SIZE, 10)

        while (true) {
            const [[post]] = await db.query(`
                SELECT id, replied_to
                FROM posts
                WHERE id=?`,
            [currentid])

            if (!post) break
            
            postIds.push(post.id)
            if (post?.replied_to == 0) break

            currentid = post.replied_to

            if (postIds.length > batchSize) break
        }

        const hasMore = postIds.length > batchSize
        postIds = postIds.slice(0, batchSize)

        if (postIds.length === 0) {
            return res.status(200).json({ message: "No posts found", posts: [], end: true })
        }

        let sql = `
            SELECT posts.*, 
            ${data?.id ? "CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END AS liked" : "false AS liked"}
            FROM posts
            ${data?.id ? "LEFT JOIN likes AS user_likes ON posts.id = user_likes.post_id AND user_likes.user_id = ?" : ""}
            WHERE posts.id IN (?)
            ORDER BY replied_to ASC
        `

        let params = data?.id ? [data.id, postIds] : [postIds]
        const [posts] = await db.query(sql, params)

        let ids = []
        for (const post of posts) {
            ids.push(post.poster_id)
            post.images = post.image ? await GetImagesFromFolder(`${post.poster_id}/posts/${post.id}/`) : []
        }

        let profiles = []
        try {
            const makeRequest = makeFakeReqRes()
            makeRequest.req.query.id = ids
            console.log(ids)
            profiles = (await GetUserProfile(makeRequest.req, makeRequest.res))._getStore().body.profiles
        } catch (err) { return }

        const profileMap = new Map()
        for (const profile of Object.values(profiles)) {
            profileMap.set(profile.id, profile)
        }

        const list = posts.map(post => ({
            poster: profileMap.get(post.poster_id) || null,
            post
        }))

        list.reverse()

        return res.status(200).json({ message: "Data retrieved", posts: list, end: !hasMore})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({ message: "An error occured, please try again later" })
    }
}

module.exports = { GetPostsAbove }