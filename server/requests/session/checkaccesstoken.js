require('dotenv').config()

const CheckAccessToken = async (req, res) => {
    try {
        const data = req.accesstokendata
        if (data == null) return res.status(401).json({ message: "Authentication required" })
        return res.status(200).json({message: "Token is valid"})
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { CheckAccessToken }