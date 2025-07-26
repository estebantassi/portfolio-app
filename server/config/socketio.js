const { Server } = require('socket.io');
const cookie = require('cookie')
const { GetTokenData } = require('../tools/helper functions/gettokendata');
const { validatetoken } = require('../tools/tools');
const { getCachedValue } = require('./redis');
const { GetFollowStateServer } = require('../requests/profile/follow/getfollowstateserver');
const { GetBlockStateServer } = require('../requests/profile/block/getblockstateserver');

let io

function initSocket(server) {
    io = new Server(server, {
        path: '/auth/socket.io',
        cors: {
            origin: 'http://localhost:5173',
            credentials: true,
        },
    })

    io.use((socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie
        if (!cookieHeader) return next(new Error('No cookie transmitted'))
        const cookies = cookie.parse(cookieHeader)
        socket.request.cookies = cookies
        next()
    })

    io.on('connection', async (socket) => {
        const token = socket.request.cookies['accesstoken']
        if (!validatetoken(token)) return socket.emit('error', { message: 'Invalid token format' })

        let ip = socket.handshake.address
        if (socket.handshake.headers['x-forwarded-for']) { ip = socket.handshake.headers['x-forwarded-for'].split(',')[0].trim() }
        const req = { socket: { remoteAddress: ip } }

        const data = await GetTokenData(req, token, "access")
        if (data == null) return socket.emit('error', { message: 'Invalid token' })

        socket.join(data.id.toString())
        socket.userId = data.id

        socket.on("signal", ({ to, data }) => {

            io.to(to.toString()).emit("signal", { from: socket.userId, data })

            return
            const status = getCachedValue(`call/${socket.userId}/${to}`) == "online" && getCachedValue(`call/${to}/${socket.userId}`) == "online"
            if (status) io.to(to).emit("signal", { from: socket.userId, data })
        })

        socket.on('disconnect', () => {
            
        })
    })

    return io
}

function getIO() {
    if (!io) {
        throw new Error('Socket.io not initialized!')
    }
    return io
}

module.exports = {
    initSocket,
    getIO,
}
