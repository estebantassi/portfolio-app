require('dotenv').config()
const db = require('../../config/database')
const { GetImage } = require("../../tools/getimage")

const GetUserProfile = async (req, res) => {

    if (req.query == null || req.query.id == null) return res.status(400).json({message: "Missing data"})
    
    const id = req.query.id
    if (isNaN(id)) return res.status(400).json({message: "Invalid id format"})

    try {
        const [[request]] = await db.query(`
            SELECT username, avatar, banner, tag, messagekey_public
            FROM users
            WHERE id=?
            `, [id])
        
        if (request == null || request.username == null || request.avatar == null || request.banner == null || request.tag == null || request.messagekey_public == null) return res.status(400).json({message: "User not found"})

        let avatarimage
        if (request.avatar == 1) avatarimage = await GetImage("avatar/" + id + "." + request.avatar)
        else avatarimage = await GetImage("avatar/0.jpeg")

        return res.status(200).json({message: "Data retrieved", username: request.username, avatar: avatarimage, tag: request.tag, key: request.messagekey_public})
    } catch (err) {
        return res.status(500).json({message: "An error occured, please try again later"})
    }
}

module.exports = { GetUserProfile }