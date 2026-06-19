const mongoose = require('mongoose')
const User = require('./models/User')

mongoose.connect('mongodb://localhost:27017/egz').then(async () => {
  const updated = await User.updateOne({email:'test@example.com'}, {$set:{role:'admin'}})
  console.log('Updated:', updated.modifiedCount > 0 ? 'admin role set' : 'user not found')
  process.exit(0)
}).catch(e => {
  console.error('Error:', e.message)
  process.exit(1)
})
