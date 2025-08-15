require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken, validatemessage, getmessagelength } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const { GetBlockStateServer } = require('../profile/block/getblockstateserver')
const bucket = require('../../config/gcs')
const { GetImage } = require('../../tools/helper functions/getimage')
const { Notify } = require('../../tools/helper functions/notify')

const SendMessage = async (req, res) => {
    try {
        const receiverid = req?.body?.receiverid
        let text = req?.body?.text
        let image = req?.files?.image?.data

        if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})
        if (!validatemessage(text)) return res.status(400).json({message: "Invalid text format"})
        if (getmessagelength(text) == 0)
        {
            if (image == null) return res.status(400).json({message: "Can't send empty message"})
            text = ""
        }
        if (image?.length > 500 * 1024) return res.status(400).json({ message: "Your image is too big, its compression is over 500KB" })

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        if (data.id == receiverid) return res.status(400).json({message: "Can't send a message to yourself"})
        const anyblocked = await GetBlockStateServer(data.id, receiverid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        const date = new Date()
        const [message] = await db.query(`
            INSERT INTO messages (text, receiverid, senderid, created_at, image)
            VALUES (?, ?, ?, ?, ?)
        `, [text, receiverid, data.id, date.toISOString(), image ? "1" : "0"])

        if (image)
        {
            await bucket.file(`messages/${message.insertId}`).save(image, {
                metadata: {
                    contentType: 'application/octet-stream',
                    cacheControl: 'no-store'
                }
            })
            image = await GetImage(`messages/${message.insertId}`)
        }

        const messagedata = {
            receiverid,
            id: message.insertId,
            created_at: date.toISOString(),
            senderid: data.id,
            image
        }

        getIO().to(receiverid.toString()).emit('newmessage', {...messagedata, text})
        getIO().to(data.id.toString()).emit('newmessage', {...messagedata, text})

        return res.status(200).json({message: "Message sent", messagedata })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { SendMessage }