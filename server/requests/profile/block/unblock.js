const db = require('../../../config/database')
const { GetTokenData } = require('../../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../../tools/tools')
const { getIO } = require('../../../config/socketio')
const { setCachedValue } = require('../../../config/redis')
require('dotenv').config()

const Unblock = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.blockedid == null) return res.status(400).json({message: "Missing data"})
        
        const blockedid = req.body.blockedid
        const accesstoken = req.cookies.accesstoken
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!validateid(blockedid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})
    
        await db.query(`
            DELETE FROM block
            WHERE blocker_id=? AND blocked_id=?
        `, [data.id, blockedid])

        await setCachedValue(`block/${data.id}/${blockedid}`, process.env.BLOCK_CACHE_DURATION, "0")

        getIO().to(blockedid.toString()).emit('unblock', { id: blockedid, from: data.id })
        getIO().to(data.id.toString()).emit('unblock', { id: blockedid, from: data.id })

        return res.status(200).json({message: "Unblocked user"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Unblock }