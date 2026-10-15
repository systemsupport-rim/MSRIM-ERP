const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const router = express.Router();
router.use(authenticate);

router.get('/', authorize('admin', 'registrar'), (req, res) => {
  const { search } = req.query;
  let q = `SELECT pp.*, u.name as parent_name, u.email, u.phone, u.is_active,
    su.name as student_name, s.enrollment_number, p.name as program_name
    FROM parent_profiles pp JOIN users u ON pp.user_id = u.id JOIN students s ON pp.student_id = s.id
    JOIN users su ON s.user_id = su.id JOIN programs p ON s.program_id = p.id WHERE 1=1`;
  const params = [];
  if (search) { q += ' AND (u.name LIKE ? OR su.name LIKE ? OR s.enrollment_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  q += ' ORDER BY u.name';
  res.json(db.prepare(q).all(...params));
});

router.get('/stats', authorize('admin', 'registrar'), (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM parent_profiles').get();
  const active = db.prepare("SELECT COUNT(*) as c FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE u.is_active = 1").get();
  res.json({ total: total.c, active: active.c });
});

router.get('/my-child', (req, res) => {
  const profile = db.prepare('SELECT pp.*, s.id as student_id FROM parent_profiles pp JOIN users u ON pp.user_id = u.id WHERE pp.user_id = ?').get(req.user.id);
  if (!profile) return res.status(404).json({ error: 'No linked child found.' });
  const student = db.prepare(`SELECT s.*, u.name, u.email, u.phone, p.name as program_name, p.code as program_code
    FROM students s JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id WHERE s.id = ?`).get(profile.student_id);
  res.json({ parent: profile, student });
});

router.get('/child/:studentId/attendance', (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === 'parent') {
    const profile = db.prepare('SELECT student_id FROM parent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile || String(profile.student_id) !== String(studentId)) return res.status(403).json({ error: 'Access denied.' });
  }
  const summary = db.prepare(`SELECT c.name as course_name, c.code,
    COUNT(*) as total, SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
    ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(*), 1) as percentage
    FROM attendance a JOIN courses c ON a.course_id = c.id
    WHERE a.student_id = ? GROUP BY a.course_id ORDER BY c.name`).all(studentId);
  const overall = summary.length ? (summary.reduce((s, r) => s + r.percentage, 0) / summary.length).toFixed(1) : 0;
  res.json({ summary, overall });
});

router.get('/child/:studentId/results', (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === 'parent') {
    const profile = db.prepare('SELECT student_id FROM parent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile || String(profile.student_id) !== String(studentId)) return res.status(403).json({ error: 'Access denied.' });
  }
  const results = db.prepare(`SELECT r.marks_obtained, r.grade, e.name as exam_name, e.exam_type, e.total_marks, e.exam_date,
    c.name as course_name, c.code as course_code, c.semester
    FROM results r JOIN examinations e ON r.examination_id = e.id JOIN courses c ON e.course_id = c.id
    WHERE r.student_id = ? ORDER BY c.semester, e.exam_date`).all(studentId);
  res.json(results);
});

router.get('/child/:studentId/fees', (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === 'parent') {
    const profile = db.prepare('SELECT student_id FROM parent_profiles WHERE user_id = ?').get(req.user.id);
    if (!profile || String(profile.student_id) !== String(studentId)) return res.status(403).json({ error: 'Access denied.' });
  }
  const student = db.prepare('SELECT s.*, p.id as prog_id FROM students s JOIN programs p ON s.program_id = p.id WHERE s.id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  const ay = db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get();
  const structures = db.prepare('SELECT * FROM fee_structures WHERE program_id = ? AND academic_year_id = ?').all(student.prog_id, ay?.id || 1);
  const payments = db.prepare("SELECT fp.*, fs.fee_type FROM fee_payments fp JOIN fee_structures fs ON fp.fee_structure_id = fs.id WHERE fp.student_id = ? ORDER BY fp.payment_date DESC").all(studentId);
  const totalDue = structures.reduce((s, f) => s + f.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount_paid, 0);
  res.json({ structures, payments, totalDue, totalPaid, pending: Math.max(0, totalDue - totalPaid) });
});

router.get('/:id', authorize('admin', 'registrar'), (req, res) => {
  const parent = db.prepare(`SELECT pp.*, u.name as parent_name, u.email, u.phone, u.is_active,
    su.name as student_name, s.enrollment_number, p.name as program_name
    FROM parent_profiles pp JOIN users u ON pp.user_id = u.id JOIN students s ON pp.student_id = s.id
    JOIN users su ON s.user_id = su.id JOIN programs p ON s.program_id = p.id WHERE pp.id = ?`).get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  res.json(parent);
});

router.post('/', authorize('admin', 'registrar'), (req, res) => {
  const { student_id, name, email, phone, relation, occupation, annual_income, address } = req.body;
  const username = `parent_${student_id}_${Date.now().toString().slice(-4)}`;
  const defaultPassword = 'Parent@123';
  try {
    const userResult = db.prepare('INSERT INTO users (username,password,role,name,email,phone,department) VALUES (?,?,?,?,?,?,?)')
      .run(username, bcrypt.hashSync(defaultPassword, 10), 'parent', name, email, phone, 'Parent');
    db.prepare('INSERT INTO parent_profiles (user_id,student_id,relation,occupation,annual_income,address) VALUES (?,?,?,?,?,?)')
      .run(userResult.lastInsertRowid, student_id, relation || 'Parent', occupation || '', annual_income || '', address || '');
    res.status(201).json({ message: 'Parent account created.', username, defaultPassword });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put('/:id', authorize('admin', 'registrar'), (req, res) => {
  const parent = db.prepare('SELECT * FROM parent_profiles WHERE id = ?').get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  const { relation, occupation, annual_income, address, name, phone } = req.body;
  db.prepare('UPDATE parent_profiles SET relation=?, occupation=?, annual_income=?, address=? WHERE id=?')
    .run(relation || '', occupation || '', annual_income || '', address || '', req.params.id);
  if (name || phone) {
    const updates = [];
    const vals = [];
    if (name) { updates.push('name = ?'); vals.push(name); }
    if (phone) { updates.push('phone = ?'); vals.push(phone); }
    vals.push(parent.user_id);
    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...vals);
  }
  res.json({ message: 'Parent updated.' });
});

router.put('/:id/deactivate', authorize('admin', 'registrar'), (req, res) => {
  const parent = db.prepare('SELECT user_id FROM parent_profiles WHERE id = ?').get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(parent.user_id);
  res.json({ message: 'Parent account deactivated.' });
});

router.delete('/:id', authorize('admin', 'registrar'), (req, res) => {
  const parent = db.prepare('SELECT user_id FROM parent_profiles WHERE id = ?').get(req.params.id);
  if (!parent) return res.status(404).json({ error: 'Parent not found.' });
  db.prepare('DELETE FROM parent_profiles WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(parent.user_id);
  res.json({ message: 'Parent deleted.' });
});

module.exports = router;
