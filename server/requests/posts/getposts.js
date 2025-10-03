require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage, GetImagesFromFolder } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validatetoken, validateid, makeFakeReqRes } = require('../../tools/tools')
const { GetUserProfile } = require('../profile/getuserprofile')

const GetPosts = async (req, res) => {

    try {
        const offset = parseInt(req?.query?.offset, 10)
        const repliedto = parseInt(req?.query?.repliedto, 10)
        const date = new Date(req?.query?.date)
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})
        if (!validateid(repliedto)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")

        const batchSize = parseInt(process.env.REPLIES_FETCH_SIZE, 10)
        
        let sql = `
            SELECT posts.*, 
            ${data?.id ? "CASE WHEN user_likes.user_id IS NOT NULL THEN true ELSE false END AS liked" : "false AS liked"}
            FROM posts
            ${data?.id ? "LEFT JOIN likes AS user_likes ON posts.id = user_likes.post_id AND user_likes.user_id = ?" : ""}
            WHERE posts.created_at <= ? AND posts.replied_to = ?
            ORDER BY posts.id DESC
            LIMIT ?
            OFFSET ?
        `

        let params = data?.id ? [data.id, date.toISOString(), repliedto, batchSize + 1, offset] : [date.toISOString(), repliedto, batchSize + 1, offset]
        let [request] = await db.query(sql, params)

        const hasMore = request.length > batchSize
        request = request.slice(0, batchSize)

        let ids = []
        for (const post of request) {
            ids.push(parseInt(post.poster_id, 10))
            const path = `users/${post.poster_id}/posts/${post.id}/`
            post.images = post.image ? await GetImagesFromFolder(path) : []
        }

        let profiles = []
        try {
            const makeRequest = makeFakeReqRes()
            makeRequest.req.query.id = ids
            profiles = (await GetUserProfile(makeRequest.req, makeRequest.res))._getStore().body.profiles
        } catch (err) { 
            return res.status(400).json({message: "Couldn't fetch user"})
        }
        
        const profileMap = new Map()
        for (const profile of Object.values(profiles)) {
            profileMap.set(profile.id, profile)
        }

        const list = request.map(post => ({
            poster: profileMap.get(post.poster_id) || null,
            post
        }))

        list.reverse()

        return res.status(200).json({message: "Data retrieved", posts: list, end: !hasMore})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetPosts }