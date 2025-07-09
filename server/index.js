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
app.post('/loginstart', require('./requests/post/login/loginstart').LoginStart)
app.post('/logintoken/login', require('./requests/post/login/login').Login)
app.post('/logintoken/logincode', require('./requests/post/login/logincode').LoginCode)
app.post('/oldemailcheck', require('./requests/post/oldemailcheck').OldEmailCheck)
app.post('/newemailcheck', require('./requests/post/newemailcheck').NewEmailCheck)
app.post('/passwordemailcheck', require('./requests/post/passwordemailcheck').PasswordEmailCheck)

app.post('/auth/accountsettings/checkstart', require('./requests/post/account settings/checkstart').CheckStart)
app.post('/auth/sensitivedata/accountsettings/check', require('./requests/post/account settings/check').Check)
app.post('/auth/sensitivedata/accountsettings/check2fa', require('./requests/post/account settings/check2fa').Check2FA)

app.get('/getuserprofile', require('./requests/get/getuserprofile').GetUserProfile)
app.get('/auth/checkaccesstoken', require('./requests/get/checkaccesstoken').CheckAccessToken)
app.post('/auth/sensitivedata/requestemailchange', require('./requests/post/requestemailchange').RequestEmailChange)
app.post('/auth/sensitivedata/requestpasswordchange', require('./requests/post/requestpasswordchange').RequestPasswordChange)
app.post('/auth/sensitivedata/request2fa', require('./requests/post/2FA/request2fa').Request2FA)
app.post('/auth/sensitivedata/enable2fa', require('./requests/post/2FA/enable2fa').Enable2FA)
app.post('/auth/sensitivedata/disable2fa', require('./requests/post/2FA/disable2fa').Disable2FA)
app.post('/auth/sendmessage', require ("./requests/post/sendmessage").SendMessage)
app.post('/auth/getmessages', require ("./requests/post/getmessages").GetMessages)

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