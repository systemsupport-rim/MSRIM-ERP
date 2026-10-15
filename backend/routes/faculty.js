const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { department_id, search } = req.query;
  let query = `SELECT f.*, u.name, u.email, u.phone, u.profile_photo, d.name as dept_name
    FROM faculty f JOIN users u ON f.user_id = u.id LEFT JOIN departments d ON f.department_id = d.id WHERE u.is_active = 1`;
  const params = [];
  if (req.user.role === 'faculty') {
    query += ' AND f.user_id = ?'; params.push(req.user.id);
  } else {
    if (department_id) { query += ' AND f.department_id = ?'; params.push(department_id); }
    if (search) { query += ' AND (u.name LIKE ? OR f.employee_id LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  }
  query += ' ORDER BY u.name';
  res.json(db.prepare(query).all(...params));
});

router.get('/stats/overview', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM faculty').get();
  const byDept = db.prepare('SELECT d.name, COUNT(*) as count FROM faculty f JOIN departments d ON f.department_id = d.id GROUP BY d.id').all();
  const byDesignation = db.prepare('SELECT designation, COUNT(*) as count FROM faculty GROUP BY designation').all();
  const byEmploymentType = db.prepare("SELECT employment_type, COUNT(*) as count FROM faculty GROUP BY employment_type").all();
  res.json({ total: total.count, byDept, byDesignation, byEmploymentType });
});

router.get('/:id', (req, res) => {
  const faculty = db.prepare(`SELECT f.*, u.name, u.email, u.phone, d.name as dept_name
    FROM faculty f JOIN users u ON f.user_id = u.id LEFT JOIN departments d ON f.department_id = d.id WHERE f.id = ?`).get(req.params.id);
  if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });
  const courses = db.prepare(`SELECT c.*, ay.name as academic_year FROM courses c JOIN academic_years ay ON c.academic_year_id = ay.id WHERE c.faculty_id = ? ORDER BY ay.name, c.semester`).all(req.params.id);
  res.json({ ...faculty, courses });
});

router.get('/:id/workload', (req, res) => {
  const courses = db.prepare('SELECT c.*, COUNT(DISTINCT s.id) as student_count FROM courses c LEFT JOIN students s ON c.program_id = s.program_id AND c.semester = s.semester WHERE c.faculty_id = ? GROUP BY c.id').all(req.params.id);
  const totalHours = courses.reduce((sum, c) => sum + (c.credits * 1.5), 0);
  res.json({ courses, totalCourses: courses.length, totalWeeklyHours: totalHours });
});

router.get('/:id/attendance', (req, res) => {
  const faculty = db.prepare('SELECT user_id FROM faculty WHERE id = ?').get(req.params.id);
  if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });
  const { from_date, to_date } = req.query;
  let q = 'SELECT * FROM staff_attendance WHERE user_id = ?';
  const params = [faculty.user_id];
  if (from_date) { q += ' AND date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND date <= ?'; params.push(to_date); }
  q += ' ORDER BY date DESC';
  const records = db.prepare(q).all(...params);
  const presentCount = records.filter(r => r.status === 'present').length;
  res.json({ records, summary: { total: records.length, present: presentCount, percentage: records.length ? ((presentCount / records.length) * 100).toFixed(1) : 0 } });
});

router.post('/', authorize('admin', 'registrar'), (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, phone, employee_id, department_id, designation, qualification, specialization, experience_years, joining_date, employment_type, salary } = req.body;
  const username = employee_id.toLowerCase().replace(/-/g, '');
  const password = bcrypt.hashSync('Msrim@123', 10);
  const userResult = db.prepare('INSERT INTO users (username,password,role,name,email,phone,department) VALUES (?,?,?,?,?,?,?)').run(username, password, 'faculty', name, email, phone, 'Management Studies');
  db.prepare('INSERT INTO faculty (user_id,employee_id,department_id,designation,qualification,specialization,experience_years,joining_date,employment_type,salary) VALUES (?,?,?,?,?,?,?,?,?,?)').run(userResult.lastInsertRowid, employee_id, department_id, designation, qualification, specialization || '', experience_years || 0, joining_date, employment_type || 'full-time', salary || 0);
  res.status(201).json({ message: 'Faculty created.', username, defaultPassword: 'Msrim@123' });
});

router.put('/:id', authorize('admin', 'registrar'), (req, res) => {
  const faculty = db.prepare('SELECT f.*, u.id as user_id FROM faculty f JOIN users u ON f.user_id = u.id WHERE f.id = ?').get(req.params.id);
  if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });
  const { department_id, designation, qualification, specialization, experience_years, employment_type, salary, bank_account, ifsc_code } = req.body;
  db.prepare('UPDATE faculty SET department_id=?, designation=?, qualification=?, specialization=?, experience_years=?, employment_type=?, salary=?, bank_account=?, ifsc_code=? WHERE id=?')
    .run(department_id || faculty.department_id, designation || faculty.designation, qualification || faculty.qualification, specialization || faculty.specialization, experience_years !== undefined ? experience_years : faculty.experience_years, employment_type || faculty.employment_type, salary !== undefined ? salary : faculty.salary, bank_account || faculty.bank_account, ifsc_code || faculty.ifsc_code, req.params.id);
  if (req.body.name || req.body.phone || req.body.email) {
    const uUpdates = [];
    const vals = [];
    if (req.body.name) { uUpdates.push('name = ?'); vals.push(req.body.name); }
    if (req.body.phone) { uUpdates.push('phone = ?'); vals.push(req.body.phone); }
    if (req.body.email) { uUpdates.push('email = ?'); vals.push(req.body.email); }
    vals.push(faculty.user_id);
    db.prepare(`UPDATE users SET ${uUpdates.join(', ')} WHERE id = ?`).run(...vals);
  }
  res.json({ message: 'Faculty updated.' });
});

router.put('/:id/deactivate', authorize('admin', 'registrar'), (req, res) => {
  const faculty = db.prepare('SELECT user_id FROM faculty WHERE id = ?').get(req.params.id);
  if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(faculty.user_id);
  res.json({ message: 'Faculty account deactivated.' });
});

router.put('/:id/activate', authorize('admin', 'registrar'), (req, res) => {
  const faculty = db.prepare('SELECT user_id FROM faculty WHERE id = ?').get(req.params.id);
  if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });
  db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(faculty.user_id);
  res.json({ message: 'Faculty account activated.' });
});

router.delete('/:id', authorize('admin'), (req, res) => {
  const faculty = db.prepare('SELECT user_id FROM faculty WHERE id = ?').get(req.params.id);
  if (!faculty) return res.status(404).json({ error: 'Faculty not found.' });
  db.prepare('DELETE FROM faculty WHERE id = ?').run(req.params.id);
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(faculty.user_id);
  res.json({ message: 'Faculty removed.' });
});

module.exports = router;
