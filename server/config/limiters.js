const rateLimit = require('express-rate-limit');

const sendMessages = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You're sending too many messages. Wait a minute."
        })
    }
})

const deleteMessages = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You're sending too many messages. Wait a minute."
        })
    }
})

const getMessages = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You're sending too many messages. Wait a minute."
        })
    }
})

const linkVerifications = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const accountCreation = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const login = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const accesssettings = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const emailchange = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const passwordchange = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const logoutusers = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const settings2FA = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const callState = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const callActions = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const followAndBlock = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const updateToken = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const logout = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const getUsers = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const getFollow = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const getBlock = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const editProfile = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const getNotifications = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const getPosts = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const getPostsAbove = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const sendPost = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const deletePost = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})

const like = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json({
            message: "You've been sending too many requests, try again later."
        })
    }
})


module.exports = {
    deletePost,
    getPostsAbove,
    getPosts,
    like,
    sendPost,
    getNotifications,
    editProfile,
    getUsers,
    getFollow,
    getBlock,
    logout,
    updateToken,
    followAndBlock,
    callActions,
    callState,
    settings2FA,
    logoutusers,
    emailchange,
    passwordchange,
    accesssettings,
    sendMessages,
    getMessages,
    deleteMessages,
    linkVerifications,
    accountCreation,
    login
}