require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const bucket = require('../../config/gcs')
const { deleteCachedValue } = require('../../config/redis')

const DeleteMessage = async (req, res) => {
    try {
        const messageid = req?.body?.messageid
        if (!validateid(messageid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })
            
        const [[message]] = await db.query(`
            SELECT image, receiverid
            FROM messages
            WHERE id=? AND senderid=?
        `, [messageid, data.id])

        if (message == null) return res.status(400).json({message: "Message not deleted"})

        await db.query(`
            DELETE FROM messages
            WHERE id=? AND senderid=?
        `, [messageid, data.id])

        if (message?.image == 1) {
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