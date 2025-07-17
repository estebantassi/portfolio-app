const db = require('../../config/database')
require('dotenv').config()

const CheckUserExpirations = async (id) => {

    let connection
    try {
        connection = await db.getConnection()
        await connection.beginTransaction()

        const [request] = await connection.query(`
            SELECT id, expires_at
            FROM tokens
            WHERE userid=?
            FOR UPDATE
        `, [id])

        if (request == null) {
            await connection.rollback()
            return
        }

        let change = false
        for (const element of request) {
            if (element == null || element.expires_at == null || element.id == null) continue

            if (new Date(element.expires_at) < new Date()) {
                try {
                    await connection.query(`
                        DELETE FROM tokens
                        WHERE id=?
                    `, [element.id])
                    change = true
                } catch (err)
                {
                    continue
                }
            }
        }

        if (change == true) await connection.commit()
        else  await connection.rollback()

        return
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { CheckUserExpirations }