const express = require('express')
let cookieParser = require('cookie-parser')
const cors = require('cors')
require('dotenv').config()
const db = require('./config/database')

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
app.post('/verifyemail', require('./requests/post/verifyemail').VerifyEmail)
app.post('/login', require('./requests/post/login').Login)
app.post('/logintoken/logincode', require('./requests/post/logincode').LoginCode)

app.get('/auth/checkaccesstoken', require('./requests/get/checkaccesstoken').CheckAccessToken)
app.post('/auth/getsensitivedata', require('./requests/post/getsensitivedata').GetSensitiveData)

app.get('/auth/refreshtoken/logout', require('./requests/post/logout').Logout)

app.get('/auth/refreshtoken/update', require('./requests/get/updateaccesstoken').UpdateAccessToken)

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

//DELETE USERS WITH UNVERIFIED EMAIL
setInterval(async () => {
    await db.query(`
    DELETE FROM users 
    WHERE verified = 0 
    AND created_at < NOW() - INTERVAL 24 HOUR
    `)
}, 60 * 1000);

setInterval(async () => {
    await db.query(`
    DELETE FROM tokens 
    WHERE expires_at < ?
    `, [new Date()])
}, 60 * 1000);