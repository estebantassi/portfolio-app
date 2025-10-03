require('dotenv').config()

const allowedOrigins = process.env.CORS_URLS
  ? process.env.CORS_URLS.split(",").map(origin => origin.trim())
  : []

module.exports = allowedOrigins