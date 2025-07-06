const { Storage } = require('@google-cloud/storage')
require('dotenv').config()
const storage = new Storage({ keyFilename: process.env.KEYFILENAME })
const bucket = storage.bucket(process.env.BUCKET_NAME)

module.exports = bucket