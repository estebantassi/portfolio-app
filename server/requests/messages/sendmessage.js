require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken, validatemessage } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const { GetBlockStateServer } = require('../profile/block/getblockstateserver')
const bucket = require('../../config/gcs')
const { GetImage } = require('../../tools/helper functions/getimage')

const SendMessage = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Wrong request"})
        if (req.body == null || req.body.text == null || req.body.receiverid == null) return res.status(400).json({message: "Please fill out all the necessary fields"})
        
        const receiverid = req.body.receiverid
        const text = req.body.text
        const accesstoken = req.cookies.accesstoken
        const image = req.files ? req.files.image : null

        if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!validatemessage(text)) return res.status(400).json({message: "Invalid text format"})
        //VALIDATE IMAGE

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        if (data.id == receiverid) return res.status(400).json({message: "Can't send a message to yourself"})
        const anyblocked = await GetBlockStateServer(data.id, receiverid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        let hasimage = 0
        if (image != null && image.data != null) hasimage = 1

        const date = new Date()
        const [message] = await db.query(`
            INSERT INTO messages (text, receiverid, senderid, date, image)
            VALUES (?, ?, ?, ?, ?)
        `, [text, receiverid, data.id, date, hasimage])

        if (message == null || message.insertId == null) return res.status(400).json({message: "Message not sent"})

        if (hasimage == 1)
        {
            await bucket.file(`messages/${message.insertId}`).save(image.data, {
                metadata: {
                    contentType: 'application/octet-stream',
                    cacheControl: 'no-store'
                }
            })
        }

        if (hasimage == 1) hasimage = await GetImage(`messages/${message.insertId}`)

        const messagedata = {
            receiverid,
            id: message.insertId,
            date,
            senderid: data.id,
            image: hasimage
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