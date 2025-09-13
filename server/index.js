const express = require('express')
let cookieParser = require('cookie-parser')
const cors = require('cors')
require('dotenv').config()
const db = require('./config/database')
const { initSocket } = require('./config/socketio')
const http = require('http')
const fileUpload = require('express-fileupload')

const {
    sendMessages,
    settings2FA,
    logoutusers,
    emailchange,
    passwordchange,
    linkVerifications,
    accountCreation,
    accesssettings,
    login,
    deleteMessages,
    getMessages,
    callState,
    callActions,
    followAndBlock,
    updateToken,
    logout,
    getBlock,
    getFollow,
    getUsers,
    editProfile,
    getNotifications,
    sendPost,
    like,
    getPosts,
    getPostsAbove,
    deletePost
} = require('./config/limiters');

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
const { DeleteImageFromFolder } = require('./tools/helper functions/getimage')
app.use(bodyParser.json({ limit: '10mb' }))

app.use(fileUpload())

//ACCOUNT CREATION
app.post('/signup', accountCreation, require('./requests/signup/signup').Signup)
app.post('/verifyemail', linkVerifications, require('./requests/signup/verifyemail').VerifyEmail)

//FULL LOGIN
app.post('/loginstart', login, require('./requests/login/loginstart').LoginStart)
app.post('/logintoken/login', login, require('./requests/login/login').Login)
app.post('/logintoken/logincode', login, require('./requests/login/logincode').LoginCode)

//ACCESS ACCOUNT SETTINGS
app.post('/auth/accountsettings/checkstart', accesssettings, require('./requests/account settings/access/checkstart').CheckStart)
app.post('/auth/sensitivedata/accountsettings/check', accesssettings, require('./requests/account settings/access/check').Check)
app.post('/auth/sensitivedata/accountsettings/check2fa', accesssettings, require('./requests/account settings/access/check2fa').Check2FA)

//CHANGE EMAIL
app.post('/oldemailcheck', linkVerifications, require('./requests/account settings/change email/oldemailcheck').OldEmailCheck)
app.post('/newemailcheck', linkVerifications, require('./requests/account settings/change email/newemailcheck').NewEmailCheck)
app.post('/auth/sensitivedata/accountsettings/requestemailchange', emailchange, require('./requests/account settings/change email/requestemailchange').RequestEmailChange)

//CHANGE PASSWORD
app.post('/confirmpasswordchange', linkVerifications, require('./requests/account settings/change password/confirmpasswordchange').ConfirmPasswordChange)
app.post('/auth/sensitivedata/accountsettings/requestpasswordchange', passwordchange, require('./requests/account settings/change password/requestpasswordchange').RequestPasswordChange)

//LOGOUT ALL USERS
app.post('/auth/sensitivedata/accountsettings/logoutallusers', logoutusers, require('./requests/account settings/logoutallusers').LogoutAllUsers)

//CHANGE 2FA
app.post('/auth/sensitivedata/accountsettings/request2fa', settings2FA, require('./requests/account settings/change 2FA/request2fa').Request2FA)
app.post('/auth/sensitivedata/accountsettings/enable2fa', settings2FA, require('./requests/account settings/change 2FA/enable2fa').Enable2FA)
app.post('/auth/sensitivedata/accountsettings/disable2fa', settings2FA, require('./requests/account settings/change 2FA/disable2fa').Disable2FA)

//MESSAGES
app.post('/auth/sendmessage', sendMessages, require("./requests/messages/sendmessage").SendMessage)
app.get('/auth/getmessages', getMessages, require("./requests/messages/getmessages").GetMessages)
app.post('/auth/deletemessage', deleteMessages, require("./requests/messages/deletemessage").DeleteMessage)

//CALL
app.post('/auth/requestcall', callActions, require('./requests/messages/call/requestcall').RequestCall)
app.post('/auth/acceptcall', callActions, require('./requests/messages/call/acceptcall').AcceptCall)
app.post('/auth/endcall', callActions, require('./requests/messages/call/endcall').EndCall)
app.post('/auth/rejectcall', callActions, require('./requests/messages/call/rejectcall').RejectCall)
app.get('/auth/getcallstate', callState, require('./requests/messages/call/getcallstate').GetCallState)

//FOLLOW
app.post('/auth/follow', followAndBlock, require ("./requests/profile/follow/follow").Follow)
app.get('/getfollowstate', getFollow, require ("./requests/profile/follow/getfollowstate").GetFollowState)

//BLOCK
app.post('/auth/block', followAndBlock, require ("./requests/profile/block/block").Block)
app.get('/getblockstate', getBlock, require ("./requests/profile/block/getblockstate").GetBlockState)

//TOKENS
// app.get('/auth/checkaccesstoken', require('./requests/session/checkaccesstoken').CheckAccessToken)
app.get('/auth/refreshtoken/logout', logout, require('./requests/login/logout').Logout)
app.get('/auth/refreshtoken/update', updateToken, require('./requests/session/updateaccesstoken').UpdateAccessToken)

//PROFILE
app.post('/auth/editprofile', editProfile, require("./requests/profile/editprofile").EditProfile)
app.get('/getuserprofile', getUsers, require('./requests/profile/getuserprofile').GetUserProfile)

//NOTIFICATIONS
app.get('/auth/getnotifications', getNotifications, require('./requests/notifications/getnotifications').GetNotifications)

//POSTS
app.post('/auth/sendpost', sendPost, require('./requests/posts/sendpost').SendPost)
app.post('/auth/like', like, require('./requests/posts/likes/like').Like)
app.get('/auth/getposts', getPosts, require('./requests/posts/getposts').GetPosts)
app.get('/auth/getpostsabove', getPostsAbove, require('./requests/posts/getpostsabove').GetPostsAbove)
app.post('/auth/deletepost', deletePost, require('./requests/posts/deletepost').DeletePost)

server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

//DELETE USERS WITH UNVERIFIED EMAIL
setInterval(async () => {
    await db.query(`
    DELETE FROM users 
    WHERE verified = 0 
    AND created_at < ?
    `, [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()])
}, 60 * 60 * 1000)

//DELETE EXPIRED TOKENS
setInterval(async () => {
    await db.query(`
    DELETE FROM tokens 
    WHERE expires_at < ?
    `, [new Date().toISOString()])
}, 60 * 60 * 1000)

setInterval(async () => {

    const [rows] = await db.query(`
        SELECT message_id
        FROM messages_to_delete
        ORDER BY message_id ASC
        LIMIT 50
    `, [])

    if (!rows.length) return;

    try {
        await Promise.all(rows.map(row => DeleteImageFromFolder(`messages/${row.message_id}`)))

        const idsToDelete = rows.map(row => row.message_id)
        await db.query(
            `DELETE FROM messages_to_delete WHERE message_id IN (?)`,
            [idsToDelete]
        )

        console.log("Deleted unused images")
    } catch {}
}, 60 * 60 * 1000)