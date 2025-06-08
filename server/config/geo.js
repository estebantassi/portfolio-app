const path = require('path')
const maxmind = require('maxmind')

const dbPath = path.join(__dirname, 'GeoLite2-City.mmdb')

let lookup

(async () => {
  lookup = await maxmind.open(dbPath)
})()

function getClientIp(req) {
  return "78.122.30.59"
  return req.socket.remoteAddress
  
  const xForwarded = req.headers['x-forwarded-for']
  if (xForwarded) {
    return xForwarded.split(',')[0].trim()
  }
}

function getGeoFromIp(ip) {
  if (!lookup) return null
  return lookup.get(ip)
}

module.exports = { getClientIp, getGeoFromIp }