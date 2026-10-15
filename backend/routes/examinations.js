const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { course_id, exam_type, academic_year_id } = req.query;
  let query = `SELECT e.*, c.name as course_name, c.code as course_code, ay.name as academic_year
    FROM examinations e JOIN courses c ON e.course_id = c.id JOIN academic_years ay ON e.academic_year_id = ay.id WHERE 1=1`;
  const params = [];
  if (course_id) { query += ' AND e.course_id = ?'; params.push(course_id); }
  if (exam_type) { query += ' AND e.exam_type = ?'; params.push(exam_type); }
  if (academic_year_id) { query += ' AND e.academic_year_id = ?'; params.push(academic_year_id); }
  query += ' ORDER BY e.exam_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', authorize('admin','registrar','faculty','hod'), (req, res) => {
  const { name, exam_type, course_id, academic_year_id, exam_date, start_time, end_time, total_marks, passing_marks, room } = req.body;
  const result = db.prepare(`INSERT INTO examinations (name,exam_type,course_id,academic_year_id,exam_date,start_time,end_time,total_marks,passing_marks,room)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(name,exam_type,course_id,academic_year_id,exam_date,start_time,end_time,total_marks||100,passing_marks||40,room);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Examination created.' });
});

router.get('/results', (req, res) => {
  const { student_id, examination_id, course_id } = req.query;
  let stuId = student_id;
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    stuId = stu?.id;
  }

  let query = `SELECT r.*, u.name as student_name, s.enrollment_number, e.name as exam_name, e.exam_type,
    e.total_marks, c.name as course_name, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id JOIN users u ON s.user_id = u.id
    JOIN examinations e ON r.examination_id = e.id JOIN courses c ON e.course_id = c.id WHERE 1=1`;
  const params = [];
  if (stuId) { query += ' AND r.student_id = ?'; params.push(stuId); }
  if (examination_id) { query += ' AND r.examination_id = ?'; params.push(examination_id); }
  if (course_id) { query += ' AND c.id = ?'; params.push(course_id); }
  query += ' ORDER BY e.exam_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/results', authorize('faculty','admin','registrar'), (req, res) => {
  const { results } = req.body;
  if (!results || !Array.isArray(results)) return res.status(400).json({ error: 'Results array required.' });

  const stmt = db.prepare(`INSERT INTO results (student_id,examination_id,marks_obtained,grade,remarks,entered_by)
    VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,examination_id) DO UPDATE SET marks_obtained=excluded.marks_obtained,grade=excluded.grade`);

  const insert = db.transaction((recs) => {
    recs.forEach(r => {
      const exam = db.prepare('SELECT total_marks, passing_marks FROM examinations WHERE id = ?').get(r.examination_id);
      let grade = 'F';
      if (exam) {
        const pct = (r.marks_obtained / exam.total_marks) * 100;
        if (pct >= 90) grade = 'O';
        else if (pct >= 80) grade = 'A+';
        else if (pct >= 70) grade = 'A';
        else if (pct >= 60) grade = 'B+';
        else if (pct >= 50) grade = 'B';
        else if (pct >= 40) grade = 'C';
        else grade = 'F';
      }
      stmt.run(r.student_id, r.examination_id, r.marks_obtained, r.grade || grade, r.remarks || '', req.user.id);
    });
  });
  insert(results);
  res.json({ message: `${results.length} results entered.` });
});

router.get('/report/:studentId', (req, res) => {
  const { semester, academic_year_id } = req.query;
  let query = `SELECT r.*, e.name as exam_name, e.exam_type, e.total_marks, e.exam_date,
    c.name as course_name, c.code as course_code, c.credits, c.semester
    FROM results r JOIN examinations e ON r.examination_id = e.id JOIN courses c ON e.course_id = c.id
    WHERE r.student_id = ?`;
  const params = [req.params.studentId];
  if (semester) { query += ' AND c.semester = ?'; params.push(semester); }
  if (academic_year_id) { query += ' AND e.academic_year_id = ?'; params.push(academic_year_id); }
  query += ' ORDER BY c.semester, e.exam_date';

  const results = db.prepare(query).all(...params);
  const student = db.prepare(`SELECT s.*, u.name, u.email, p.name as program_name FROM students s
    JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id WHERE s.id = ?`).get(req.params.studentId);
  res.json({ student, results });
});

module.exports = router;
