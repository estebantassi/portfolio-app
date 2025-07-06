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

    module.exports = {
    getCachedValue,
    setCachedValue
    }