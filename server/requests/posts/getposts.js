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

        if (offset == null || date == null) return res.status(400).json({message: "Missing data"})

        date = new Date(date)
        
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})

        const [request] = await db.query(`
            SELECT *
            FROM posts
            WHERE created_at <= ? AND replied_to=?
            ORDER BY id DESC
            LIMIT 2
            OFFSET ?
        `, [date.toISOString(), repliedto, offset])

        for (const post of request) {
            if (post?.image) post.image = await GetImage(`posts/${post.id}`)
            else post.image = null
        }

        return res.status(200).json({message: "Data retrieved", posts: request})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetPosts }