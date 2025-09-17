require('dotenv').config()

const allowedOrigins = process.env.WEBSITE_URL
  ? process.env.WEBSITE_URL.split(",").map(origin => origin.trim())
  : []

module.exports = allowedOrigins