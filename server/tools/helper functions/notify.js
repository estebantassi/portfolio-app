require('dotenv').config()
const db = require('../../config/database')
const bucket = require("../../config/gcs")
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { getIO } = require('../../config/socketio')

const Notify = async (type, notifiedid, notifierid) => {

    try {
        //TO ADD : COMBINE SAME NOTIFICATIONS THAT HAPPENED WITHIN 24 HOURS OR SO
        const date = new Date()

        const [requests] = await db.query(`
            SELECT *
            FROM notifications
            WHERE type=? AND notified_id=? AND notifier_id=?
            LIMIT 1
        `, [type, notifiedid, notifierid])

        const request = requests[0]
        if (request == null)
        {
            const [request] = await db.query(`
                INSERT INTO notifications (notifier_id, notified_id, type, created_at)
                VALUES (?, ?, ?, ?)
            `, [notifierid, notifiedid, type, date.toISOString()])

            getIO().to(notifiedid.toString()).emit('notification', { id: request.insertId, type, notified_id: parseInt(notifiedid, 10), notifier_id: notifierid, created_at: date.toISOString() })
        }

    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
    }
}

module.exports = { Notify }