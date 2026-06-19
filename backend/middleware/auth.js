const jwt = require('jsonwebtoken')
const User = require('../models/User')

const jwtSecret = process.env.JWT_SECRET || 'change_this_in_production'

async function auth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, jwtSecret)
    const user = await User.findById(payload.id).select('-passwordHash')
    if (!user) return res.status(401).json({ error: 'User not found' })
    if (user.blocked) return res.status(403).json({ error: 'User blocked' })
    req.user = user
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

function requireOwnershipOrAdmin(getResourceUserId) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' })
    if (req.user.role === 'admin') return next()
    const ownerId = getResourceUserId(req)
    if (!ownerId) return res.status(403).json({ error: 'Forbidden' })
    if (String(ownerId) !== String(req.user._id)) return res.status(403).json({ error: 'Forbidden' })
    next()
  }
}

module.exports = { auth, requireRole, requireOwnershipOrAdmin }
