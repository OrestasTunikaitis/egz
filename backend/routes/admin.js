const express = require('express')
const User = require('../models/User')
const Event = require('../models/Event')
const { auth, requireRole } = require('../middleware/auth')

const router = express.Router()

// All admin routes require auth + admin role
router.use(auth)
router.use(requireRole('admin'))

// List users
router.get('/users', async (req, res) => {
  const users = await User.find().select('-passwordHash')
  res.json(users)
})

// Change user role or block
router.patch('/users/:id', async (req, res) => {
  const { role, blocked } = req.body
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: 'Not found' })
  if (role) user.role = role
  if (typeof blocked === 'boolean') user.blocked = blocked
  await user.save()
  res.json({ ok: true })
})

// List all events (including unapproved/blocked)
router.get('/events', async (req, res) => {
  const events = await Event.find().populate('createdBy', 'name email')
  res.json(events)
})

// Approve event
router.patch('/events/:id/approve', async (req, res) => {
  const ev = await Event.findById(req.params.id)
  if (!ev) return res.status(404).json({ error: 'Not found' })
  ev.approved = true
  await ev.save()
  res.json({ ok: true })
})

// Block event or content
router.patch('/events/:id/block', async (req, res) => {
  const ev = await Event.findById(req.params.id)
  if (!ev) return res.status(404).json({ error: 'Not found' })
  ev.blocked = true
  await ev.save()
  res.json({ ok: true })
})

// Permanently delete event (admin only)
router.delete('/events/:id', async (req, res) => {
  const ev = await Event.findById(req.params.id)
  if (!ev) return res.status(404).json({ error: 'Not found' })
  await Event.deleteOne({ _id: req.params.id })
  res.json({ ok: true })
})

module.exports = router
