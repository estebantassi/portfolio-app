require('dotenv').config()
const db = require('../../config/database')
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { GetImage } = require("../../tools/helper functions/getimage")
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validatetoken } = require('../../tools/tools')

const GetNotifications = async (req, res) => {

    try {

        const offset = parseInt(req?.query?.offset, 10)
        const date = new Date(req?.query?.date)
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })

        const [requests] = await db.query(`
            SELECT n.*,
                SUBSTRING_INDEX(
                    GROUP_CONCAT(nn.notifier_id ORDER BY nn.id DESC),
                    ',',
                    10
                ) AS notifier_ids
            FROM notifications n
            JOIN notifications_notifiers nn 
            ON n.id = nn.notification_id
            WHERE n.notified_id = ?
            AND n.created_at <= ?
            GROUP BY n.id
            ORDER BY n.id DESC
            LIMIT 2
            OFFSET ?
        `, [data.id, date.toISOString(), offset])
        
        for (const request of requests) request.notifier_ids = request.notifier_ids.split(",").map(Number)

        return res.status(200).json({message: "Data retrieved", notifications: requests})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetNotifications }