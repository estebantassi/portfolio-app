const express = require('express')
let cookieParser = require('cookie-parser')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT

app.use(cookieParser())

const corsOptions = require('./config/cors-options')
const credentials = require('./config/cors-credentials')
app.use(credentials)
app.use(cors(corsOptions))

const bodyParser = require('body-parser')
app.use(bodyParser.json({ limit: '10mb' }))

app.post('/signup', require('./requests/post/signup').Signup)
app.post('/login', require('./requests/post/login').Login)

app.get('/istokenvalid', require('./requests/get/istokenvalid').IsTokenValid)

app.get('/refreshtoken/clearcookies', (req, res) => {
    console.log(req.cookies)
    res.clearCookie("refreshtoken", { path: "/refreshtoken" })
    res.clearCookie("accesstoken", { path: "/" })
    return res.status(200).json("Cookies cleared")
})

app.get('/refreshtoken/update', require('./requests/get/updateaccesstoken').UpdateAccessToken)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))