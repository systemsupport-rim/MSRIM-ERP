const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { from_date, to_date, category } = req.query;
  let items = [];

  // Academic events — include events that start, end, or span the requested period
  let evtQ = "SELECT id, title, description, event_date as start_date, end_date, venue as location, category, 'event' as type FROM events WHERE 1=1";
  const evtP = [];
  if (from_date && to_date) {
    evtQ += ' AND (event_date <= ? AND COALESCE(end_date, event_date) >= ?)';
    evtP.push(to_date, from_date);
  } else if (from_date) {
    evtQ += ' AND COALESCE(end_date, event_date) >= ?'; evtP.push(from_date);
  } else if (to_date) {
    evtQ += ' AND event_date <= ?'; evtP.push(to_date);
  }
  items.push(...db.prepare(evtQ).all(...evtP));

  // Examinations
  let examQ = "SELECT e.id, e.name as title, c.name || ' (' || e.exam_type || ')' as description, e.exam_date as start_date, e.exam_date as end_date, e.room as location, 'exam' as category, 'exam' as type FROM examinations e JOIN courses c ON e.course_id = c.id WHERE e.exam_date IS NOT NULL";
  const examP = [];
  if (from_date) { examQ += ' AND e.exam_date >= ?'; examP.push(from_date); }
  if (to_date) { examQ += ' AND e.exam_date <= ?'; examP.push(to_date); }
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { examQ += ' AND c.program_id = ? AND c.semester = ?'; examP.push(stu.program_id, stu.semester); }
  } else if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { examQ += ' AND c.faculty_id = ?'; examP.push(fac.id); }
  }
  items.push(...db.prepare(examQ).all(...examP));

  // Venue bookings
  if (['admin','registrar','faculty'].includes(req.user.role)) {
    let bookQ = "SELECT vb.id, vb.purpose as title, r.room_number || ' - ' || b.name as description, vb.booking_date as start_date, vb.booking_date as end_date, r.room_number as location, 'venue' as category, 'venue' as type FROM venue_bookings vb JOIN infra_rooms r ON vb.room_id = r.id JOIN buildings b ON r.building_id = b.id WHERE vb.status = 'confirmed'";
    const bookP = [];
    if (from_date) { bookQ += ' AND vb.booking_date >= ?'; bookP.push(from_date); }
    if (to_date) { bookQ += ' AND vb.booking_date <= ?'; bookP.push(to_date); }
    if (req.user.role === 'faculty') { bookQ += ' AND vb.booked_by = ?'; bookP.push(req.user.id); }
    items.push(...db.prepare(bookQ).all(...bookP));
  }

  // LMS Assignment due dates
  let asnQ = "SELECT a.id, a.title, c.name || ' Assignment Due' as description, a.due_date as start_date, a.due_date as end_date, '' as location, 'assignment' as category, 'assignment' as type FROM lms_assignments a JOIN courses c ON a.course_id = c.id WHERE a.due_date IS NOT NULL AND a.status = 'active'";
  const asnP = [];
  if (from_date) { asnQ += ' AND a.due_date >= ?'; asnP.push(from_date); }
  if (to_date) { asnQ += ' AND a.due_date <= ?'; asnP.push(to_date); }
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { asnQ += ' AND c.program_id = ? AND c.semester = ?'; asnP.push(stu.program_id, stu.semester); }
  }
  items.push(...db.prepare(asnQ).all(...asnP));

  if (category) items = items.filter(i => i.category === category || i.type === category);
  items.sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''));
  res.json(items);
});

router.post('/events', authorize('admin','registrar','hod','faculty'), (req, res) => {
  const { title, description, event_date, end_date, venue, category, organizer } = req.body;
  const result = db.prepare('INSERT INTO events (title,description,event_date,end_date,venue,category,organizer,created_by) VALUES (?,?,?,?,?,?,?,?)').run(title,description||'',event_date,end_date||event_date,venue||'',category||'academic',organizer||'',req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/events', (req, res) => {
  const { from_date, to_date } = req.query;
  let q = 'SELECT e.*, u.name as created_by_name FROM events e LEFT JOIN users u ON e.created_by = u.id WHERE 1=1';
  const params = [];
  if (from_date) { q += ' AND e.event_date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND e.event_date <= ?'; params.push(to_date); }
  q += ' ORDER BY e.event_date DESC';
  res.json(db.prepare(q).all(...params));
});

router.delete('/events/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ message: 'Event deleted.' });
});

module.exports = router;
