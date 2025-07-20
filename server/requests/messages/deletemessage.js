require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const bucket = require('../../config/gcs')
const { deleteCachedValue } = require('../../config/redis')

const DeleteMessage = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.messageid == null) return res.status(400).json({message: "Missing data"})
        
        const messageid = req.body.messageid
        const accesstoken = req.cookies.accesstoken
        if (!validateid(messageid)) return res.status(400).json({message: "Invalid id format"})
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})
            
        const [[message]] = await db.query(`
            SELECT *
            FROM messages
            WHERE id=? AND senderid=?
        `, [messageid, data.id])

        if (message == null || message.image == null || message.receiverid == null) return res.status(400).json({message: "Message not deleted"})

        await db.query(`
            DELETE FROM messages
            WHERE id=? AND senderid=?
        `, [messageid, data.id])

        if (message.image == 1) {
            try {
                await bucket.file(`messages/${messageid}`).delete();
            } catch (err) {
                if (err.code !== 404) throw err
            }
            await deleteCachedValue(`messages/${messageid}`)
        }

        getIO().to(message.receiverid.toString()).emit('deletemessage', {messageid})
        getIO().to(data.id.toString()).emit('deletemessage', {messageid})

        return res.status(200).json({message: "Message removed" })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { DeleteMessage }