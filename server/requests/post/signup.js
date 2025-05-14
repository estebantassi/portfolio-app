const db = require('../../config/database')

const Signup = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.username || !req.body.email || !req.body.emailcheck || !req.body.password || passwordcheck) return res.status(400).json("Please fill out all the necessary fields")


        
    try {
        await db.query(`
            INSERT INTO users (username)
            VALUES (?)
            `, [req.body.username])

    } catch (err) {
        console.log(err)
    }

}

module.exports = { Signup }