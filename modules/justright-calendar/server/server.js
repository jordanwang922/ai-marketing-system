require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: 'sqlite' });
});

// Users API
app.get('/api/users', (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users').all();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', (req, res) => {
  const { id, name, color } = req.body;
  const insert = db.prepare(`
    INSERT INTO users (id, name, color)
    VALUES (?, ?, ?)
  `);
  
  try {
    insert.run(id, name, color);
    res.status(201).json({ message: 'User created', id });
  } catch (err) {
    console.error('User creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Events API
app.get('/api/events', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY startDate ASC').all();
    // Map SQLite integers back to booleans
    const formattedEvents = events.map(e => ({
      ...e,
      isAllDay: !!e.isAllDay,
      // dates are stored as TEXT in SQLite, they will be parsed by new Date() in the frontend
    }));
    res.json(formattedEvents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/events', (req, res) => {
  const { id, title, titleEn, userId, startDate, endDate, startTime, endTime, isAllDay } = req.body;
  const insert = db.prepare(`
    INSERT INTO events (id, title, titleEn, userId, startDate, endDate, startTime, endTime, isAllDay, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  try {
    insert.run(id, title, titleEn, userId, startDate, endDate, startTime || null, endTime || null, isAllDay ? 1 : 0);
    res.status(201).json({ message: 'Event created', id });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/events/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Exclude id from updates
  const { id: _, ...rest } = updates;
  const keys = Object.keys(rest);
  if (keys.length === 0) return res.status(400).json({ error: 'No fields to update' });

  const fields = keys.map(key => `${key} = ?`).join(', ');
  const values = Object.values(rest).map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
  
  try {
    const update = db.prepare(`UPDATE events SET ${fields} WHERE id = ?`);
    update.run(...values, id);
    res.json({ message: 'Event updated' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  const { id } = req.params;
  try {
    db.prepare('DELETE FROM events WHERE id = ?').run(id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`SQLite Server running at http://localhost:${PORT}`);
});
