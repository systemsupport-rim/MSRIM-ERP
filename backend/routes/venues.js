const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { type, is_active } = req.query;
  let q = `SELECT v.* FROM venues v WHERE 1=1`;
  const params = [];
  if (type)      { q += ' AND v.type=?';      params.push(type); }
  if (is_active !== undefined) { q += ' AND v.is_active=?'; params.push(is_active === 'false' ? 0 : 1); }
  q += ' ORDER BY v.name';
  res.json(db.prepare(q).all(...params));
});

router.post('/', authorize('admin','registrar','hod'), (req, res) => {
  const { name, type, capacity, location, features } = req.body;
  const r = db.prepare('INSERT INTO venues (name,type,capacity,location,features,created_by) VALUES (?,?,?,?,?,?)').run(name, type || 'hall', capacity || 50, location || '', JSON.stringify(features || []), req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { name, type, capacity, location, is_active } = req.body;
  const sets = []; const vals = [];
  if (name      !== undefined) { sets.push('name=?');      vals.push(name); }
  if (type      !== undefined) { sets.push('type=?');      vals.push(type); }
  if (capacity  !== undefined) { sets.push('capacity=?');  vals.push(capacity); }
  if (location  !== undefined) { sets.push('location=?');  vals.push(location); }
  if (is_active !== undefined) { sets.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
  vals.push(req.params.id);
  db.prepare(`UPDATE venues SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ message: 'Updated.' });
});

// Campus Venue Bookings (separate from infra room bookings)
router.get('/bookings', (req, res) => {
  const { venue_id, date, status } = req.query;
  let q = `SELECT cb.*, v.name as venue_name, u.name as booked_by_name
    FROM campus_bookings cb JOIN venues v ON cb.venue_id = v.id LEFT JOIN users u ON cb.booked_by = u.id WHERE 1=1`;
  const params = [];
  if (venue_id) { q += ' AND cb.venue_id=?'; params.push(venue_id); }
  if (date)     { q += ' AND cb.date=?';     params.push(date); }
  if (status)   { q += ' AND cb.status=?';   params.push(status); }
  q += ' ORDER BY cb.date DESC, cb.start_time';
  try { res.json(db.prepare(q).all(...params)); } catch { res.json([]); }
});

router.post('/bookings', (req, res) => {
  const { venue_id, title, date, start_time, end_time, purpose } = req.body;
  try {
    const r = db.prepare('INSERT INTO campus_bookings (venue_id,booked_by,title,date,start_time,end_time,purpose) VALUES (?,?,?,?,?,?,?)').run(venue_id, req.user.id, title, date, start_time, end_time, purpose || '');
    res.status(201).json({ id: r.lastInsertRowid });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

router.put('/bookings/:id/approve', authorize('admin','registrar','hod'), (req, res) => {
  db.prepare("UPDATE campus_bookings SET status='approved', approved_by=? WHERE id=?").run(req.user.id, req.params.id);
  res.json({ message: 'Booking approved.' });
});

router.put('/bookings/:id/reject', authorize('admin','registrar','hod'), (req, res) => {
  db.prepare("UPDATE campus_bookings SET status='rejected' WHERE id=?").run(req.params.id);
  res.json({ message: 'Booking rejected.' });
});

module.exports = router;
