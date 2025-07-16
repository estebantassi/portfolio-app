require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { encrypt, decrypt, validateid, validatetoken } = require('../../tools/tools')
const { getIO } = require('../../config/socketio')
const { GetBlockStateServer } = require('./getblockstateserver')

const SendMessage = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Wrong request"})
        if (req.body == null || req.body.text == null || req.body.receiverid == null) return res.status(400).json({message: "Please fill out all the necessary fields"})
        
        const receiverid = req.body.receiverid
        const text = req.body.text
        const accesstoken = req.cookies.accesstoken

        if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        if (data.id == receiverid) return res.status(400).json({message: "Can't send a message to yourself"})
        const anyblocked = await GetBlockStateServer(data.id, receiverid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        const date = new Date()
        const [message] = await db.query(`
            INSERT INTO messages (text, receiverid, senderid, date)
            VALUES (?, ?, ?, ?)
        `, [text, receiverid, data.id, date])

        if (message == null || message.insertId == null) return res.status(400).json({message: "Message not sent"})

        const messagedata = {
            receiverid,
            id: message.insertId,
            date,
            senderid: data.id
        }

        getIO().to(receiverid.toString()).emit('newmessage', {...messagedata, text})

        return res.status(200).json({message: "Message sent", messagedata })
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { SendMessage }