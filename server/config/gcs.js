const { Storage } = require('@google-cloud/storage')
require('dotenv').config()
const fs = require('fs')
const path = require('path')

const keyPath = path.join(__dirname, "..", "key.json")

const keyData = Buffer.from(process.env.GCP_KEY_BASE64, "base64")
fs.writeFileSync(keyPath, keyData)

const storage = new Storage({ keyFilename: keyPath })
const bucket = storage.bucket(process.env.BUCKET_NAME)

module.exports = bucket;