require('dotenv').config()

const allowedOrigins = [
    process.env.WEBSITE_URL
]

module.exports = allowedOrigins