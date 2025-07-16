require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { validateid, validatetoken } = require('../../tools/tools')
const { GetBlockStateServer } = require('./getblockstateserver')

const GetMessages = async (req, res) => {
    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.body == null || req.body.receiverid == null || req.body.offset == null || req.body.date == null) return res.status(400).json({message: "Missing data"})
        
        const offset = req.body.offset
        const receiverid = req.body.receiverid
        const date = new Date(req.body.date)
        const accesstoken = req.cookies.accesstoken
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})
        if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})
        
        const anyblocked = await GetBlockStateServer(data.id, receiverid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        const [request] = await db.query(`
            SELECT *
            FROM messages
            WHERE (
                (senderid = ? AND receiverid = ?)
                OR
                (senderid = ? AND receiverid = ?)
            ) AND date <= ?
            ORDER BY date DESC
            LIMIT 2
            OFFSET ?
        `, [data.id, receiverid, receiverid, data.id, date, offset])

        if (request == null || request.length == 0) return res.status(200).json({message: "No more messages", data: ""})

        return res.status(200).json({message: "Message sent", data: request})
    } catch (err) {
        console.log(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetMessages }