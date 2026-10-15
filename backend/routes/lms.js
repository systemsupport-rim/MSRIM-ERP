const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// Assignments
router.get('/assignments', (req, res) => {
  const { course_id, status } = req.query;
  let q = `SELECT a.*, c.name as course_name, u.name as faculty_name FROM lms_assignments a
    JOIN courses c ON a.course_id = c.id JOIN faculty f ON a.faculty_id = f.id JOIN users u ON f.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { q += ' AND a.faculty_id = ?'; params.push(fac.id); }
  } else if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND c.program_id = ? AND c.semester = ?'; params.push(stu.program_id, stu.semester); }
  }
  if (course_id) { q += ' AND a.course_id = ?'; params.push(course_id); }
  if (status) { q += ' AND a.status = ?'; params.push(status); }
  q += ' ORDER BY a.created_at DESC';
  const assignments = db.prepare(q).all(...params);
  res.json(assignments.map(a => {
    const submCount = db.prepare('SELECT COUNT(*) as c FROM lms_submissions WHERE assignment_id = ?').get(a.id);
    return { ...a, submission_count: submCount.c };
  }));
});

router.post('/assignments', authorize('faculty','admin','hod'), (req, res) => {
  const { title, description, course_id, due_date, total_marks, type, academic_year_id } = req.body;
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
  const facId = fac?.id || req.body.faculty_id;
  const result = db.prepare('INSERT INTO lms_assignments (title,description,course_id,faculty_id,due_date,total_marks,type,academic_year_id) VALUES (?,?,?,?,?,?,?,?)')
    .run(title,description,course_id,facId,due_date,total_marks||100,type||'assignment',academic_year_id||1);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/assignments/:id/submit', authorize('student'), (req, res) => {
  const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
  if (!stu) return res.status(404).json({ error: 'Student not found.' });
  try {
    db.prepare('INSERT INTO lms_submissions (assignment_id,student_id,notes,status) VALUES (?,?,?,?)').run(req.params.id,stu.id,req.body.notes||'','submitted');
    res.status(201).json({ message: 'Assignment submitted.' });
  } catch { res.status(400).json({ error: 'Already submitted.' }); }
});

router.put('/submissions/:id/grade', authorize('faculty','admin'), (req, res) => {
  const { marks_obtained, feedback } = req.body;
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
  db.prepare("UPDATE lms_submissions SET marks_obtained=?,feedback=?,status='graded',graded_by=? WHERE id=?")
    .run(marks_obtained,feedback||'',fac?.id||null,req.params.id);
  res.json({ message: 'Graded.' });
});

// Resources
router.get('/resources', (req, res) => {
  const { course_id } = req.query;
  let q = `SELECT r.*, c.name as course_name, u.name as faculty_name FROM lms_resources r
    JOIN courses c ON r.course_id = c.id JOIN faculty f ON r.faculty_id = f.id JOIN users u ON f.user_id = u.id WHERE r.is_published = 1`;
  const params = [];
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND c.program_id = ? AND c.semester = ?'; params.push(stu.program_id, stu.semester); }
  } else if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { q += ' AND r.faculty_id = ?'; params.push(fac.id); }
  }
  if (course_id) { q += ' AND r.course_id = ?'; params.push(course_id); }
  q += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/resources', authorize('faculty','admin','hod'), (req, res) => {
  const { title, description, course_id, resource_type, url, academic_year_id } = req.body;
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
  const result = db.prepare('INSERT INTO lms_resources (title,description,course_id,faculty_id,resource_type,url,academic_year_id) VALUES (?,?,?,?,?,?,?)')
    .run(title,description,course_id,fac?.id||req.body.faculty_id,resource_type||'document',url||'',academic_year_id||1);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Quizzes
router.get('/quizzes', (req, res) => {
  const { course_id, status } = req.query;
  let q = `SELECT q.*, c.name as course_name, u.name as faculty_name FROM lms_quizzes q
    JOIN courses c ON q.course_id = c.id JOIN faculty f ON q.faculty_id = f.id JOIN users u ON f.user_id = u.id WHERE 1=1`;
  const params = [];
  if (course_id) { q += ' AND q.course_id = ?'; params.push(course_id); }
  if (status) { q += ' AND q.status = ?'; params.push(status); }
  q += ' ORDER BY q.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/quizzes', authorize('faculty','admin'), (req, res) => {
  const { title, course_id, total_marks, duration_minutes, start_time, end_time, academic_year_id } = req.body;
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
  const result = db.prepare('INSERT INTO lms_quizzes (title,course_id,faculty_id,total_marks,duration_minutes,start_time,end_time,academic_year_id,status) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(title,course_id,fac?.id||null,total_marks||10,duration_minutes||30,start_time||null,end_time||null,academic_year_id||1,'active');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/stats', (req, res) => {
  const assignments = db.prepare('SELECT COUNT(*) as c FROM lms_assignments').get();
  const quizzes = db.prepare('SELECT COUNT(*) as c FROM lms_quizzes').get();
  const resources = db.prepare('SELECT COUNT(*) as c FROM lms_resources').get();
  const submissions = db.prepare('SELECT COUNT(*) as c FROM lms_submissions').get();
  res.json({ assignments: assignments.c, quizzes: quizzes.c, resources: resources.c, submissions: submissions.c });
});

module.exports = router;
