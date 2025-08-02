const db = require('../../config/database')
const bcrypt = require('bcrypt')
var jwt = require('jsonwebtoken')
require('dotenv').config()
const transporter = require('../../config/mailsender').transporter
const { getClientIp, getGeoFromIp } = require('../../config/geo')
const { GetTokenData } = require('../../tools/helper functions/gettokendata')
const { Check2FAcode } = require('../../tools/helper functions/check2facode')
const { v4: uuidv4 } = require('uuid')
const { decrypt, validatetoken, validatecode } = require('../../tools/tools')
const { CheckUserExpirations } = require("../../tools/helper functions/checkuserexpirations")
const { GetImage } = require('../../tools/helper functions/getimage')

const LoginCode = async (req, res) => {
    let connection
    try {
        const logintoken = req?.cookies?.logintoken
        const data = await GetTokenData(req, logintoken, "logintoken")
        if (data == null || data.step == null || data.step != 1) return res.status(400).json({message: "Invalid token"})
        
        const code = req?.body?.code
        if (!validatecode(code)) return res.status(400).json({message: "Invalid code format"})
        
        connection = await db.getConnection()
        await connection.beginTransaction()
        const [[requestuser]] = await connection.query(`
            SELECT 2FA, username, email_encrypted, tag, messagekey_encrypted, messagesalt, 2FAsecret, avatar, banner, bio
            FROM users
            WHERE id = ?
            FOR UPDATE
        `, [data.id])
        
        if (requestuser == null) return res.status(400).json({message: "User not found"})

        let request
        if (requestuser['2FA'] == 0)
        {
            [[request]] = await connection.query(`
                SELECT expires_at, id
                FROM tokens
                WHERE userid=? AND value=? AND type=?
                LIMIT 1
            `, [data.id, req.body.code, 'logincode'])

            if (request == null) {
                connection.rollback()
                return res.status(400).json({message: "Invalid code"})
            }

        } else if (requestuser['2FA'] == 1)
        {
            const is2FAvalid = await Check2FAcode(data.id, req.body.code)
            if (!is2FAvalid) return res.status(400).json({message: "Invalid code"})
        }

        const ip = getClientIp(req)
        const geo = getGeoFromIp(ip)

        res.clearCookie("refreshtoken", { path: "/auth/refreshtoken" })
        res.clearCookie("accesstoken", { path: "/auth" })
        res.clearCookie("logintoken", { path: "/logintoken" })

        try {
            await connection.query(`
            DELETE FROM tokens
            WHERE id=?
            `, [data.tokenid])
        } catch (err) {}

        const ipsalt = await bcrypt.genSalt()
        const cryptedip = await bcrypt.hash(ip, ipsalt)

        const accessDurationMs = Number(process.env.ACCESS_TOKEN_DURATION) * 60 * 60 * 1000
        const accessdate = new Date(Date.now() + accessDurationMs)
        const accesstokenjti = uuidv4()
        var accesstoken = jwt.sign({ id: data.id, ip: ip, jti: accesstokenjti }, process.env.ACCESS_TOKEN_SECRET)
        res.cookie("accesstoken", accesstoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth",
            maxAge: accessDurationMs
        })

        const [tokenrequest] = await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at, ip)
            VALUES (?, ?, ?, ?, ?)
        `, [data.id, 'access', accesstokenjti, accessdate.toISOString(), cryptedip])

        if (tokenrequest == null) {
            await connection.rollback()
            return res.status(400).json({message: "Error"})
        }

        const refreshDurationMs = Number(process.env.REFRESH_TOKEN_DURATION) * 60 * 60 * 1000
        const refreshdate = new Date(Date.now() + refreshDurationMs)
        const refreshtokenjti = uuidv4()
        var refreshtoken = jwt.sign({ id: data.id, ip: ip, jti: refreshtokenjti, accesstokenid: tokenrequest.insertId }, process.env.REFRESH_TOKEN_SECRET)
        res.cookie("refreshtoken", refreshtoken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            path: "/auth/refreshtoken",
            maxAge: refreshDurationMs
        })

        await connection.query(`
            INSERT INTO tokens (userid, type, value, expires_at, ip)
            VALUES (?, ?, ?, ?, ?)
        `, [data.id, 'refresh', refreshtokenjti, refreshdate.toISOString(), cryptedip])

        if (requestuser['2FA'] == 0)
        {
            try {
                await connection.query(`
                DELETE FROM tokens
                WHERE id=?
                `, [request.id])
            } catch (err) { }
        }

        const decryptedemail = decrypt(requestuser.email_encrypted, process.env.EMAIL_ENCRYPTION_KEY)

        if(requestuser['2FA'] == 0)
        {
            transporter.sendMail({
                from: '"Portfolio security system" <' + process.env.EMAIL + '>',
                to: requestuser.username + ' <' + decryptedemail + '>',
                subject: "New login on your account",
                html: "<p>Hello ! Someone logged into your account ! If it's not you, there's an issue !</p>",
            })
        }

        CheckUserExpirations(data.id)

        const avatar = await GetImage(requestuser.avatar == 1 ? `avatar/${data.id}` : "avatar/0")
        const banner = await GetImage(requestuser.banner == 1 ? `banner/${data.id}` : "banner/0")

        await connection.commit()
        return res.status(200).json({
            message: "Successfully logged in",
            user: {
                username: requestuser.username,
                id: data.id,
                tag: requestuser.tag,
                encryptedkey: requestuser.messagekey_encrypted,
                salt: requestuser.messagesalt,
                avatar,
                banner,
                bio: requestuser.bio
            },
            encrypted2FAsecret: requestuser['2FAsecret'],
            has2FA: requestuser['2FA']
        })
    } catch (err) {
        if (process.env.STATE == 'dev') console.error(err)
        if (connection) await connection.rollback()
        return res.status(500).json({message: "An error occured, please try again later"})
    } finally {
        if (connection) connection.release()
    }
}

module.exports = { LoginCode }