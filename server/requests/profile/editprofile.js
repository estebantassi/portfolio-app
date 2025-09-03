require('dotenv').config()
const db = require('../../config/database')
const bucket = require('../../config/gcs')
const { setCachedValue, getCachedValue } = require('../../config/redis')
const { getIO } = require('../../config/socketio')
const { GetImage } = require('../../tools/helper functions/getimage')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validatetoken, validateusername, validatetag, validatebio } = require('../../tools/tools')
const sharp = require('sharp')

const EditProfile = async (req, res) => {
    try {
        let bio = req?.body?.bio
        let username = req?.body?.username
        let tag = req?.body?.tag
        let avatar = req?.files?.avatar?.data
        let banner = req?.files?.banner?.data

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const [[request]] = await db.query(`
            SELECT username, avatar, banner, tag, bio
            FROM users
            WHERE id=?
        `, [data.id])

        let updateFields = []
        let updateValues = []

        if (request?.tag != tag)
        {
            if (!validatetag(tag, data.id)) return res.status(400).json({message: "Invalid tag format"})
            updateFields.push(`tag = ?`)
            updateValues.push(tag)
        } else tag = request.tag

        if (request?.username != username)
        {
            if (!validateusername(username)) return res.status(400).json({message: "Invalid username format"})
            updateFields.push(`username = ?`)
            updateValues.push(username)
        } else username = request.username

        if (request?.bio != bio)
        {
            if (!validatebio(bio)) return res.status(400).json({message: "Invalid bio format"})
            updateFields.push(`bio = ?`)
            updateValues.push(bio)
        } else bio = request.bio

        if (avatar)
        {
            avatar = sharp(avatar, { animated: true })
            const avatarmetadata = await avatar.metadata()

            if (avatarmetadata)
            {
                let newheight = Math.floor(avatarmetadata?.pageHeight)
                if (!newheight) newheight = Math.floor(avatarmetadata.height)
                if (newheight > Math.floor(avatarmetadata.width)) newheight = Math.floor(avatarmetadata.width)
                if (newheight > 300) newheight = 300

                avatar = await avatar
                    .resize({
                        width: newheight,
                        height: newheight,
                        fit: 'cover'
                    })
                    .webp({ quality: 75})
                    .toBuffer()

                if (avatar.length > 500 * 1024) return res.status(400).json({ message: "Your avatar is too big, its compression is over 500KB" })

                await bucket.file(`avatar/${data.id}`).save(avatar, {
                    metadata: {
                        contentType: 'image/webp',
                        cacheControl: 'no-store'
                    }
                })

                avatar = `data:image/webp;base64,${avatar.toString('base64')}`
                updateFields.push('avatar = 1')
            } else return res.status(400).json({ message: "Invalid avatar format" })
        }

        if (banner)
        {
            banner = sharp(banner, { animated: true })
            const bannermetadata = await banner.metadata()

            if (bannermetadata)
            {
                const targetwidth = Math.floor(bannermetadata.width) - (Math.floor(bannermetadata.width) % 3)

                let newheight = Math.floor(bannermetadata?.pageHeight)
                if (!newheight) newheight = Math.floor(bannermetadata.height)
                if (newheight > 1500) newheight = 1500

                if (newheight * 3 > targetwidth) newheight = targetwidth / 3

                banner = await banner
                .resize({
                    width: newheight * 3,
                    height: newheight,
                    fit: 'cover'
                })
                .webp({ quality: 75})
                .toBuffer()
            


                if (banner.length > 1000 * 1024) return res.status(400).json({ message: `Your banner is too big, its compression is over 1MB (${(banner.length / (1024 * 1024)).toFixed(2)}MB)` })

                await bucket.file(`banner/${data.id}`).save(banner, {
                    metadata: {
                        contentType: 'image/webp',
                        cacheControl: 'no-store'
                    }
                })

                banner = `data:image/webp;base64,${banner.toString('base64')}`
                updateFields.push('banner = 1')
            } else return res.status(400).json({ message: "Invalid banner format" })
        }

        let combinedfields
        if (updateFields.length > 1) combinedfields = updateFields.join(', ')
        else combinedfields = updateFields[0]

        if (!combinedfields) return res.status(400).json({ message: "Nothing changed" })

        await db.query(`
            UPDATE users
            SET ${combinedfields}
            WHERE id=?
        `, [...updateValues, data.id])

        let newuser = {
            username,
            bio,
            tag
        }

        if (banner) newuser.banner = 1
        else newuser.banner = request.banner
        if (avatar) newuser.avatar = 1
        else newuser.avatar = request.avatar

        await setCachedValue(`profile/${data.id}`, process.env.PROFILE_CACHE_DURATION, JSON.stringify(newuser))

        getIO().to(data.id.toString()).emit('profileupdate', {...newuser, banner, avatar})

        return res.status(200).json({message: "Profile edited", avatar, banner})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { EditProfile }