require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/helper functions/getimage")

const GetUserProfile = async (req, res) => {

    try {
        if (req.query == null || req.query.id == null) return res.status(400).json({message: "Missing data"})
        
        const id = req.query.id
        if (isNaN(id)) return res.status(400).json({message: "Invalid id format"})
        let cacheduser = JSON.parse(await getCachedValue(`profile/${id}`))
        if (!cacheduser)
        {
            const [[request]] = await db.query(`
                SELECT username, avatar, banner, tag, messagekey_public, bio
                FROM users
                WHERE id=?
            `, [id])

            cacheduser = {
                username: request.username,
                avatar: request.avatar,
                banner: request.banner,
                messagekey_public: request.messagekey_public,
                tag: request.tag,
                bio: request.bio
            }
            await setCachedValue(`profile/${id}`, process.env.PROFILE_CACHE_DURATION, JSON.stringify(cacheduser))
        }

        if (cacheduser == null || cacheduser.bio == null || cacheduser.username == null || cacheduser.avatar == null || cacheduser.banner == null || cacheduser.tag == null || cacheduser.messagekey_public == null) return res.status(400).json({message: "User not found"})

        const avatarimage = await GetImage("avatar/" + (cacheduser.avatar == 1 ? id : "0"))
        const bannerimage = await GetImage("banner/" + (cacheduser.banner == 1 ? id : "0"))

        return res.status(200).json({message: "Data retrieved", bio: cacheduser.bio, banner: bannerimage, username: cacheduser.username, avatar: avatarimage, tag: cacheduser.tag, messagekey_public: cacheduser.key})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetUserProfile }