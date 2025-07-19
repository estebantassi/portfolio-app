const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { getIO } = require('../../../config/socketio')
const { GetBlockStateServer } = require('../block/getblockstateserver')
const { setCachedValue } = require('../../../config/redis')
require('dotenv').config()

const Unfollow = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.followeeid == null) return res.status(400).json({message: "Missing data"})
        
        const followeeid = req.body.followeeid
        const accesstoken = req.cookies.accesstoken
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!validateid(followeeid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        const anyblocked = await GetBlockStateServer(data.id, followeeid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})
    
        await db.query(`
            DELETE FROM follow
            WHERE follower_id=? AND followee_id=?
        `, [data.id, followeeid])

        await setCachedValue(`follow/${data.id}/${followeeid}`, process.env.FOLLOW_CACHE_DURATION, "0")

        getIO().to(followeeid.toString()).emit('unfollow', { id: followeeid, from: data.id })
        getIO().to(data.id.toString()).emit('unfollow', { id: followeeid, from: data.id })

        return res.status(200).json({message: "Unfollowed user"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Unfollow }