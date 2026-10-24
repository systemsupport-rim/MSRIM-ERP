const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { program_id, semester, faculty_id, academic_year_id } = req.query;
  let query = `SELECT c.*, p.name as program_name, p.code as program_code, f.employee_id, u.name as faculty_name, u.department as faculty_department, ay.name as academic_year
    FROM courses c JOIN programs p ON c.program_id = p.id
    LEFT JOIN faculty f ON c.faculty_id = f.id LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN academic_years ay ON c.academic_year_id = ay.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { query += ' AND c.faculty_id = ?'; params.push(fac.id); }
  } else if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { query += ' AND c.program_id = ? AND c.semester = ?'; params.push(stu.program_id, stu.semester); }
  } else {
    if (program_id) { query += ' AND c.program_id = ?'; params.push(program_id); }
    if (semester) { query += ' AND c.semester = ?'; params.push(semester); }
    if (faculty_id) { query += ' AND c.faculty_id = ?'; params.push(faculty_id); }
    if (academic_year_id) { query += ' AND c.academic_year_id = ?'; params.push(academic_year_id); }
  }
  query += ' ORDER BY c.semester, c.code';
  res.json(db.prepare(query).all(...params));
});

router.get('/departments', (req, res) => {
  res.json(db.prepare('SELECT * FROM departments ORDER BY name').all());
});

router.get('/programs', (req, res) => {
  const progs = db.prepare('SELECT p.*, d.name as dept_name FROM programs p LEFT JOIN departments d ON p.department_id = d.id ORDER BY p.name').all();
  res.json(progs);
});

router.get('/academic-years', (req, res) => {
  res.json(db.prepare('SELECT * FROM academic_years ORDER BY start_date DESC').all());
});

router.get('/:id', (req, res) => {
  const course = db.prepare(`SELECT c.*, p.name as program_name, f.employee_id, u.name as faculty_name, ay.name as academic_year
    FROM courses c JOIN programs p ON c.program_id = p.id
    LEFT JOIN faculty f ON c.faculty_id = f.id LEFT JOIN users u ON f.user_id = u.id
    LEFT JOIN academic_years ay ON c.academic_year_id = ay.id
    WHERE c.id = ?`).get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const students = db.prepare(`SELECT s.id, s.enrollment_number, s.section, u.name
    FROM students s JOIN users u ON s.user_id = u.id
    WHERE s.program_id = ? AND s.semester = ? AND s.status = 'active'
    ORDER BY s.enrollment_number`).all(course.program_id, course.semester);
  const timetable = db.prepare(`SELECT t.* FROM timetable t WHERE t.course_id = ? ORDER BY CASE t.day WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 END, t.start_time`).all(course.id);
  res.json({ ...course, enrolledStudents: students.length, students, timetable });
});

router.post('/', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const { code, name, program_id, semester, credits, type, faculty_id, academic_year_id, max_students } = req.body;
  const result = db.prepare('INSERT INTO courses (code,name,program_id,semester,credits,type,faculty_id,academic_year_id,max_students) VALUES (?,?,?,?,?,?,?,?,?)').run(code, name, program_id, semester, credits || 3, type || 'core', faculty_id || null, academic_year_id, max_students || 60);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found.' });
  const { name, credits, faculty_id, max_students, type } = req.body;
  db.prepare('UPDATE courses SET name=?, credits=?, faculty_id=?, max_students=?, type=? WHERE id=?').run(name || course.name, credits || course.credits, faculty_id !== undefined ? faculty_id : course.faculty_id, max_students || course.max_students, type || course.type, req.params.id);
  res.json({ message: 'Course updated.' });
});

router.put('/:id/deactivate', authorize('admin', 'registrar', 'hod'), (req, res) => {
  db.prepare("UPDATE courses SET status = 'inactive' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Course deactivated.' });
});

router.put('/:id/activate', authorize('admin', 'registrar', 'hod'), (req, res) => {
  db.prepare("UPDATE courses SET status = 'active' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Course activated.' });
});

router.delete('/:id', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const hasData = db.prepare('SELECT id FROM attendance WHERE course_id = ? LIMIT 1').get(req.params.id) ||
    db.prepare('SELECT id FROM results r JOIN examinations e ON r.examination_id = e.id WHERE e.course_id = ? LIMIT 1').get(req.params.id);
  if (hasData) return res.status(400).json({ error: 'Cannot delete course with existing attendance or result records.' });
  db.prepare('DELETE FROM timetable WHERE course_id = ?').run(req.params.id);
  db.prepare('DELETE FROM courses WHERE id = ?').run(req.params.id);
  res.json({ message: 'Course deleted.' });
});

module.exports = router;
