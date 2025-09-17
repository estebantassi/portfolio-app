const { Server } = require('socket.io')
const cookie = require('cookie')
const { GetTokenData } = require('../tools/helper functions/gettokendata')
const { validatetoken } = require('../tools/tools')
const { getCachedValue, deleteCachedValue, setCachedValue } = require('./redis')
const { GetFollowStateServer } = require('../requests/profile/follow/getfollowstateserver')
const { GetBlockStateServer } = require('../requests/profile/block/getblockstateserver')
const allowedOrigins = require('./cors-allowed-origins');
require('dotenv').config()

let io

function initSocket(server) {
    io = new Server(server, {
        path: '/auth/socket.io',
        cors: {
            origin: allowedOrigins,
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

        socket.on("signal", async ({ to, data }) => {

            if (await GetFollowStateServer(socket.userId, to) != 2) return socket.emit('error', { message: "You're not following each other." })

            setCachedValue(`callsocket/${socket.userId}`, process.env.CALLSOCKET_CACHE_DURATION, socket.id.toString())

            io.to(to.toString()).emit("signal", { from: socket.userId, data })
        })

        socket.on('disconnect', async () => {
            const call = JSON.parse(await getCachedValue(`call/${socket.userId}`))

            if (call)
            {
                const socketvalue = await getCachedValue(`callsocket/${socket.userId}`)
                if (socketvalue && socketvalue == socket.id) 
                {
                        await deleteCachedValue(`call/${call.id}`)
                        await deleteCachedValue(`call/${socket.userId}`)

                        getIO().to(call.id.toString()).emit('endedcall')
                }
            }
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
