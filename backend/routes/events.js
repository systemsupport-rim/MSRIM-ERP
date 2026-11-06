const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
  try {
    const total    = db.prepare("SELECT COUNT(*) as c FROM events").get().c;
    const upcoming = db.prepare("SELECT COUNT(*) as c FROM events WHERE status='upcoming'").get().c;
    const ongoing  = db.prepare("SELECT COUNT(*) as c FROM events WHERE status='ongoing'").get().c;
    const regs     = db.prepare("SELECT COUNT(*) as c FROM event_registrations").get().c;
    res.json({ total, upcoming, ongoing, totalRegistrations: regs });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/', authenticate, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT e.*, u.name as created_by_name,
        (SELECT COUNT(*) FROM event_registrations WHERE event_id=e.id) as registration_count
      FROM events e LEFT JOIN users u ON e.created_by=u.id
      ORDER BY e.start_date DESC
    `).all();
    res.json(events);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', authenticate, authorize('admin', 'registrar', 'hod', 'faculty'), (req, res) => {
  try {
    const { title, description, event_type, start_date, end_date, start_time, end_time, venue, organizer, max_participants } = req.body;
    if (!title || !start_date) return res.status(400).json({ error: 'Title and start date are required.' });
    const r = db.prepare(`
      INSERT INTO events (title,description,event_type,start_date,end_date,start_time,end_time,venue,organizer,max_participants,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(title, description, event_type||'general', start_date, end_date, start_time, end_time, venue, organizer, max_participants||null, req.user.id);
    res.json({ id: r.lastInsertRowid, message: 'Event created.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/status', authenticate, authorize('admin', 'registrar', 'hod'), (req, res) => {
  try {
    const { status } = req.body;
    db.prepare("UPDATE events SET status=? WHERE id=?").run(status, req.params.id);
    res.json({ message: 'Status updated.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', authenticate, authorize('admin', 'registrar'), (req, res) => {
  try {
    db.prepare("DELETE FROM events WHERE id=?").run(req.params.id);
    res.json({ message: 'Event deleted.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/register', authenticate, (req, res) => {
  try {
    db.prepare("INSERT OR IGNORE INTO event_registrations (event_id,user_id) VALUES (?,?)").run(req.params.id, req.user.id);
    res.json({ message: 'Registered.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
