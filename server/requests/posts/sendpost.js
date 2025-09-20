require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken, validatemessage, validateposttext } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const { GetBlockStateServer } = require('../profile/block/getblockstateserver')
const bucket = require('../../config/gcs')
const { GetImage, GetImagesFromFolder } = require('../../tools/helper functions/getimage')
const { Notify } = require('../../tools/helper functions/notify')
const sharp = require('sharp')

const SendPost = async (req, res) => {
    try {
        const repliedto = req?.body?.repliedto
        const text = req?.body?.text
        let image = req?.files?.image?.data
        if (!validateid(repliedto) && repliedto != 0) return res.status(400).json({message: "Invalid id format"})
        if (!validateposttext(text) && image == null) return res.status(400).json({message: "Invalid text format"})
        if (text.length == 0 && image == null) return res.status(400).json({message: "Can't send empty post"})

        if (image)
        {
            image = sharp(image, { animated: true })
            const imagemetadata = await image.metadata()

            if (imagemetadata)
            {
                image = await image
                    .resize({
                        width: 1920,
                        height: 1920,
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                    .webp()
                    .toBuffer()

                if (image.length > 1000 * 1024) return res.status(400).json({ message: "Your image is too big, its compression is over 1MB" })
            } else return res.status(400).json({ message: "Invalid image format" })
        }

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        let originalpost
        if (repliedto != 0)
        {
            [[originalpost]] = await db.query(`
                SELECT poster_id
                FROM posts
                WHERE id=?
            `, [repliedto])
        }

        const date = new Date()
        const [post] = await db.query(`
            INSERT INTO posts (text, replied_to, poster_id, created_at, image)
            VALUES (?, ?, ?, ?, ?)
        `, [text, repliedto, data.id, date.toISOString(), image ? "1" : "0"])

        if (repliedto != 0)
        {
            if (!originalpost) return res.status(400).json({ message: "Couldn't find original post" })

            await db.query(`
                UPDATE posts
                SET reply_count=reply_count+1
                WHERE id = ?
            `, [repliedto])
        }

        //REPLACE WITH FOR LOOP FOR MULTIPLE IMAGES
        let images = []
        if (image)
        {
            await bucket.file(`${data.id}/posts/${post.insertId}/0`).save(image, {
                metadata: {
                    contentType: 'image/webp',
                    cacheControl: 'no-store'
                }
            })

            images = await GetImagesFromFolder(`${data.id}/posts/${post.insertId}/`)
        }

        const postdata = {
            replied_to: repliedto,
            id: post.insertId,
            created_at: date.toISOString(),
            poster_id: data.id,
            images,
            text,
            like_count: 0,
            reply_count: 0
        }

        if (originalpost && data.id != originalpost.poster_id) await Notify("reply", originalpost.poster_id, data.id, post.insertId)

        return res.status(200).json({message: "Posted", postdata })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { SendPost }