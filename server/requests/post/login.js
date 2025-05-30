const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { generatelogincode } = require("../../tools/tools")

const Login = async (req, res) => {

    if (!req.body) return res.status(400).json("Wrong request")
    if (!req.body.email || !req.body.password) return res.status(400).json("Please fill out all the necessary fields")

    const email = req.body.email
    const password = req.body.password

    try {
        const [[request]] = await db.query(`
            SELECT password, logincodes, id
            FROM users
            WHERE email=?
            `, [email])

        if (!request) return res.status(400).json("User not found")

        const match = await bcrypt.compare(password, request.password)
        if (!match) return res.status(400).json("Wrong password")

        const code = generatelogincode()

        let oldlogincodes = request.logincodes.split(" , ").slice(-2)
        oldlogincodes.push(code) 

        let newlogincodes = ""
        oldlogincodes.forEach(element => {
            if (element != "")
            {
            if (newlogincodes == "") newlogincodes = element
            else newlogincodes = newlogincodes + " , " + element
            }
        })

        const temptoken = jwt.sign({ id: request.id }, process.env.TEMP_TOKEN_SECRET)
        res.cookie("temptoken", temptoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/",
            maxAge: process.env.TEMP_TOKEN_DURATION * 60 * 1000
        })


        await db.query(`
            UPDATE users
            SET logincodes = ?
            WHERE email=?
            `, [newlogincodes, email])

transporter.sendMail({
    from: '"Portfolio security system" <' + process.env.EMAIL + '>',
    to: request.username + ' <' + email + '>',
    subject: "Login code",
    html: `
    <div style="text-align: center; font-family: Arial, sans-serif; padding: 20px;">
        <h3 style="margin-bottom: 10px;">Here is your login code:</h3>
        <h1 style="margin: 0; font-size: 36px; color: #2c3e50;">${code}</h1>
        <p style="margin-top: 20px; font-size: 14px; color: #555;">
            If you did not request this code, please contact our support team and change your password.
        </p>
    </div>
    `,
});

        return res.status(200).json({ message: "A login code has been sent to your email" })
    } catch (err) {
        console.log(err)
        return res.status(400).json("An error occured, please try again later")
    }

}

module.exports = { Login }