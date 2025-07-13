require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { encrypt, decrypt, validateid } = require('../../tools/tools')

const GetMessages = async (req, res) => {
    if (req.cookies == null) return res.status(400).json({message: "Wrong request"})
    if (req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json({message: "Invalid token"})

    if (req.body == null || req.body.receiverid == null) return res.status(400).json({message: "Please fill out all the necessary fields"})
    
    const receiverid = req.body.receiverid
    if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})

    try {
        const [sent] = await db.query(`
            SELECT *
            FROM messages
            WHERE senderid=? and receiverid=?
            ORDER BY date
        `, [data.id, receiverid])

        const [received] = await db.query(`
            SELECT *
            FROM messages
            WHERE senderid=? and receiverid=?
            ORDER BY date
        `, [receiverid, data.id])

        const mergedMessages = sent.concat(received).sort((a, b) => new Date(a.date) - new Date(b.date))

        return res.status(200).json({message: "Message sent", data: mergedMessages})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetMessages }