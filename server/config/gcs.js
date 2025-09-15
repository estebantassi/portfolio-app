const { Storage } = require('@google-cloud/storage')
require('dotenv').config()
const fs = require('fs')

const keyData = Buffer.from(process.env.GCP_KEY_BASE64, "base64")
fs.writeFileSync("../key.json", keyData)

const storage = new Storage({ keyFilename: process.env.KEYFILENAME })
const bucket = storage.bucket(process.env.BUCKET_NAME)

module.exports = bucket