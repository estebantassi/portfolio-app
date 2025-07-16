const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')

const Block = async (req, res) => {
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
            INSERT INTO block (blocker_id, blocked_id)
            VALUES (?, ?)
        `, [data.id, blockedid])

        try {
            await db.query(`
                DELETE FROM follow
                WHERE (followee_id=? AND follower_id=?)
                OR (followee_id=? AND follower_id=?)
            `, [data.id, blockedid, blockedid, data.id])
        } catch (err) {}

        getIO().to(blockedid.toString()).emit('block', { id: blockedid, from: data.id })
        getIO().to(data.id.toString()).emit('block', { id: blockedid, from: data.id })

        return res.status(200).json({message: "Blocked user"})
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { Block }