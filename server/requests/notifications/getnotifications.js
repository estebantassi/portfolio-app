require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validatetoken } = require('../../tools/tools')

const GetNotifications = async (req, res) => {

    try {
        if (req.cookies == null || req.cookies.accesstoken == null) return res.status(400).json({message: "Missing token"})
        if (req.query == null || req.query.offset == null || req.query.date == null) return res.status(400).json({message: "Missing data"})
        
        const accesstoken = req.cookies.accesstoken
        const offset = parseInt(req.query.offset, 10)
        const date = new Date(req.query.date)
        if (!validatetoken(accesstoken)) return res.status(400).json({message: "Invalid token format"})
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})

        const data = await GetTokenData(req, accesstoken, "access")
        if (data == null) return res.status(400).json({message: "Invalid token"})

        const [request] = await db.query(`
            SELECT *
            FROM notifications
            WHERE notified_id=? AND created_at <= ?
            ORDER BY id DESC
            LIMIT 2
            OFFSET ?
        `, [data.id, date.toISOString(), offset])

        return res.status(200).json({message: "Data retrieved", notifications: request})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetNotifications }