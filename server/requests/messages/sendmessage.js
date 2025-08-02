require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken, validatemessage } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const { GetBlockStateServer } = require('../profile/block/getblockstateserver')
const bucket = require('../../config/gcs')
const { GetImage } = require('../../tools/helper functions/getimage')
const { Notify } = require('../../tools/helper functions/notify')

const SendMessage = async (req, res) => {
    try {
        const receiverid = req?.body?.receiverid
        const text = req?.body?.text
        const image = req?.files?.image

        if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})
        if (!validatemessage(text)) return res.status(400).json({message: "Invalid text format"})
        //VALIDATE IMAGE

        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        if (data.id == receiverid) return res.status(400).json({message: "Can't send a message to yourself"})
        const anyblocked = await GetBlockStateServer(data.id, receiverid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        let hasimage = 0
        if (image != null && image.data != null) hasimage = 1

        const date = new Date()
        const [message] = await db.query(`
            INSERT INTO messages (text, receiverid, senderid, created_at, image)
            VALUES (?, ?, ?, ?, ?)
        `, [text, receiverid, data.id, date.toISOString(), hasimage])

        if (hasimage == 1)
        {
            await bucket.file(`messages/${message.insertId}`).save(image.data, {
                metadata: {
                    contentType: 'application/octet-stream',
                    cacheControl: 'no-store'
                }
            })
        }

        if (message == null) return res.status(400).json({message: "Message not sent"})

        if (hasimage == 1) hasimage = await GetImage(`messages/${message.insertId}`)

        const messagedata = {
            receiverid,
            id: message.insertId,
            created_at: date.toISOString(),
            senderid: data.id,
            image: hasimage
        }

        Notify("message", receiverid, data.id)

        getIO().to(receiverid.toString()).emit('newmessage', {...messagedata, text})
        getIO().to(data.id.toString()).emit('newmessage', {...messagedata, text})

        return res.status(200).json({message: "Message sent", messagedata })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { SendMessage }