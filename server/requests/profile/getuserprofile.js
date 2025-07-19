require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/getimage")

const GetUserProfile = async (req, res) => {

    try {
        if (req.query == null || req.query.id == null) return res.status(400).json({message: "Missing data"})
        
        const id = req.query.id
        if (isNaN(id)) return res.status(400).json({message: "Invalid id format"})

        let cacheduser = JSON.parse(await getCachedValue(`profile/${id}`))
        if (!cacheduser)
        {
            const [[request]] = await db.query(`
                SELECT username, avatar, banner, tag, messagekey_public, verified
                FROM users
                WHERE id=?
            `, [id])

            cacheduser = request
            await setCachedValue(`profile/${id}`, process.env.PROFILE_CACHE_DURATION, JSON.stringify(request))
        }

        if (cacheduser == null || cacheduser.username == null || cacheduser.avatar == null || cacheduser.banner == null || cacheduser.tag == null || cacheduser.messagekey_public == null) return res.status(400).json({message: "User not found"})

        let avatarimage
        if (cacheduser.avatar == 1) avatarimage = await GetImage("avatar/" + id + "." + cacheduser.avatar)
        else avatarimage = await GetImage("avatar/0.jpeg")

        return res.status(200).json({message: "Data retrieved", username: cacheduser.username, avatar: avatarimage, tag: cacheduser.tag, key: cacheduser.messagekey_public})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetUserProfile }