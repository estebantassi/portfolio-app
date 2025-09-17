    const redis = require('redis')
    require('dotenv').config()

    const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
    })

    redisClient.on('error', (err) => {
    console.error('❌ Redis connection error:', err)
    })

    async function connectRedis() {
    if (!redisClient.isOpen) {
        await redisClient.connect()
    } else {
        console.log("redis used")
    }
    }

    async function getCachedValue(key) {
        await connectRedis()
        return await redisClient.get(key)
    }

    async function setCachedValue(key, ttlInSeconds, value) {
        await connectRedis()
        await redisClient.setEx(key, ttlInSeconds, value)
    }

    async function deleteCachedValue(key) {
        await connectRedis()
        await redisClient.del(key)
    }

    module.exports = {
    getCachedValue,
    setCachedValue,
    deleteCachedValue
    }