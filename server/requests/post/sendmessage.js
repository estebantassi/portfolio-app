require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../get/gettokendata')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { encrypt, decrypt } = require('../../tools/tools')

const SendMessage = async (req, res) => {
    if (req.cookies == null) return res.status(400).json({message: "Wrong request"})
    if (req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})

    const data = await GetTokenData(req, req.cookies.accesstoken, "access")
    if (data == null) return res.status(400).json({message: "Invalid token"})

    if (req.body == null || req.body.text == null || req.body.receiverid == null) return res.status(400).json({message: "Please fill out all the necessary fields"})

    try {
        const [[request]] = await db.query(`
            SELECT id
            FROM users
            WHERE id=?
        `, [req.body.receiverid])

        if (request == null) return res.status(400).json({message: "User not found"})

        await db.query(`
            INSERT INTO messages (text, receiverid, senderid, date)
            VALUES (?, ?, ?, ?)
        `, [req.body.text, req.body.receiverid, data.id, new Date()])

        return res.status(200).json({message: "Message sent"})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { SendMessage }