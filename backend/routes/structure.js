const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/overview', (req, res) => {
  const departments = db.prepare('SELECT COUNT(*) as c FROM departments').get();
  const programs = db.prepare('SELECT COUNT(*) as c FROM programs').get();
  const courses = db.prepare('SELECT COUNT(*) as c FROM courses').get();
  const academicYears = db.prepare('SELECT COUNT(*) as c FROM academic_years').get();
  const currentAY = db.prepare('SELECT * FROM academic_years WHERE is_current = 1').get();
  res.json({ departments: departments.c, programs: programs.c, courses: courses.c, academicYears: academicYears.c, currentAY });
});

router.get('/departments', (req, res) => {
  const depts = db.prepare(`SELECT d.*, u.name as hod_name,
    (SELECT COUNT(*) FROM faculty WHERE department_id = d.id) as faculty_count,
    (SELECT COUNT(*) FROM programs WHERE department_id = d.id) as program_count
    FROM departments d LEFT JOIN users u ON d.hod_id = u.id ORDER BY d.name`).all();
  res.json(depts);
});

router.post('/departments', authorize('admin', 'registrar'), (req, res) => {
  const { name, code, hod_id } = req.body;
  const result = db.prepare('INSERT INTO departments (name,code,hod_id) VALUES (?,?,?)').run(name, code, hod_id || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/departments/:id', authorize('admin', 'registrar'), (req, res) => {
  const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(req.params.id);
  if (!dept) return res.status(404).json({ error: 'Department not found.' });
  const { name, code, hod_id } = req.body;
  db.prepare('UPDATE departments SET name=?,code=?,hod_id=? WHERE id=?').run(name || dept.name, code || dept.code, hod_id !== undefined ? hod_id : dept.hod_id, req.params.id);
  res.json({ message: 'Department updated.' });
});

router.delete('/departments/:id', authorize('admin'), (req, res) => {
  const hasFaculty = db.prepare('SELECT id FROM faculty WHERE department_id = ? LIMIT 1').get(req.params.id);
  if (hasFaculty) return res.status(400).json({ error: 'Cannot delete department with assigned faculty.' });
  db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
  res.json({ message: 'Department deleted.' });
});

router.get('/programs', (req, res) => {
  const progs = db.prepare(`SELECT p.*, d.name as dept_name,
    (SELECT COUNT(*) FROM courses WHERE program_id = p.id) as course_count,
    (SELECT COUNT(*) FROM students WHERE program_id = p.id AND status = 'active') as student_count
    FROM programs p LEFT JOIN departments d ON p.department_id = d.id ORDER BY p.name`).all();
  res.json(progs);
});

router.post('/programs', authorize('admin', 'registrar'), (req, res) => {
  const { name, code, duration_years, department_id } = req.body;
  const result = db.prepare('INSERT INTO programs (name,code,duration_years,department_id) VALUES (?,?,?,?)').run(name, code, duration_years || 2, department_id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/programs/:id', authorize('admin', 'registrar'), (req, res) => {
  const program = db.prepare('SELECT * FROM programs WHERE id = ?').get(req.params.id);
  if (!program) return res.status(404).json({ error: 'Program not found.' });
  const { name, code, duration_years, department_id } = req.body;
  db.prepare('UPDATE programs SET name=?,code=?,duration_years=?,department_id=? WHERE id=?').run(name || program.name, code || program.code, duration_years || program.duration_years, department_id || program.department_id, req.params.id);
  res.json({ message: 'Program updated.' });
});

router.delete('/programs/:id', authorize('admin'), (req, res) => {
  const hasStudents = db.prepare("SELECT id FROM students WHERE program_id = ? AND status = 'active' LIMIT 1").get(req.params.id);
  if (hasStudents) return res.status(400).json({ error: 'Cannot delete program with active students.' });
  db.prepare('DELETE FROM programs WHERE id = ?').run(req.params.id);
  res.json({ message: 'Program deleted.' });
});

router.get('/course-levels', (req, res) => {
  const levels = db.prepare(`SELECT c.semester as level, c.type, COUNT(*) as course_count, SUM(c.credits) as total_credits
    FROM courses c GROUP BY c.semester, c.type ORDER BY c.semester, c.type`).all();
  const bySemester = db.prepare(`SELECT c.semester, COUNT(*) as courses, SUM(c.credits) as credits,
    GROUP_CONCAT(c.code, ', ') as course_codes FROM courses c GROUP BY c.semester ORDER BY c.semester`).all();
  res.json({ levels, bySemester });
});

router.get('/academic-years', (req, res) => {
  const years = db.prepare('SELECT ay.*, (SELECT COUNT(*) FROM courses WHERE academic_year_id = ay.id) as course_count FROM academic_years ay ORDER BY ay.start_date DESC').all();
  res.json(years);
});

router.post('/academic-years', authorize('admin', 'registrar'), (req, res) => {
  const { name, start_date, end_date, is_current } = req.body;
  if (is_current) db.prepare('UPDATE academic_years SET is_current = 0').run();
  const result = db.prepare('INSERT INTO academic_years (name,start_date,end_date,is_current) VALUES (?,?,?,?)').run(name, start_date, end_date, is_current ? 1 : 0);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/academic-years/:id', authorize('admin', 'registrar'), (req, res) => {
  const ay = db.prepare('SELECT * FROM academic_years WHERE id = ?').get(req.params.id);
  if (!ay) return res.status(404).json({ error: 'Academic year not found.' });
  const { name, start_date, end_date, is_current } = req.body;
  if (is_current) db.prepare('UPDATE academic_years SET is_current = 0').run();
  db.prepare('UPDATE academic_years SET name=?,start_date=?,end_date=?,is_current=? WHERE id=?').run(name || ay.name, start_date || ay.start_date, end_date || ay.end_date, is_current !== undefined ? (is_current ? 1 : 0) : ay.is_current, req.params.id);
  res.json({ message: 'Academic year updated.' });
});

module.exports = router;
