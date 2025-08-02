require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken, validatemessage, validateposttext } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const { GetBlockStateServer } = require('../profile/block/getblockstateserver')
const bucket = require('../../config/gcs')
const { GetImage } = require('../../tools/helper functions/getimage')
const { Notify } = require('../../tools/helper functions/notify')

const SendPost = async (req, res) => {
    try {
        const repliedto = req?.body?.repliedto
        const text = req?.body?.text
        const image = req?.files?.image
        
        if (repliedto == null || text == null || text == null) return res.status(400).json({message: "Please fill out all the necessary fields"})

        if (!validateid(repliedto) && repliedto != 0) return res.status(400).json({message: "Invalid id format"})
        if (!validateposttext(text)) return res.status(400).json({message: "Invalid text format"})
        //VALIDATE IMAGE

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        let hasimage = 0
        if (image?.data != null) hasimage = 1

        const date = new Date()
        const [post] = await db.query(`
            INSERT INTO posts (text, replied_to, poster_id, created_at, image)
            VALUES (?, ?, ?, ?, ?)
        `, [text, repliedto, data.id, date.toISOString(), hasimage])

        if (hasimage == 1)
        {
            await bucket.file(`posts/${post.insertId}`).save(image.data, {
                metadata: {
                    contentType: 'application/octet-stream',
                    cacheControl: 'no-store'
                }
            })
        }

        let imageurl
        if (hasimage == 1) imageurl = await GetImage(`posts/${post.insertId}`)

        const postdata = {
            replied_to: repliedto,
            id: post.insertId,
            created_at: date.toISOString(),
            poster_id: data.id,
            image: imageurl,
            text
        }

        return res.status(200).json({message: "Posted", postdata })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { SendPost }