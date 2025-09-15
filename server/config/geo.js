const path = require('path')
const maxmind = require('maxmind')

const dbPath = path.join(__dirname, 'GeoLite2-City.mmdb')

let lookup

(async () => {
  lookup = await maxmind.open(dbPath)
})()

function getClientIp(req) {
  if (!req) return null

  const xForwarded = req.headers?.['x-forwarded-for']
  if (xForwarded) {
    return xForwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || null
}

function getGeoFromIp(ip) {
  if (!lookup) return null
  return lookup.get(ip)
}

module.exports = { getClientIp, getGeoFromIp }