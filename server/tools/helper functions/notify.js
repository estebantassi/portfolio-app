require('dotenv').config()
const db = require('../../config/database')
const bucket = require("../../config/gcs")
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { getIO } = require('../../config/socketio')

const Notify = async (type, notifiedid, notifierid) => {

    try {

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
            await db.query(`
                INSERT INTO notifications (notifier_id, notified_id, type, date)
                VALUES (?, ?, ?, ?)
            `, [notifierid, notifiedid, type, date])

            getIO().to(notifiedid.toString()).emit('notification', { from: notifierid, type, date })
        }

    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
    }
}

module.exports = { Notify }