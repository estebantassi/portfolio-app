require('dotenv').config()
const db = require('../../config/database')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { validateid, validatetoken } = require('../../tools/tools')
const { GetBlockStateServer } = require('../profile/block/getblockstateserver')
const { GetImage, GetImagesFromFolder } = require('../../tools/helper functions/getimage')
const { setCachedValue } = require('../../config/redis')
const bucket = require('../../config/gcs')

const GetMessages = async (req, res) => {
    try {
        const offset = parseInt(req?.query?.offset, 10)
        const receiverid = parseInt(req?.query?.receiverid)
        const date = new Date(req?.query?.date)
        if (!(date instanceof Date) || isNaN(date.getTime())) return res.status(400).json({message: "Invalid date format"})
        if (isNaN(offset) || offset < 0) return res.status(400).json({message: "Invalid offset format"})
        if (!validateid(receiverid)) return res.status(400).json({message: "Invalid id format"})

        const data = await GetTokenData(req, req?.cookies?.accesstoken, "access")
        if (data == null) return res.status(401).json({ message: "Authentication required" })
        
        const anyblocked = await GetBlockStateServer(data.id, receiverid)
        if (anyblocked == null) return res.status(403).json({message: "Error checking block state"})
        if (anyblocked) return res.status(403).json({message: "This user blocked you or you blocked this user"})

        const batchSize = parseInt(process.env.MESSAGES_FETCH_SIZE, 10)

        let [request] = await db.query(`
            SELECT *
            FROM messages
            WHERE (
                (senderid = ? AND receiverid = ?)
                OR
                (senderid = ? AND receiverid = ?)
            ) AND created_at <= ?
            ORDER BY id DESC
            LIMIT ?
            OFFSET ?
        `, [data.id, receiverid, receiverid, data.id, date.toISOString(), batchSize + 1, offset])

        const hasMore = request.length > batchSize
        request = request.slice(0, batchSize)

        for (const message of request) {
            if (message.image == 1)
            {
                message.images = await GetImagesFromFolder(`messages/${message.id}/`)
            } else message.images = []
        }

        return res.status(200).json({message: "Message sent", data: request, end: !hasMore})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetMessages }