const express = require('express')
let cookieParser = require('cookie-parser')
const cors = require('cors')
require('dotenv').config()
const db = require('./config/database')
const { initSocket } = require('./config/socketio')
const http = require('http')
const fileUpload = require('express-fileupload')

const app = express()
const PORT = process.env.PORT

//WEB SOCKETS
const server = http.createServer(app)
initSocket(server)

//USE REQ.COOKIES WITH COOKIEPARSER
app.use(cookieParser())

//CORS
const corsOptions = require('./config/cors-options')
const credentials = require('./config/cors-credentials')
app.use(credentials)
app.use(cors(corsOptions))

const bodyParser = require('body-parser')
app.use(bodyParser.json({ limit: '10mb' }))

app.use(fileUpload())

//ACCOUNT CREATION
app.post('/signup', require('./requests/signup/signup').Signup)
app.post('/verifyemail', require('./requests/signup/verifyemail').VerifyEmail)

//FULL LOGIN
app.post('/loginstart', require('./requests/login/loginstart').LoginStart)
app.post('/logintoken/login', require('./requests/login/login').Login)
app.post('/logintoken/logincode', require('./requests/login/logincode').LoginCode)

//ACCESS ACCOUNT SETTINGS
app.post('/auth/accountsettings/checkstart', require('./requests/account settings/access/checkstart').CheckStart)
app.post('/auth/sensitivedata/accountsettings/check', require('./requests/account settings/access/check').Check)
app.post('/auth/sensitivedata/accountsettings/check2fa', require('./requests/account settings/access/check2fa').Check2FA)

//CHANGE EMAIL
app.post('/oldemailcheck', require('./requests/account settings/change email/oldemailcheck').OldEmailCheck)
app.post('/newemailcheck', require('./requests/account settings/change email/newemailcheck').NewEmailCheck)
app.post('/auth/sensitivedata/requestemailchange', require('./requests/account settings/change email/requestemailchange').RequestEmailChange)

//CHANGE PASSWORD
app.post('/confirmpasswordchange', require('./requests/account settings/change password/confirmpasswordchange').ConfirmPasswordChange)
app.post('/auth/sensitivedata/accountsettings/requestpasswordchange', require('./requests/account settings/change password/requestpasswordchange').RequestPasswordChange)

//CHANGE 2FA
app.post('/auth/sensitivedata/request2fa', require('./requests/account settings/change 2FA/request2fa').Request2FA)
app.post('/auth/sensitivedata/enable2fa', require('./requests/account settings/change 2FA/enable2fa').Enable2FA)
app.post('/auth/sensitivedata/disable2fa', require('./requests/account settings/change 2FA/disable2fa').Disable2FA)

//MESSAGES
app.post('/auth/sendmessage', require ("./requests/messages/sendmessage").SendMessage)
app.post('/auth/getmessages', require ("./requests/messages/getmessages").GetMessages)
app.post('/auth/deletemessage', require ("./requests/messages/deletemessage").DeleteMessage)

//CALL
app.post('/auth/requestcall', require('./requests/messages/call/requestcall').RequestCall)
app.post('/auth/acceptcall', require('./requests/messages/call/acceptcall').AcceptCall)
app.post('/auth/endcall', require('./requests/messages/call/endcall').EndCall)
app.get('/auth/getcallstate', require('./requests/messages/call/getcallstate').GetCallState)

//FOLLOW
app.post('/auth/follow', require ("./requests/profile/follow/follow").Follow)
app.post('/auth/unfollow', require ("./requests/profile/follow/unfollow").Unfollow)
app.get('/getfollowstate', require ("./requests/profile/follow/getfollowstate").GetFollowState)

//BLOCK
app.post('/auth/block', require ("./requests/profile/block/block").Block)
app.post('/auth/unblock', require ("./requests/profile/block/unblock").Unblock)
app.get('/getblockstate', require ("./requests/profile/block/getblockstate").GetBlockState)

//TOKENS
app.get('/auth/checkaccesstoken', require('./requests/session/checkaccesstoken').CheckAccessToken)
app.get('/auth/refreshtoken/logout', require('./requests/login/logout').Logout)
app.get('/auth/refreshtoken/update', require('./requests/session/updateaccesstoken').UpdateAccessToken)

//PROFILE
app.post('/auth/editprofile', require("./requests/profile/editprofile").EditProfile)
app.get('/getuserprofile', require('./requests/profile/getuserprofile').GetUserProfile)

//NOTIFICATIONS
app.get('/auth/getnotifications', require('./requests/notifications/getnotifications').GetNotifications)

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

//DELETE USERS WITH UNVERIFIED EMAIL
setInterval(async () => {
    await db.query(`
    DELETE FROM users 
    WHERE verified = 0 
    AND created_at < ?
    `, [new Date(Date.now() - 24 * 60 * 60 * 1000)])
}, 60 * 60 * 1000)

//DELETE EXPIRED TOKENS
setInterval(async () => {
    await db.query(`
    DELETE FROM tokens 
    WHERE expires_at < ?
    `, [new Date()])
}, 60 * 60 * 1000)