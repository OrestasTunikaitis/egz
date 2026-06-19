const express = require('express')
const Event = require('../models/Event')
const Rating = require('../models/Rating')
const { auth, requireOwnershipOrAdmin } = require('../middleware/auth')

const router = express.Router()

// List events (public - exclude deleted/blocked/unapproved)
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({ blocked: false, approved: true, deleted: { $ne: true } }).populate('createdBy', 'name')
    res.json(events)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get event by id
router.get('/:id', async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id).populate('createdBy', 'name email')
    if (!ev) return res.status(404).json({ error: 'Not found' })
    res.json(ev)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Create event (auth)
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, startAt, location, images } = req.body
    const ev = new Event({ title, description, category, startAt, location, images, createdBy: req.user._id, approved: false })
    await ev.save()
    res.status(201).json(ev)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update event (owner or admin)
router.put('/:id', auth, async (req, res, next) => {
  try {
    const ev = await Event.findById(req.params.id)
    if (!ev) return res.status(404).json({ error: 'Not found' })
    // ownership check
    if (String(ev.createdBy) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    const { title, description, category, startAt, location, images } = req.body
    Object.assign(ev, { title, description, category, startAt, location, images, updatedAt: new Date() })
    await ev.save()
    res.json(ev)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete event (owner or admin) - soft delete
router.delete('/:id', auth, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id)
    if (!ev) return res.status(404).json({ error: 'Not found' })
    if (String(ev.createdBy) !== String(req.user._id) && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
    ev.deleted = true
    await ev.save()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add rating to event
router.post('/:id/ratings', auth, async (req, res) => {
  try {
    const { score, comment } = req.body
    const ev = await Event.findById(req.params.id)
    if (!ev) return res.status(404).json({ error: 'Event not found' })
    const rating = new Rating({ eventId: ev._id, userId: req.user._id, score, comment })
    await rating.save()
    res.status(201).json(rating)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Get ratings for event
router.get('/:id/ratings', async (req, res) => {
  try {
    const ratings = await Rating.find({ eventId: req.params.id }).populate('userId', 'name')
    res.json(ratings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
