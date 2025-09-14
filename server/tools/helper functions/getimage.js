require('dotenv').config()
const bucket = require("../../config/gcs")
const { getCachedValue, setCachedValue, deleteCachedValue } = require('../../config/redis')

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

const DeleteImage = async (filepath) => {
    try {
        await bucket.file(filepath).delete()
        await deleteCachedValue(filepath)
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
    }
}

const GetImagesFromFolder = async (folderpath) => {
    try {
        const cachedUrl = JSON.parse(await getCachedValue(folderpath))
        if (cachedUrl) return cachedUrl

        const [files] = await bucket.getFiles({ prefix: folderpath })

        const signedUrls = await Promise.all(
            files.map(file => {
                const options = {
                    version: 'v4',
                    action: 'read',
                    expires: Date.now() + 60 * 60 * 1000,
                }
                return file.getSignedUrl(options)
                    .then(([url]) => url)
            })
        )

        await setCachedValue(folderpath, 55 * 60, JSON.stringify(signedUrls))
        return signedUrls
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return null
    }
}

const DeleteImageFromFolder = async (folderpath) => {
    try {
        await bucket.deleteFiles({ prefix: folderpath })
        await deleteCachedValue(folderpath)
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
    }
}

module.exports = { GetImage, GetImagesFromFolder, DeleteImage, DeleteImageFromFolder }