const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { semester, section, program_id, status, search } = req.query;
  let query = `SELECT s.*, u.name, u.email, u.phone, u.profile_photo, p.name as program_name, p.code as program_code
    FROM students s JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') {
    query += ' AND s.user_id = ?'; params.push(req.user.id);
  } else {
    if (semester) { query += ' AND s.semester = ?'; params.push(semester); }
    if (section) { query += ' AND s.section = ?'; params.push(section); }
    if (program_id) { query += ' AND s.program_id = ?'; params.push(program_id); }
    if (status) { query += ' AND s.status = ?'; params.push(status); }
    if (search) {
      query += ' AND (u.name LIKE ? OR s.enrollment_number LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
  }
  query += ' ORDER BY s.enrollment_number';
  res.json(db.prepare(query).all(...params));
});

router.get('/stats', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'active'").get();
  const bySemester = db.prepare("SELECT semester, COUNT(*) as count FROM students WHERE status = 'active' GROUP BY semester").all();
  const byProgram = db.prepare("SELECT p.name, p.code, COUNT(*) as count FROM students s JOIN programs p ON s.program_id = p.id WHERE s.status = 'active' GROUP BY p.id").all();
  const bySection = db.prepare("SELECT section, COUNT(*) as count FROM students WHERE status = 'active' GROUP BY section").all();
  const byGender = db.prepare("SELECT gender, COUNT(*) as count FROM students WHERE status = 'active' GROUP BY gender").all();
  res.json({ total: total.count, bySemester, byProgram, bySection, byGender });
});

router.get('/:id', (req, res) => {
  const student = db.prepare(`SELECT s.*, u.name, u.email, u.phone, u.profile_photo, p.name as program_name, p.code as program_code
    FROM students s JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id WHERE s.id = ?`).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (req.user.role === 'student' && student.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  res.json(student);
});

router.get('/:id/attendance', (req, res) => {
  const student = db.prepare('SELECT id, user_id FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (req.user.role === 'student' && student.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  const { from_date, to_date } = req.query;
  let q = `SELECT c.name as course_name, c.code, COUNT(*) as total_classes,
    SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
    ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(*), 1) as percentage
    FROM attendance a JOIN courses c ON a.course_id = c.id WHERE a.student_id = ?`;
  const params = [req.params.id];
  if (from_date) { q += ' AND a.date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND a.date <= ?'; params.push(to_date); }
  q += ' GROUP BY a.course_id ORDER BY c.name';
  const summary = db.prepare(q).all(...params);
  const overall = summary.length ? (summary.reduce((s, r) => s + r.percentage, 0) / summary.length).toFixed(1) : 0;
  res.json({ summary, overall });
});

router.get('/:id/results', (req, res) => {
  const student = db.prepare('SELECT id, user_id FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (req.user.role === 'student' && student.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  const { semester, academic_year_id } = req.query;
  let q = `SELECT r.marks_obtained, r.grade, r.remarks, e.name as exam_name, e.exam_type, e.total_marks, e.exam_date,
    c.name as course_name, c.code, c.credits, c.semester
    FROM results r JOIN examinations e ON r.examination_id = e.id JOIN courses c ON e.course_id = c.id
    WHERE r.student_id = ?`;
  const params = [req.params.id];
  if (semester) { q += ' AND c.semester = ?'; params.push(semester); }
  if (academic_year_id) { q += ' AND e.academic_year_id = ?'; params.push(academic_year_id); }
  q += ' ORDER BY c.semester, e.exam_date';
  const results = db.prepare(q).all(...params);
  const passed = results.filter(r => r.grade !== 'F').length;
  res.json({ results, summary: { total: results.length, passed, failed: results.length - passed } });
});

router.post('/', authorize('admin', 'registrar'), (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, phone, enrollment_number, program_id, semester, batch_year, section, roll_number,
    dob, gender, blood_group, address, city, state, pin, guardian_name, guardian_phone, guardian_relation,
    category, admission_date } = req.body;

  const username = enrollment_number.toLowerCase().replace(/-/g, '');
  const password = bcrypt.hashSync('Msrim@123', 10);

  const userResult = db.prepare(`INSERT INTO users (username,password,role,name,email,phone,department) VALUES (?,?,?,?,?,?,?)`).run(username, password, 'student', name, email, phone, 'Management Studies');
  const userId = userResult.lastInsertRowid;

  db.prepare(`INSERT INTO students (user_id,enrollment_number,program_id,semester,batch_year,section,roll_number,dob,gender,blood_group,address,city,state,pin,guardian_name,guardian_phone,guardian_relation,category,admission_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(userId, enrollment_number, program_id, semester, batch_year, section, roll_number, dob, gender, blood_group, address, city, state, pin, guardian_name, guardian_phone, guardian_relation, category || 'General', admission_date);

  res.status(201).json({ message: 'Student created.', username, defaultPassword: 'Msrim@123' });
});

router.put('/:id', authorize('admin', 'registrar', 'student'), (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (req.user.role === 'student' && student.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });

  const allowed = ['semester', 'section', 'roll_number', 'dob', 'gender', 'blood_group', 'address', 'city', 'state', 'pin', 'guardian_name', 'guardian_phone', 'guardian_relation', 'status'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

  if (Object.keys(updates).length === 0 && !req.body.name && !req.body.phone) return res.status(400).json({ error: 'No valid fields to update.' });

  if (Object.keys(updates).length > 0) {
    const sets = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE students SET ${sets} WHERE id = ?`).run(...Object.values(updates), req.params.id);
  }

  if (req.body.name || req.body.phone) {
    const uUpdates = {};
    if (req.body.name) uUpdates.name = req.body.name;
    if (req.body.phone) uUpdates.phone = req.body.phone;
    const uSets = Object.keys(uUpdates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${uSets} WHERE id = ?`).run(...Object.values(uUpdates), student.user_id);
  }
  res.json({ message: 'Student updated.' });
});

router.put('/:id/deactivate', authorize('admin', 'registrar'), (req, res) => {
  const student = db.prepare('SELECT user_id FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  const { status, reason } = req.body;
  const newStatus = ['inactive', 'graduated', 'dropped'].includes(status) ? status : 'inactive';
  db.prepare('UPDATE students SET status = ? WHERE id = ?').run(newStatus, req.params.id);
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(student.user_id);
  res.json({ message: `Student status set to ${newStatus}.` });
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const student = db.prepare('SELECT user_id, status FROM students WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found.' });
  if (student.status === 'active') return res.status(400).json({ error: 'Deactivate the student before deleting.' });
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(student.user_id);
  res.json({ message: 'Student deleted.' });
});

module.exports = router;
