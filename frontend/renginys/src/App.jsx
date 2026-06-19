import { useState } from 'react'
import './App.css'

function App() {
  const [page, setPage] = useState('login') // login, events, detail, create, admin
  const [authMode, setAuthMode] = useState('login') // login or register
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Login failed')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      setError('')
      setPage('events')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message || 'Registration failed')
        return
      }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setToken(data.token)
      setUser(data.user)
      setError('')
      setPage('events')
    } catch (e) {
      setError(e.message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    setPage('login')
    setAuthMode('login')
    setEmail('')
    setPassword('')
    setName('')
  }

  if (!token) {
    return (
      <div className="container">
        <h1>City Events</h1>
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={() => setAuthMode('login')}
              style={{ flex: 1, background: authMode === 'login' ? '#007bff' : '#ccc' }}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode('register')}
              style={{ flex: 1, background: authMode === 'register' ? '#007bff' : '#ccc' }}
            >
              Register
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin}>
              <h2>Login</h2>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit">Login</button>
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <h2>Register</h2>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit">Register</button>
              {error && <p style={{ color: 'red' }}>{error}</p>}
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <h1>City Events</h1>
      <div className="header">
        <p>Logged in as: <strong>{user.name}</strong> ({user.role})</p>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <nav>
        <button onClick={() => setPage('events')}>Events</button>
        <button onClick={() => setPage('create')}>Create Event</button>
        {user.role === 'admin' && <button onClick={() => setPage('admin')}>Admin Panel</button>}
      </nav>

      {page === 'events' && <EventsPage token={token} user={user} />}
      {page === 'create' && <CreateEventPage token={token} user={user} />}
      {page === 'admin' && user.role === 'admin' && <AdminPage token={token} />}
    </div>
  )
}

function EventsPage({ token, user }) {
  const [events, setEvents] = useState([])
  const [eventRatings, setEventRatings] = useState({}) // { eventId: [ratings...] }
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [ratings, setRatings] = useState([])
  const [loading, setLoading] = useState(false)
  const [ratingScore, setRatingScore] = useState(5)
  const [ratingComment, setRatingComment] = useState('')
  const [message, setMessage] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editStartAt, setEditStartAt] = useState('')
  const [filterCategory, setFilterCategory] = useState('All')
  
  const loadEvents = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/events')
      const data = await res.json()
      setEvents(data)
      
      // Fetch ratings for all events
      const allRatings = {}
      for (const evt of data) {
        try {
          const ratingsRes = await fetch(`/api/events/${evt._id}/ratings`)
          const ratingsData = await ratingsRes.json()
          allRatings[evt._id] = ratingsData
        } catch (e) {
          allRatings[evt._id] = []
        }
      }
      setEventRatings(allRatings)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const getAverageRating = (eventId) => {
    const ratings = eventRatings[eventId] || []
    if (ratings.length === 0) return null
    const sum = ratings.reduce((acc, r) => acc + r.score, 0)
    return (sum / ratings.length).toFixed(1)
  }

  const getRatingCount = (eventId) => {
    return (eventRatings[eventId] || []).length
  }

  const viewEventDetails = async (evt) => {
    setSelectedEvent(evt)
    setIsEditing(false)
    setMessage('')
    setRatingComment('')
    setRatingScore(5)
    try {
      const res = await fetch(`/api/events/${evt._id}/ratings`)
      const data = await res.json()
      setRatings(data)
    } catch (e) {
      console.error(e)
    }
  }

  const handleSubmitRating = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/events/${selectedEvent._id}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ score: parseInt(ratingScore), comment: ratingComment })
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage('Error: ' + (data.message || 'Failed to submit rating'))
        return
      }
      setMessage('Rating submitted!')
      setRatingComment('')
      setRatingScore(5)
      // Reload ratings
      const ratingsRes = await fetch(`/api/events/${selectedEvent._id}/ratings`)
      const ratingsData = await ratingsRes.json()
      setRatings(ratingsData)
      // Update eventRatings state for card display
      setEventRatings(prev => ({
        ...prev,
        [selectedEvent._id]: ratingsData
      }))
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  const startEdit = () => {
    setEditTitle(selectedEvent.title)
    setEditCategory(selectedEvent.category)
    setEditLocation(selectedEvent.location)
    setEditStartAt(selectedEvent.startAt.slice(0, 16))
    setIsEditing(true)
  }

  const handleUpdateEvent = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`/api/events/${selectedEvent._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editTitle,
          category: editCategory,
          location: editLocation,
          startAt: editStartAt
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage('Error: ' + (data.message || 'Update failed'))
        return
      }
      setMessage('Event updated!')
      setIsEditing(false)
      // Update selected event
      setSelectedEvent(data)
      // Reload events list
      loadEvents()
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  const handleDeleteEvent = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return
    try {
      const res = await fetch(`/api/events/${selectedEvent._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) {
        setMessage('Error: Delete failed')
        return
      }
      setMessage('Event deleted!')
      setTimeout(() => {
        setSelectedEvent(null)
        loadEvents()
      }, 1000)
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  const isCreator = selectedEvent && user.id === selectedEvent.createdBy._id
  const isAdmin = user.role === 'admin'
  const canEdit = isCreator || isAdmin


  const filteredEvents =
  filterCategory === 'All'
    ? events
    : events.filter(evt => evt.category === filterCategory)

  if (selectedEvent) {
    return (
      <div>
        <button onClick={() => setSelectedEvent(null)} style={{ marginBottom: '15px' }}>← Back to Events</button>
        
        {!isEditing ? (
          <>
            <h2>{selectedEvent.title}</h2>
            <p><strong>Category:</strong> {selectedEvent.category}</p>
            <p><strong>Location:</strong> 📍 {selectedEvent.location}</p>
            <p><strong>Date:</strong> 📅 {new Date(selectedEvent.startAt).toLocaleString()}</p>
            <p><strong>Created by:</strong> {selectedEvent.createdBy.name}</p>

            {selectedEvent.images && selectedEvent.images.length > 0 && (
            <img
          src={selectedEvent.images[0]}
          alt={selectedEvent.title}
          style={{
               width: '300px',
               marginTop: '15px',
               borderRadius: '8px'
       }}
     />
   )}


            {canEdit && (
              <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                <button onClick={startEdit} style={{ background: '#ffc107', color: 'black' }}>✏️ Edit</button>
                <button onClick={handleDeleteEvent} style={{ background: '#dc3545' }}>🗑️ Delete</button>
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleUpdateEvent} style={{ background: '#f9f9f9', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
            <h3>Edit Event</h3>
            <input
              type="text"
              placeholder="Title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
            />
            <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)}>
              <option>Music</option>
              <option>Sports</option>
              <option>Art</option>
              <option>Theater</option>
              <option>Other</option>
            </select>
            <input
              type="text"
              placeholder="Location"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              required
            />
            <input
              type="datetime-local"
              value={editStartAt}
              onChange={(e) => setEditStartAt(e.target.value)}
              required
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" style={{ flex: 1, background: '#28a745' }}>Save</button>
              <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, background: '#6c757d' }}>Cancel</button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '30px', padding: '15px', background: '#f0f0f0', borderRadius: '5px' }}>
          <h3>Ratings ({ratings.length})</h3>
          {ratings.length === 0 ? (
            <p>No ratings yet. Be the first to rate!</p>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              {ratings.map((r, i) => (
                <div key={i} style={{ background: 'white', padding: '10px', marginBottom: '10px', borderRadius: '5px' }}>
                  <p><strong>⭐ {r.score}/5</strong> - {r.userId?.name || 'Anonymous'}</p>
                  <p>{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {token && (
            <form onSubmit={handleSubmitRating}>
              <h4>Submit Your Rating</h4>
              <select value={ratingScore} onChange={(e) => setRatingScore(e.target.value)}>
                <option value="1">⭐ 1 - Poor</option>
                <option value="2">⭐ 2 - Fair</option>
                <option value="3">⭐ 3 - Good</option>
                <option value="4">⭐ 4 - Very Good</option>
                <option value="5">⭐ 5 - Excellent</option>
              </select>
              <textarea
                placeholder="Your review (optional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                style={{ width: '100%', minHeight: '80px', marginTop: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '5px' }}
              />
              <button type="submit" style={{ marginTop: '10px', width: '100%' }}>Submit Rating</button>
            </form>
          )}
          {message && <p style={{ marginTop: '10px', color: message.includes('Error') ? 'red' : 'green' }}>{message}</p>}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2>Events</h2>

<select
  value={filterCategory}
  onChange={(e) => setFilterCategory(e.target.value)}
  style={{ marginBottom: '10px', marginRight: '10px' }}
>
  <option value="All">All Categories</option>
  <option value="Music">Music</option>
  <option value="Sports">Sports</option>
  <option value="Art">Art</option>
  <option value="Theater">Theater</option>
  <option value="Other">Other</option>
</select>

<button onClick={loadEvents}>
  {loading ? 'Loading...' : 'Load Events'}
</button>

      <div className="events-list">
        {filteredEvents.map((evt) => {
          const avgRating = getAverageRating(evt._id)
          const ratingCount = getRatingCount(evt._id)
          return (
            <div key={evt._id} className="event-card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }} onClick={() => viewEventDetails(evt)}>
              <div style={{ flex: 1 }}>
                <h3>{evt.title}</h3>
                <p><strong>{evt.category}</strong></p>
                <p>📍 {evt.location}</p>
                <p>📅 {new Date(evt.startAt).toLocaleString()}</p>
                <p>By: {evt.createdBy.name}</p>
                <p style={{ fontSize: '12px', color: '#999' }}>Click to view details & ratings</p>
              </div>
              <div style={{ textAlign: 'center', minWidth: '80px', paddingLeft: '15px' }}>
                {avgRating ? (
                  <>
                    <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 5px 0' }}>⭐ {avgRating}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>({ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'})</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '14px', color: '#999', margin: '0 0 5px 0' }}>No ratings</p>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CreateEventPage({ token, user }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('Music')
  const [location, setLocation] = useState('')
  const [startAt, setStartAt] = useState('')
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [message, setMessage] = useState('')

  const handleImageSelect = (e) => {
    const file = e.target.files[0]

    if (file) {
      const reader = new FileReader()

      reader.onload = (event) => {
        setImage(event.target.result)
        setImagePreview(event.target.result)
      }

      reader.readAsDataURL(file)
    }
  }


const handleCreate = async (e) => {
  e.preventDefault()

  try {

    const body = {
      title,
      category,
      location,
      startAt
    }

    if (image) {
      body.images = [image]
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    })



      const data = await res.json()

      if (!res.ok) {
        setMessage('Error: ' + (data.message || 'Creation failed'))
        return
      }


      setMessage('Event created! (waiting for admin approval)')

      setTitle('')
      setLocation('')
      setStartAt('')
      setImage(null)
      setImagePreview(null)

    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

 return (
    <div>
      <h2>Create Event</h2>


      <form onSubmit={handleCreate}>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />


        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>Music</option>
          <option>Sports</option>
          <option>Art</option>
          <option>Theater</option>
          <option>Other</option>
        </select>


        <input
          type="text"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />


        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          required
        />


        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
        />


        {imagePreview && (
          <div>
            <p>Image Preview:</p>

            <img
              src={imagePreview}
              alt="preview"
              style={{
                width: '200px',
                borderRadius: '8px'
              }}
            />

          </div>
        )}


        <button type="submit">
          Create
        </button>


      </form>


      {message && <p>{message}</p>}

    </div>
  )
}

function AdminPage({ token }) {
  const [events, setEvents] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const loadEvents = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/events', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setEvents(data)
    } catch (e) {
      setMessage('Error loading events: ' + e.message)
    }
    setLoading(false)
  }

  const loadUsers = async () => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      setMessage('Error loading users: ' + e.message)
    }
    setLoading(false)
  }

  const handleApprove = async (eventId) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/approve`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Approve failed')
      setMessage('Event approved!')
      loadEvents()
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  const handleBlock = async (eventId) => {
    try {
      const res = await fetch(`/api/admin/events/${eventId}/block`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Block failed')
      setMessage('Event blocked!')
      loadEvents()
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  const handlePermanentDelete = async (eventId) => {
    if (!window.confirm('Permanently delete this event? This cannot be undone.')) return
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Delete failed')
      setMessage('Event permanently deleted!')
      loadEvents()
    } catch (e) {
      setMessage('Error: ' + e.message)
    }
  }

  const pendingEvents = events.filter((e) => !e.approved && !e.blocked && !e.deleted)
  const approvedEvents = events.filter((e) => e.approved && !e.blocked && !e.deleted)
  const blockedEvents = events.filter((e) => e.blocked && !e.deleted)
  const deletedEvents = events.filter((e) => e.deleted)

  return (
    <div>
      <h2>Admin Panel</h2>
      {message && <p style={{ color: message.includes('Error') ? 'red' : 'green' }}>{message}</p>}

      <div className="admin-section">
        <h3>Pending Events ({pendingEvents.length})</h3>
        <button onClick={loadEvents}>{loading ? 'Loading...' : 'Load Events'}</button>
        <div className="events-list">
          {pendingEvents.map((evt) => (
            <div key={evt._id} className="event-card" style={{ borderLeft: '4px solid orange' }}>
              <h4>{evt.title}</h4>
              <p><strong>{evt.category}</strong> • 📍 {evt.location}</p>
              <p>📅 {new Date(evt.startAt).toLocaleString()}</p>
              <p>By: {evt.createdBy.name}</p>

              {evt.images && evt.images.length > 0 && (
           <img
             src={evt.images[0]}
             alt={evt.title}
             style={{
               width: '200px',
               height: '120px',
               objectFit: 'cover',
               borderRadius: '5px'
             }}
           />
         )}

              <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleApprove(evt._id)}
                  style={{ background: '#28a745', flex: 1 }}
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => handleBlock(evt._id)}
                  style={{ background: '#dc3545', flex: 1 }}
                >
                  ✗ Block
                </button>
              </div>
            </div>
          ))}
          {pendingEvents.length === 0 && <p>No pending events</p>}
        </div>
      </div>

      <div className="admin-section">
        <h3>Approved Events ({approvedEvents.length})</h3>
        <div className="events-list">
          {approvedEvents.map((evt) => (
            <div key={evt._id} className="event-card" style={{ borderLeft: '4px solid green' }}>
              <h4>{evt.title}</h4>
              <p><strong>{evt.category}</strong> • 📍 {evt.location}</p>
              <p>By: {evt.createdBy.name}</p>
            </div>
          ))}
          {approvedEvents.length === 0 && <p>No approved events</p>}
        </div>
      </div>

      <div className="admin-section">
        <h3>Blocked Events ({blockedEvents.length})</h3>
        <div className="events-list">
          {blockedEvents.map((evt) => (
            <div key={evt._id} className="event-card" style={{ borderLeft: '4px solid red', opacity: 0.6 }}>
              <h4>{evt.title}</h4>
              <p>By: {evt.createdBy.name}</p>
            </div>
          ))}
          {blockedEvents.length === 0 && <p>No blocked events</p>}
        </div>
      </div>

      <div className="admin-section">
        <h3>Deleted Events ({deletedEvents.length})</h3>
        <div className="events-list">
          {deletedEvents.map((evt) => (
            <div key={evt._id} className="event-card" style={{ borderLeft: '4px solid gray', opacity: 0.5 }}>
              <h4>{evt.title}</h4>
              <p>By: {evt.createdBy.name}</p>
              <button
                onClick={() => handlePermanentDelete(evt._id)}
                style={{ background: '#000', color: 'white', marginTop: '8px', width: '100%' }}
              >
                🗑️ Permanently Delete
              </button>
            </div>
          ))}
          {deletedEvents.length === 0 && <p>No deleted events</p>}
        </div>
      </div>

      <div className="admin-section">
        <h3>Users</h3>
        <button onClick={loadUsers}>{loading ? 'Loading...' : 'Load Users'}</button>
        <div className="users-list">
          {users.map((u) => (
            <div key={u._id} className="user-card">
              <p><strong>{u.name}</strong> ({u.email})</p>
              <p>Role: {u.role} | Blocked: {u.blocked ? 'Yes' : 'No'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
