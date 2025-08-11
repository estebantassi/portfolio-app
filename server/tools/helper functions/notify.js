require('dotenv').config()
const db = require('../../config/database')
const bucket = require("../../config/gcs")
const { getCachedValue, setCachedValue } = require('../../config/redis')
const { getIO } = require('../../config/socketio')

const Notify = async (type, notifiedid, notifierid, value = 0) => {

    let connection
    try {

        connection = await db.getConnection()
        await connection.beginTransaction()

        const date = new Date()

        const [[existingnotification]] = await connection.query(`
            SELECT updated_at, id
            FROM notifications
            WHERE type = ? AND notified_id = ? AND value = ?
            ORDER BY id DESC
            LIMIT 1
            FOR UPDATE
        `, [type, notifiedid, value])

        let notificationid = existingnotification?.id

        if (!existingnotification || new Date(existingnotification.updated_at) < new Date(date.getTime() - 48 * 60 * 60 * 1000)) {

            const [notification] = await connection.query(`
                INSERT INTO notifications (notified_id, value, type, created_at, updated_at, total_count)
                VALUES (?, ?, ?, ?, ?, 1)
            `, [notifiedid, value, type, date.toISOString(), date.toISOString()])

            notificationid = notification.insertId
        } else if (existingnotification) {
            const [[usernotification]] = await connection.query(`
                SELECT *
                FROM notifications_notifiers
                WHERE notification_id=? AND notifier_id=?
                LIMIT 1
            `, [existingnotification.id, notifierid])

            if (usernotification != null) return

            await connection.query(`
                UPDATE notifications
                SET updated_at = ?, total_count=total_count+1
                WHERE id = ?
            `, [date.toISOString(), notificationid])
        }

        await connection.query(`
            INSERT INTO notifications_notifiers (notifier_id, notification_id)
            VALUES (?, ?)
        `, [notifierid, notificationid])
    
        //getIO().to(notifiedid.toString()).emit('notification', { id: request2.insertId, type, notified_id: parseInt(notifiedid, 10), notifier_id: notifierid, created_at: date.toISOString(), value })
        
        await connection.commit()
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { Notify }