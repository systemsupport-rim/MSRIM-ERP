const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

const DAY_ORDER = "CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END";

router.get('/', (req, res) => {
  const { program_id, semester, day, academic_year_id, faculty_id } = req.query;
  let q = `SELECT t.*, c.name as course_name, c.code as course_code, c.credits, c.semester,
    p.name as program_name, p.code as program_code,
    u.name as faculty_name, f.employee_id, ay.name as academic_year
    FROM timetable t
    JOIN courses c ON t.course_id = c.id
    JOIN programs p ON c.program_id = p.id
    LEFT JOIN faculty f ON c.faculty_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN academic_years ay ON t.academic_year_id = ay.id
    WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND c.program_id = ? AND c.semester = ?'; params.push(stu.program_id, stu.semester); }
  } else if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { q += ' AND c.faculty_id = ?'; params.push(fac.id); }
  } else {
    if (program_id) { q += ' AND c.program_id = ?'; params.push(program_id); }
    if (semester) { q += ' AND c.semester = ?'; params.push(semester); }
    if (faculty_id) { q += ' AND c.faculty_id = ?'; params.push(faculty_id); }
  }
  if (day) { q += ' AND t.day = ?'; params.push(day); }
  if (academic_year_id) { q += ' AND t.academic_year_id = ?'; params.push(academic_year_id); }
  q += ` ORDER BY ${DAY_ORDER}, t.start_time`;
  res.json(db.prepare(q).all(...params));
});

router.get('/weekly', (req, res) => {
  const { program_id, semester, academic_year_id } = req.query;
  let q = `SELECT t.*, c.name as course_name, c.code as course_code, c.semester,
    p.name as program_name, u.name as faculty_name, f.employee_id
    FROM timetable t
    JOIN courses c ON t.course_id = c.id
    JOIN programs p ON c.program_id = p.id
    LEFT JOIN faculty f ON c.faculty_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
    WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND c.program_id = ? AND c.semester = ?'; params.push(stu.program_id, stu.semester); }
  } else if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { q += ' AND c.faculty_id = ?'; params.push(fac.id); }
  } else {
    if (program_id) { q += ' AND c.program_id = ?'; params.push(program_id); }
    if (semester) { q += ' AND c.semester = ?'; params.push(semester); }
  }
  const ay = academic_year_id || db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get()?.id;
  if (ay) { q += ' AND t.academic_year_id = ?'; params.push(ay); }
  q += ' ORDER BY t.start_time';
  const slots = db.prepare(q).all(...params);
  const weekly = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [] };
  slots.forEach(s => { if (weekly[s.day]) weekly[s.day].push(s); });
  res.json(weekly);
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM timetable').get();
  const byDay = db.prepare(`SELECT day, COUNT(*) as count FROM timetable GROUP BY day ORDER BY ${DAY_ORDER}`).all();
  const programs = db.prepare('SELECT DISTINCT p.id, p.name FROM timetable t JOIN courses c ON t.course_id = c.id JOIN programs p ON c.program_id = p.id').all();
  res.json({ totalSlots: total.c, byDay, programs });
});

router.post('/', authorize('admin', 'hod', 'registrar'), (req, res) => {
  const { course_id, day, start_time, end_time, room, academic_year_id } = req.body;
  if (!course_id || !day || !start_time || !end_time) return res.status(400).json({ error: 'course_id, day, start_time and end_time are required.' });
  const ay = academic_year_id || db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get()?.id || 1;
  if (room) {
    const conflict = db.prepare(`SELECT id FROM timetable WHERE room = ? AND day = ? AND academic_year_id = ?
      AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`).get(room, day, ay, start_time, start_time, end_time, end_time, start_time, end_time);
    if (conflict) return res.status(400).json({ error: 'Room already scheduled for this time slot.' });
  }
  const result = db.prepare('INSERT INTO timetable (course_id, day, start_time, end_time, room, academic_year_id) VALUES (?, ?, ?, ?, ?, ?)').run(course_id, day, start_time, end_time, room || null, ay);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/bulk', authorize('admin', 'hod', 'registrar'), (req, res) => {
  const { slots, academic_year_id } = req.body;
  if (!Array.isArray(slots)) return res.status(400).json({ error: 'slots array required.' });
  const ay = academic_year_id || db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get()?.id || 1;
  const stmt = db.prepare('INSERT INTO timetable (course_id, day, start_time, end_time, room, academic_year_id) VALUES (?, ?, ?, ?, ?, ?)');
  const insertAll = db.transaction((rows) => rows.forEach(s => stmt.run(s.course_id, s.day, s.start_time, s.end_time, s.room || null, ay)));
  insertAll(slots);
  res.status(201).json({ message: `${slots.length} slots created.` });
});

router.put('/:id', authorize('admin', 'hod', 'registrar'), (req, res) => {
  const slot = db.prepare('SELECT * FROM timetable WHERE id = ?').get(req.params.id);
  if (!slot) return res.status(404).json({ error: 'Timetable slot not found.' });
  const { day, start_time, end_time, room } = req.body;
  db.prepare('UPDATE timetable SET day=?, start_time=?, end_time=?, room=? WHERE id=?').run(day || slot.day, start_time || slot.start_time, end_time || slot.end_time, room !== undefined ? room : slot.room, req.params.id);
  res.json({ message: 'Updated.' });
});

router.delete('/:id', authorize('admin', 'hod', 'registrar'), (req, res) => {
  db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
