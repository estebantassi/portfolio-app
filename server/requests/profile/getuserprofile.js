require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/helper functions/getimage")
const { validateid } = require('../../tools/tools')

const GetUserProfile = async (req, res) => {
    try {

        let ids = req?.query?.id
        if (!Array.isArray(ids)) {
            ids = String(ids)
                .split(',')
                .map(v => v.trim())
                .filter(v => v.length > 0);
        }

        if (ids.length > 10) return res.status(400).json({ message: "Too many users requested" })

        ids = ids.map(v => parseInt(v, 10))
        if (!ids.every(validateid)) return res.status(400).json({ message: "Invalid id format" })

        let finalprofiles = []
        let requestedprofiles = []

        for (const id of ids)
        {
            let cacheduser = JSON.parse(await getCachedValue(`profile/${id}`))
            if (cacheduser) {
                cacheduser.avatar = await GetImage("avatar/" + (cacheduser.avatar == 1 ? id : "0"))
                cacheduser.banner = await GetImage("banner/" + (cacheduser.banner == 1 ? id : "0"))
                finalprofiles.push(cacheduser)
            }
            else requestedprofiles.push(parseInt(id, 10))
        }

        if (requestedprofiles?.length > 0)
        {
            const placeholders = requestedprofiles.map(() => '?').join(',')

            const [requests] = await db.query(`
                SELECT username, avatar, banner, tag, messagekey_public, bio, id
                FROM users
                WHERE id IN (${placeholders})
            `, requestedprofiles)

            if (requests == null) return res.status(400).json({message: "User(s) not found"})

            for (const request of requests)
            {
                let profile = {
                    username: request.username,
                    avatar: request.avatar,
                    banner: request.banner,
                    messagekey_public: request.messagekey_public,
                    tag: request.tag,
                    bio: request.bio,
                    id: request.id
                }

                await setCachedValue(`profile/${request.id}`, process.env.PROFILE_CACHE_DURATION, JSON.stringify(profile))

                profile.avatar = await GetImage("avatar/" + (request.avatar == 1 ? request.id : "0"))
                profile.banner = await GetImage("banner/" + (request.banner == 1 ? request.id : "0"))

                finalprofiles.push(profile)
            }
        }

        return res.status(200).json({message: "Data retrieved", profiles: {...finalprofiles}})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetUserProfile }