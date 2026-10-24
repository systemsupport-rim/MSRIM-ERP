const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

const DAY_ORDER = "CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END";

function timesOverlap(s1, e1, s2, e2) { return s1 < e2 && s2 < e1; }

// ── Rooms ─────────────────────────────────────────────────────────────────────
router.get('/rooms', (req, res) => {
  const rooms = db.prepare(`
    SELECT r.*, b.name as building_name, b.code as building_code,
      (SELECT COUNT(*) FROM timetable t WHERE t.room = r.room_number) as slot_count
    FROM infra_rooms r JOIN buildings b ON r.building_id = b.id
    WHERE r.is_active = 1
    ORDER BY b.name, r.floor, r.room_number
  `).all();
  res.json(rooms);
});

// ── Slots (enriched timetable) ────────────────────────────────────────────────
router.get('/slots', (req, res) => {
  const { program_id, semester, room, faculty_id, day, academic_year_id } = req.query;
  let q = `
    SELECT t.id, t.day, t.start_time, t.end_time, t.room, t.course_id, t.academic_year_id,
      c.name as course_name, c.code as course_code, c.semester, c.credits, c.faculty_id as c_faculty_id,
      p.id as program_id, p.name as program_name, p.code as program_code,
      u.name as faculty_name, u.department as faculty_department,
      r.capacity as room_capacity, r.room_type, r.has_projector, r.has_ac,
      b.name as building_name
    FROM timetable t
    JOIN courses c ON t.course_id = c.id
    JOIN programs p ON c.program_id = p.id
    LEFT JOIN faculty f ON c.faculty_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN infra_rooms r ON t.room = r.room_number
    LEFT JOIN buildings b ON r.building_id = b.id
    WHERE 1=1`;
  const params = [];
  if (program_id)        { q += ' AND p.id = ?';          params.push(program_id); }
  if (semester)          { q += ' AND c.semester = ?';     params.push(semester); }
  if (room)              { q += ' AND t.room = ?';         params.push(room); }
  if (faculty_id)        { q += ' AND f.id = ?';           params.push(faculty_id); }
  if (day)               { q += ' AND t.day = ?';          params.push(day); }
  if (academic_year_id)  { q += ' AND t.academic_year_id = ?'; params.push(academic_year_id); }
  q += ` ORDER BY CASE t.day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END, t.start_time`;
  res.json(db.prepare(q).all(...params));
});

// ── Conflict detection ────────────────────────────────────────────────────────
router.get('/conflicts', (req, res) => {
  const slots = db.prepare(`
    SELECT t.id, t.day, t.start_time, t.end_time, t.room,
      c.code as course_code, c.name as course_name, c.semester, c.program_id,
      p.code as program_code, f.id as faculty_id, u.name as faculty_name
    FROM timetable t
    JOIN courses c ON t.course_id = c.id
    JOIN programs p ON c.program_id = p.id
    LEFT JOIN faculty f ON c.faculty_id = f.id
    LEFT JOIN users u ON f.user_id = u.id
  `).all();

  const conflicts = [];
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      if (a.day !== b.day) continue;
      if (!timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) continue;
      if (a.room && b.room && a.room === b.room)
        conflicts.push({ type: 'room', severity: 'critical', day: a.day, time: `${a.start_time}–${a.end_time}`, detail: `Room ${a.room}`, slot_a: { id: a.id, code: a.course_code }, slot_b: { id: b.id, code: b.course_code } });
      if (a.faculty_id && b.faculty_id && a.faculty_id === b.faculty_id)
        conflicts.push({ type: 'faculty', severity: 'critical', day: a.day, time: `${a.start_time}–${a.end_time}`, detail: a.faculty_name, slot_a: { id: a.id, code: a.course_code }, slot_b: { id: b.id, code: b.course_code } });
      if (a.program_id === b.program_id && a.semester === b.semester)
        conflicts.push({ type: 'group', severity: 'warning', day: a.day, time: `${a.start_time}–${a.end_time}`, detail: `${a.program_code} Sem ${a.semester}`, slot_a: { id: a.id, code: a.course_code }, slot_b: { id: b.id, code: b.course_code } });
    }
  }
  const conflictSlotIds = new Set(conflicts.flatMap(c => [c.slot_a.id, c.slot_b.id]));
  res.json({ conflicts, count: conflicts.length, conflict_slot_ids: [...conflictSlotIds] });
});

// ── Create slot with conflict check ──────────────────────────────────────────
router.post('/slots', authorize('admin', 'hod', 'registrar'), (req, res) => {
  const { course_id, day, start_time, end_time, room, academic_year_id, force } = req.body;
  if (!course_id || !day || !start_time || !end_time)
    return res.status(400).json({ error: 'course_id, day, start_time, end_time required.' });

  const course = db.prepare(`
    SELECT c.*, c.program_id, c.semester, f.id as faculty_db_id
    FROM courses c LEFT JOIN faculty f ON c.faculty_id = f.id WHERE c.id = ?
  `).get(course_id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });

  const ayId = academic_year_id || db.prepare("SELECT id FROM academic_years WHERE is_current = 1").get()?.id;
  const warnings = [], errors = [];

  if (room) {
    const rc = db.prepare(`SELECT t.id, c.code FROM timetable t JOIN courses c ON t.course_id = c.id WHERE t.room = ? AND t.day = ? AND t.start_time < ? AND t.end_time > ?`).get(room, day, end_time, start_time);
    if (rc) errors.push(`Room ${room} already booked for ${rc.code} at this time`);
  }
  if (course.faculty_db_id) {
    const fc = db.prepare(`SELECT t.id, c.code FROM timetable t JOIN courses c ON t.course_id = c.id WHERE c.faculty_id = ? AND t.day = ? AND t.start_time < ? AND t.end_time > ?`).get(course.faculty_id, day, end_time, start_time);
    if (fc) errors.push(`Faculty already teaching ${fc.code} at this time`);
  }
  const gc = db.prepare(`SELECT t.id, c.code FROM timetable t JOIN courses c ON t.course_id = c.id WHERE c.program_id = ? AND c.semester = ? AND t.day = ? AND t.start_time < ? AND t.end_time > ?`).get(course.program_id, course.semester, day, end_time, start_time);
  if (gc) warnings.push(`Student group (Sem ${course.semester}) already has ${gc.code} at this time`);

  if (errors.length && !force) return res.status(409).json({ error: 'Conflict detected', errors, warnings });

  const result = db.prepare('INSERT INTO timetable (course_id, day, start_time, end_time, room, academic_year_id) VALUES (?,?,?,?,?,?)').run(course_id, day, start_time, end_time, room || null, ayId);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Slot created.', warnings });
});

// ── Update slot ───────────────────────────────────────────────────────────────
router.put('/slots/:id', authorize('admin', 'hod', 'registrar'), (req, res) => {
  const { day, start_time, end_time, room } = req.body;
  const existing = db.prepare('SELECT * FROM timetable WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Slot not found.' });
  db.prepare('UPDATE timetable SET day=?, start_time=?, end_time=?, room=? WHERE id=?')
    .run(day || existing.day, start_time || existing.start_time, end_time || existing.end_time, room !== undefined ? room : existing.room, req.params.id);
  res.json({ message: 'Slot updated.' });
});

// ── Delete slot ───────────────────────────────────────────────────────────────
router.delete('/slots/:id', authorize('admin', 'hod', 'registrar'), (req, res) => {
  db.prepare('DELETE FROM timetable WHERE id = ?').run(req.params.id);
  res.json({ message: 'Slot removed.' });
});

// ── Substitutions ─────────────────────────────────────────────────────────────
router.get('/substitutions', (req, res) => {
  const { from, to } = req.query;
  let q = `
    SELECT s.*, t.day, t.start_time, t.end_time, t.room as original_room,
      c.name as course_name, c.code as course_code,
      su.name as substitute_name, cu.name as created_by_name
    FROM schedule_substitutions s
    JOIN timetable t ON s.timetable_id = t.id
    JOIN courses c ON t.course_id = c.id
    LEFT JOIN faculty sf ON s.substitute_faculty_id = sf.id
    LEFT JOIN users su ON sf.user_id = su.id
    LEFT JOIN users cu ON s.created_by = cu.id
    WHERE 1=1`;
  const params = [];
  if (from) { q += ' AND s.date >= ?'; params.push(from); }
  if (to)   { q += ' AND s.date <= ?'; params.push(to); }
  q += ' ORDER BY s.date DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/substitutions', authorize('admin', 'hod', 'registrar'), (req, res) => {
  const { timetable_id, date, type, substitute_faculty_id, new_room, reason } = req.body;
  if (!timetable_id || !date || !type) return res.status(400).json({ error: 'timetable_id, date, type required.' });
  const existing = db.prepare("SELECT id FROM schedule_substitutions WHERE timetable_id=? AND date=?").get(timetable_id, date);
  if (existing) {
    db.prepare('UPDATE schedule_substitutions SET type=?,substitute_faculty_id=?,new_room=?,reason=?,created_by=? WHERE id=?')
      .run(type, substitute_faculty_id || null, new_room || null, reason || null, req.user.id, existing.id);
    return res.json({ message: 'Substitution updated.' });
  }
  const r = db.prepare('INSERT INTO schedule_substitutions (timetable_id,date,type,substitute_faculty_id,new_room,reason,created_by) VALUES (?,?,?,?,?,?,?)').run(timetable_id, date, type, substitute_faculty_id || null, new_room || null, reason || null, req.user.id);
  res.status(201).json({ id: r.lastInsertRowid, message: 'Substitution recorded.' });
});

router.delete('/substitutions/:id', authorize('admin', 'hod', 'registrar'), (req, res) => {
  db.prepare('DELETE FROM schedule_substitutions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Substitution removed.' });
});

// ── Faculty load view ─────────────────────────────────────────────────────────
router.get('/faculty-load', (req, res) => {
  const rows = db.prepare(`
    SELECT f.id as faculty_id, u.name as faculty_name, u.department,
      t.day, t.start_time, t.end_time, t.room,
      c.name as course_name, c.code as course_code, c.semester, p.code as program_code
    FROM faculty f JOIN users u ON f.user_id = u.id
    JOIN courses c ON c.faculty_id = f.id
    JOIN timetable t ON t.course_id = c.id
    JOIN programs p ON c.program_id = p.id
    WHERE 1=1
    ORDER BY u.name, t.day, t.start_time
  `).all();
  const byFaculty = {};
  rows.forEach(r => {
    if (!byFaculty[r.faculty_id]) byFaculty[r.faculty_id] = { faculty_id: r.faculty_id, faculty_name: r.faculty_name, department: r.department, slots: [], total_hours: 0 };
    byFaculty[r.faculty_id].slots.push(r);
    const [sh, sm] = r.start_time.split(':').map(Number);
    const [eh, em] = r.end_time.split(':').map(Number);
    byFaculty[r.faculty_id].total_hours += (eh * 60 + em - sh * 60 - sm) / 60;
  });
  res.json(Object.values(byFaculty).sort((a, b) => b.total_hours - a.total_hours));
});

// ── Room utilization ──────────────────────────────────────────────────────────
router.get('/utilization', (req, res) => {
  const TOTAL_POSSIBLE = 6 * 8;
  const rooms = db.prepare(`
    SELECT r.id, r.room_number, r.room_type, r.capacity, b.name as building,
      COUNT(t.id) as slots_used,
      ROUND(COUNT(t.id) * 100.0 / ?, 1) as utilization_pct
    FROM infra_rooms r JOIN buildings b ON r.building_id = b.id
    LEFT JOIN timetable t ON t.room = r.room_number
    WHERE r.is_active = 1
    GROUP BY r.id ORDER BY utilization_pct DESC
  `).all(TOTAL_POSSIBLE);

  const byDay = db.prepare(`
    SELECT day, COUNT(*) as slots FROM timetable GROUP BY day
    ORDER BY CASE day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END
  `).all();
  const byTime = db.prepare("SELECT start_time, COUNT(*) as slots FROM timetable GROUP BY start_time ORDER BY start_time").all();
  const totalSlots = db.prepare('SELECT COUNT(*) as c FROM timetable').get().c;
  const roomsUsed  = db.prepare("SELECT COUNT(DISTINCT room) as c FROM timetable WHERE room IS NOT NULL AND room != ''").get().c;

  res.json({ rooms, byDay, byTime, totalSlots, roomsUsed, totalPossible: TOTAL_POSSIBLE });
});

module.exports = router;
