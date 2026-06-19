const path = require('path')
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')
const dotenv = require('dotenv')

dotenv.config({ path: path.resolve(__dirname, '.env') })

const app = express()
const port = process.env.PORT || 5000
const mongoUri = process.env.MONGODB_URI
const jwtSecret = process.env.JWT_SECRET || 'change_this_in_production'

if (!mongoUri) {
  console.error('Missing MONGODB_URI in backend/.env')
  process.exit(1)
}

app.use(cors())

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Routes (added below)
const authRoutes = require('./routes/auth')
const eventRoutes = require('./routes/events')
const adminRoutes = require('./routes/admin')

app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/admin', adminRoutes)

mongoose.set('strictQuery', false)

mongoose
  .connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message || err)
    process.exit(1)
  })

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Backend is running' })
})

app.get('/api/db-status', async (req, res) => {
  try {
    const db = mongoose.connection.db
    await db.admin().ping()
    res.json({ ok: true, status: 'connected', readyState: mongoose.connection.readyState })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || String(error) })
  }
})

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`)
})
