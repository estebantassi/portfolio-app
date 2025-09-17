require('dotenv').config()
const cors = require("cors")

const allowedOrigins = process.env.WEBSITE_URL
  ? process.env.WEBSITE_URL.split(",").map(origin => origin.trim())
  : []

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true
}))
