require('dotenv').config()
const bucket = require("../../config/gcs")
const { getCachedValue, setCachedValue } = require('../../config/redis')

const GetImage = async (filepath) => {
    try {
        const cachedUrl = await getCachedValue(filepath)
        if (cachedUrl) return cachedUrl

        const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
        }
        const [signedUrl] = await bucket.file(filepath).getSignedUrl(options)

        await setCachedValue(filepath, 55 * 60, signedUrl)
        return signedUrl
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return null
    }
}

module.exports = { GetImage }