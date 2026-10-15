const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Get attendance records ────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { date, user_id, from_date, to_date, department, role } = req.query;
  let q = `SELECT sa.*, u.name, u.role, u.department
    FROM staff_attendance sa JOIN users u ON sa.user_id = u.id WHERE 1=1`;
  const params = [];

  if (!['admin','registrar','hod'].includes(req.user.role)) {
    q += ' AND sa.user_id = ?'; params.push(req.user.id);
  } else {
    if (user_id) { q += ' AND sa.user_id = ?'; params.push(user_id); }
    if (department) { q += ' AND u.department = ?'; params.push(department); }
    if (role) { q += ' AND u.role = ?'; params.push(role); }
  }
  if (date) { q += ' AND sa.date = ?'; params.push(date); }
  if (from_date) { q += ' AND sa.date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND sa.date <= ?'; params.push(to_date); }
  q += ' ORDER BY sa.date DESC, u.name';
  res.json(db.prepare(q).all(...params));
});

// ── Staff list for a given date (for bulk marking) ───────────────────────────
router.get('/daily/:date', authorize('admin','registrar','hod'), (req, res) => {
  const { department, role_filter } = req.query;
  let q = `SELECT u.id as user_id, u.name, u.role, u.department,
    sa.id as att_id, sa.status, sa.check_in, sa.check_out, sa.remarks
    FROM users u
    LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.date = ?
    WHERE u.is_active = 1 AND u.role IN ('faculty','admin','registrar','hod','librarian','accounts','placement')`;
  const params = [req.params.date];
  if (department) { q += ' AND u.department = ?'; params.push(department); }
  if (role_filter) { q += ' AND u.role = ?'; params.push(role_filter); }
  q += ' ORDER BY u.name';
  const staff = db.prepare(q).all(...params);
  res.json(staff.map(s => ({ ...s, status: s.status || 'absent' })));
});

// ── Bulk mark attendance for a date ──────────────────────────────────────────
router.post('/bulk', authorize('admin','registrar','hod'), (req, res) => {
  const { date, records } = req.body;
  if (!date || !records?.length) return res.status(400).json({ error: 'date and records required.' });
  const stmt = db.prepare(`INSERT INTO staff_attendance (user_id,date,status,check_in,check_out,marked_by,remarks)
    VALUES (?,?,?,?,?,?,?)
    ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status,check_in=excluded.check_in,check_out=excluded.check_out,remarks=excluded.remarks`);
  const insertAll = db.transaction(recs => recs.forEach(r => stmt.run(r.user_id, date, r.status || 'present', r.check_in || null, r.check_out || null, req.user.id, r.remarks || null)));
  insertAll(records);
  res.json({ message: `Attendance marked for ${records.length} staff.` });
});

// ── Self check-in / check-out ────────────────────────────────────────────────
router.post('/checkin', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().slice(0, 5);
  try {
    db.prepare(`INSERT INTO staff_attendance (user_id,date,check_in,status,marked_by) VALUES (?,?,?,'present',?)
      ON CONFLICT(user_id,date) DO UPDATE SET check_in=excluded.check_in`).run(req.user.id, today, time, req.user.id);
    res.json({ message: 'Checked in.', time });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.post('/checkout', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().slice(0, 5);
  const existing = db.prepare('SELECT id FROM staff_attendance WHERE user_id=? AND date=?').get(req.user.id, today);
  if (!existing) return res.status(400).json({ error: 'Check-in first.' });
  db.prepare('UPDATE staff_attendance SET check_out=? WHERE user_id=? AND date=?').run(time, req.user.id, today);
  res.json({ message: 'Checked out.', time });
});

// ── Monthly summary per user ──────────────────────────────────────────────────
router.get('/summary/:userId', (req, res) => {
  const { month, year } = req.query;
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const y = year || new Date().getFullYear();
  const prefix = `${y}-${m}`;

  if (req.user.role !== 'admin' && req.user.role !== 'registrar' && req.user.role !== 'hod' && req.user.id.toString() !== req.params.userId) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const records = db.prepare(`SELECT * FROM staff_attendance WHERE user_id=? AND date LIKE ? ORDER BY date`).all(req.params.userId, `${prefix}%`);
  const counts = { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, holiday: 0, od: 0 };
  records.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });
  const workingDays = records.filter(r => !['holiday'].includes(r.status)).length;
  const pct = workingDays > 0 ? ((counts.present + counts.od + counts.half_day * 0.5) / workingDays * 100).toFixed(1) : 0;
  res.json({ records, summary: { ...counts, workingDays, attendancePct: pct, month: m, year: y } });
});

// ── All staff monthly summary (for dashboard) ────────────────────────────────
router.get('/summary-all', authorize('admin','registrar','hod'), (req, res) => {
  const { month, year, department } = req.query;
  const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const y = year || new Date().getFullYear();

  let q = `SELECT u.id, u.name, u.role, u.department,
    COUNT(sa.id) as total_records,
    SUM(CASE WHEN sa.status='present' THEN 1 ELSE 0 END) as present,
    SUM(CASE WHEN sa.status='absent' THEN 1 ELSE 0 END) as absent,
    SUM(CASE WHEN sa.status='late' THEN 1 ELSE 0 END) as late,
    SUM(CASE WHEN sa.status='half_day' THEN 0.5 ELSE 0 END) as half_day,
    SUM(CASE WHEN sa.status='on_leave' THEN 1 ELSE 0 END) as on_leave,
    SUM(CASE WHEN sa.status='od' THEN 1 ELSE 0 END) as od,
    ROUND(100.0 * (SUM(CASE WHEN sa.status IN ('present','od') THEN 1 WHEN sa.status='late' THEN 1 WHEN sa.status='half_day' THEN 0.5 ELSE 0 END)) / NULLIF(SUM(CASE WHEN sa.status != 'holiday' THEN 1 ELSE 0 END),0),1) as pct
    FROM users u
    LEFT JOIN staff_attendance sa ON sa.user_id = u.id AND sa.date LIKE ?
    WHERE u.is_active = 1 AND u.role IN ('faculty','admin','registrar','hod','librarian','accounts','placement')`;
  const params = [`${y}-${m}%`];
  if (department) { q += ' AND u.department = ?'; params.push(department); }
  q += ' GROUP BY u.id ORDER BY u.name';
  res.json(db.prepare(q).all(...params));
});

// ── Regularization requests ───────────────────────────────────────────────────
router.get('/regularization', (req, res) => {
  let q = `SELECT ar.*, u.name, au.name as approved_by_name FROM attendance_regularization ar
    JOIN users u ON ar.user_id = u.id LEFT JOIN users au ON ar.approved_by = au.id WHERE 1=1`;
  const params = [];
  if (!['admin','registrar','hod'].includes(req.user.role)) {
    q += ' AND ar.user_id = ?'; params.push(req.user.id);
  }
  q += ' ORDER BY ar.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/regularization', (req, res) => {
  const { date, requested_status, reason } = req.body;
  const r = db.prepare('INSERT INTO attendance_regularization (user_id,date,requested_status,reason) VALUES (?,?,?,?)').run(req.user.id, date, requested_status, reason);
  res.status(201).json({ id: r.lastInsertRowid, message: 'Regularization request submitted.' });
});

router.put('/regularization/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { status, remarks } = req.body;
  const reg = db.prepare('SELECT * FROM attendance_regularization WHERE id=?').get(req.params.id);
  if (!reg) return res.status(404).json({ error: 'Not found.' });
  db.prepare('UPDATE attendance_regularization SET status=?,remarks=?,approved_by=? WHERE id=?').run(status, remarks || '', req.user.id, req.params.id);
  if (status === 'approved') {
    db.prepare(`INSERT INTO staff_attendance (user_id,date,status,marked_by,remarks) VALUES (?,?,?,?,?)
      ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status`).run(reg.user_id, reg.date, reg.requested_status, req.user.id, `Regularized: ${remarks || ''}`);
  }
  res.json({ message: `Regularization ${status}.` });
});

// ── Departments list for filters ──────────────────────────────────────────────
router.get('/departments', authorize('admin','registrar','hod'), (req, res) => {
  const depts = db.prepare("SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND role != 'student' ORDER BY department").all();
  res.json(depts.map(d => d.department));
});

module.exports = router;
