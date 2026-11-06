const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// ── Helpers ──────────────────────────────────────────────────────────────────
function getFacultyId(userId) {
  return db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(userId)?.id || null;
}
function getStudentInfo(userId) {
  return db.prepare('SELECT id, program_id, semester FROM students WHERE user_id = ?').get(userId) || null;
}

// ── Stats ─────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  try {
    const assignments  = db.prepare('SELECT COUNT(*) as c FROM lms_assignments').get().c;
    const quizzes      = db.prepare('SELECT COUNT(*) as c FROM lms_quizzes').get().c;
    const resources    = db.prepare('SELECT COUNT(*) as c FROM lms_resources').get().c;
    const submissions  = db.prepare('SELECT COUNT(*) as c FROM lms_submissions').get().c;
    const announcements= db.prepare('SELECT COUNT(*) as c FROM lms_announcements').get().c;
    const pendingGrade = db.prepare("SELECT COUNT(*) as c FROM lms_submissions WHERE status='submitted'").get().c;
    const overdue      = db.prepare("SELECT COUNT(*) as c FROM lms_assignments WHERE status='active' AND due_date < date('now')").get().c;
    res.json({ assignments, quizzes, resources, submissions, announcements, pendingGrade, overdue });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Overview (per-role summary) ────────────────────────────────────────────
router.get('/overview', (req, res) => {
  try {
    if (req.user.role === 'student') {
      const stu = getStudentInfo(req.user.id);
      if (!stu) return res.json({ courses: [], upcoming: [], recentGrades: [] });
      const courses = db.prepare(`
        SELECT c.id, c.name, c.code,
          (SELECT COUNT(*) FROM lms_assignments a WHERE a.course_id=c.id AND a.status='active') as active_assignments,
          (SELECT COUNT(*) FROM lms_submissions ls JOIN lms_assignments la ON ls.assignment_id=la.id WHERE la.course_id=c.id AND ls.student_id=?) as submitted_count,
          (SELECT COUNT(*) FROM lms_resources r WHERE r.course_id=c.id AND r.is_published=1) as resources
        FROM courses c WHERE c.program_id=? AND c.semester=?
      `).all(stu.id, stu.program_id, stu.semester);
      const upcoming = db.prepare(`
        SELECT a.id, a.title, a.due_date, a.type, a.total_marks, c.name as course_name,
          (SELECT id FROM lms_submissions WHERE assignment_id=a.id AND student_id=?) as submitted_id
        FROM lms_assignments a JOIN courses c ON a.course_id=c.id
        WHERE a.status='active' AND c.program_id=? AND c.semester=?
        ORDER BY a.due_date ASC LIMIT 5
      `).all(stu.id, stu.program_id, stu.semester);
      const recentGrades = db.prepare(`
        SELECT ls.marks_obtained, ls.feedback, ls.status, ls.submitted_at,
          la.title, la.total_marks, c.name as course_name
        FROM lms_submissions ls
        JOIN lms_assignments la ON ls.assignment_id=la.id
        JOIN courses c ON la.course_id=c.id
        WHERE ls.student_id=? AND ls.status='graded'
        ORDER BY ls.submitted_at DESC LIMIT 5
      `).all(stu.id);
      res.json({ courses, upcoming, recentGrades });
    } else if (req.user.role === 'faculty') {
      const facId = getFacultyId(req.user.id);
      const courses = db.prepare(`
        SELECT c.id, c.name, c.code, c.semester,
          (SELECT COUNT(*) FROM lms_assignments a WHERE a.course_id=c.id AND a.faculty_id=?) as assignments,
          (SELECT COUNT(*) FROM lms_submissions ls JOIN lms_assignments la ON ls.assignment_id=la.id WHERE la.course_id=c.id AND la.faculty_id=? AND ls.status='submitted') as pending_grade,
          (SELECT COUNT(*) FROM lms_resources r WHERE r.course_id=c.id AND r.faculty_id=?) as resources
        FROM courses c WHERE c.faculty_id=?
      `).all(facId, facId, facId, facId);
      const pendingSubmissions = db.prepare(`
        SELECT ls.id, ls.submitted_at, ls.notes, s_u.name as student_name,
          la.title as assignment_title, c.name as course_name
        FROM lms_submissions ls
        JOIN lms_assignments la ON ls.assignment_id=la.id
        JOIN students s ON ls.student_id=s.id JOIN users s_u ON s.user_id=s_u.id
        JOIN courses c ON la.course_id=c.id
        WHERE la.faculty_id=? AND ls.status='submitted'
        ORDER BY ls.submitted_at DESC LIMIT 10
      `).all(facId);
      res.json({ courses, pendingSubmissions });
    } else {
      const courses = db.prepare('SELECT id, name, code, semester FROM courses ORDER BY name LIMIT 20').all();
      const pendingGrade = db.prepare("SELECT COUNT(*) as c FROM lms_submissions WHERE status='submitted'").get().c;
      res.json({ courses, pendingGrade });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Assignments ───────────────────────────────────────────────────────────────
router.get('/assignments', (req, res) => {
  try {
    const { course_id, status } = req.query;
    let q = `SELECT a.*, c.name as course_name, u.name as faculty_name
      FROM lms_assignments a
      JOIN courses c ON a.course_id=c.id
      JOIN faculty f ON a.faculty_id=f.id JOIN users u ON f.user_id=u.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'faculty') {
      const facId = getFacultyId(req.user.id);
      if (facId) { q += ' AND a.faculty_id=?'; params.push(facId); }
    } else if (req.user.role === 'student') {
      const stu = getStudentInfo(req.user.id);
      if (stu) { q += ' AND c.program_id=? AND c.semester=?'; params.push(stu.program_id, stu.semester); }
    }
    if (course_id) { q += ' AND a.course_id=?'; params.push(course_id); }
    if (status) { q += ' AND a.status=?'; params.push(status); }
    q += ' ORDER BY a.due_date ASC, a.created_at DESC';
    const rows = db.prepare(q).all(...params);
    const stuInfo = req.user.role === 'student' ? getStudentInfo(req.user.id) : null;
    res.json(rows.map(a => {
      const submCount = db.prepare('SELECT COUNT(*) as c FROM lms_submissions WHERE assignment_id=?').get(a.id).c;
      let mySubmission = null;
      if (stuInfo) {
        mySubmission = db.prepare('SELECT id, status, marks_obtained, feedback, submitted_at FROM lms_submissions WHERE assignment_id=? AND student_id=?').get(a.id, stuInfo.id);
      }
      const isOverdue = a.due_date && new Date(a.due_date) < new Date() && a.status === 'active';
      return { ...a, submission_count: submCount, my_submission: mySubmission, is_overdue: isOverdue };
    }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/assignments', authorize('faculty','admin','hod'), (req, res) => {
  try {
    const { title, description, course_id, due_date, total_marks, type, academic_year_id, instructions } = req.body;
    if (!title || !course_id) return res.status(400).json({ error: 'Title and course required.' });
    const facId = getFacultyId(req.user.id);
    const r = db.prepare('INSERT INTO lms_assignments (title,description,course_id,faculty_id,due_date,total_marks,type,academic_year_id) VALUES (?,?,?,?,?,?,?,?)')
      .run(title, description, course_id, facId, due_date, total_marks||100, type||'assignment', academic_year_id||1);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/assignments/:id/status', authorize('faculty','admin','hod'), (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE lms_assignments SET status=? WHERE id=?').run(status, req.params.id);
    res.json({ message: 'Status updated.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/assignments/:id', authorize('faculty','admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM lms_assignments WHERE id=?').run(req.params.id);
    res.json({ message: 'Deleted.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Submissions ───────────────────────────────────────────────────────────────
router.get('/assignments/:id/submissions', authorize('faculty','admin','hod','registrar'), (req, res) => {
  try {
    const subs = db.prepare(`
      SELECT ls.*, u.name as student_name, s.enrollment_number, s.roll_number, s.section
      FROM lms_submissions ls
      JOIN students s ON ls.student_id=s.id JOIN users u ON s.user_id=u.id
      WHERE ls.assignment_id=? ORDER BY ls.submitted_at ASC
    `).all(req.params.id);
    const asgn = db.prepare('SELECT title, total_marks FROM lms_assignments WHERE id=?').get(req.params.id);
    res.json({ assignment: asgn, submissions: subs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/assignments/:id/submit', authorize('student'), (req, res) => {
  try {
    const stu = getStudentInfo(req.user.id);
    if (!stu) return res.status(404).json({ error: 'Student not found.' });
    const asgn = db.prepare("SELECT status, due_date FROM lms_assignments WHERE id=?").get(req.params.id);
    if (!asgn || asgn.status === 'closed') return res.status(400).json({ error: 'Assignment is closed.' });
    const isLate = asgn.due_date && new Date(asgn.due_date) < new Date();
    db.prepare('INSERT INTO lms_submissions (assignment_id,student_id,notes,status) VALUES (?,?,?,?)')
      .run(req.params.id, stu.id, req.body.notes||'', isLate ? 'late' : 'submitted');
    res.status(201).json({ message: isLate ? 'Submitted (late).' : 'Submitted.' });
  } catch(e) { res.status(400).json({ error: 'Already submitted.' }); }
});

router.put('/submissions/:id/grade', authorize('faculty','admin','hod'), (req, res) => {
  try {
    const { marks_obtained, feedback } = req.body;
    const facId = getFacultyId(req.user.id);
    db.prepare("UPDATE lms_submissions SET marks_obtained=?,feedback=?,status='graded',graded_by=? WHERE id=?")
      .run(marks_obtained, feedback||'', facId, req.params.id);
    res.json({ message: 'Graded.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── My Grades (student) ───────────────────────────────────────────────────────
router.get('/my-grades', authorize('student'), (req, res) => {
  try {
    const stu = getStudentInfo(req.user.id);
    if (!stu) return res.json([]);
    const grades = db.prepare(`
      SELECT ls.marks_obtained, ls.feedback, ls.status, ls.submitted_at,
        la.title, la.total_marks, la.type, la.due_date, c.name as course_name
      FROM lms_submissions ls
      JOIN lms_assignments la ON ls.assignment_id=la.id
      JOIN courses c ON la.course_id=c.id
      WHERE ls.student_id=?
      ORDER BY ls.submitted_at DESC
    `).all(stu.id);
    const quizScores = db.prepare(`
      SELECT qa.score, qa.status, qa.submitted_at, lq.title, lq.total_marks, c.name as course_name
      FROM lms_quiz_attempts qa
      JOIN lms_quizzes lq ON qa.quiz_id=lq.id JOIN courses c ON lq.course_id=c.id
      WHERE qa.student_id=? ORDER BY qa.submitted_at DESC
    `).all(stu.id);
    res.json({ assignments: grades, quizzes: quizScores });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Resources ─────────────────────────────────────────────────────────────────
router.get('/resources', (req, res) => {
  try {
    const { course_id, resource_type } = req.query;
    let q = `SELECT r.*, c.name as course_name, u.name as faculty_name
      FROM lms_resources r JOIN courses c ON r.course_id=c.id
      JOIN faculty f ON r.faculty_id=f.id JOIN users u ON f.user_id=u.id WHERE r.is_published=1`;
    const params = [];
    if (req.user.role === 'student') {
      const stu = getStudentInfo(req.user.id);
      if (stu) { q += ' AND c.program_id=? AND c.semester=?'; params.push(stu.program_id, stu.semester); }
    } else if (req.user.role === 'faculty') {
      const facId = getFacultyId(req.user.id);
      if (facId) { q += ' AND r.faculty_id=?'; params.push(facId); }
    }
    if (course_id) { q += ' AND r.course_id=?'; params.push(course_id); }
    if (resource_type) { q += ' AND r.resource_type=?'; params.push(resource_type); }
    q += ' ORDER BY r.created_at DESC';
    res.json(db.prepare(q).all(...params));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/resources', authorize('faculty','admin','hod'), (req, res) => {
  try {
    const { title, description, course_id, resource_type, url, academic_year_id } = req.body;
    if (!title || !course_id) return res.status(400).json({ error: 'Title and course required.' });
    const facId = getFacultyId(req.user.id);
    const r = db.prepare('INSERT INTO lms_resources (title,description,course_id,faculty_id,resource_type,url,academic_year_id) VALUES (?,?,?,?,?,?,?)')
      .run(title, description, course_id, facId, resource_type||'document', url||'', academic_year_id||1);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/resources/:id/view', (req, res) => {
  try {
    db.prepare('UPDATE lms_resources SET view_count=view_count+1 WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/resources/:id', authorize('faculty','admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM lms_resources WHERE id=?').run(req.params.id);
    res.json({ message: 'Deleted.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Quizzes ───────────────────────────────────────────────────────────────────
router.get('/quizzes', (req, res) => {
  try {
    const { course_id, status } = req.query;
    let q = `SELECT qz.*, c.name as course_name, u.name as faculty_name
      FROM lms_quizzes qz JOIN courses c ON qz.course_id=c.id
      JOIN faculty f ON qz.faculty_id=f.id JOIN users u ON f.user_id=u.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'faculty') {
      const facId = getFacultyId(req.user.id);
      if (facId) { q += ' AND qz.faculty_id=?'; params.push(facId); }
    } else if (req.user.role === 'student') {
      const stu = getStudentInfo(req.user.id);
      if (stu) { q += ' AND c.program_id=? AND c.semester=?'; params.push(stu.program_id, stu.semester); }
    }
    if (course_id) { q += ' AND qz.course_id=?'; params.push(course_id); }
    if (status) { q += ' AND qz.status=?'; params.push(status); }
    q += ' ORDER BY qz.created_at DESC';
    const rows = db.prepare(q).all(...params);
    const stuInfo = req.user.role === 'student' ? getStudentInfo(req.user.id) : null;
    res.json(rows.map(qz => {
      const attemptCount = db.prepare('SELECT COUNT(*) as c FROM lms_quiz_attempts WHERE quiz_id=?').get(qz.id).c;
      let myAttempt = null;
      if (stuInfo) {
        myAttempt = db.prepare('SELECT id, score, status, submitted_at FROM lms_quiz_attempts WHERE quiz_id=? AND student_id=?').get(qz.id, stuInfo.id);
      }
      return { ...qz, attempt_count: attemptCount, my_attempt: myAttempt };
    }));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/quizzes', authorize('faculty','admin'), (req, res) => {
  try {
    const { title, course_id, total_marks, duration_minutes, start_time, end_time, academic_year_id, instructions } = req.body;
    if (!title || !course_id) return res.status(400).json({ error: 'Title and course required.' });
    const facId = getFacultyId(req.user.id);
    const r = db.prepare('INSERT INTO lms_quizzes (title,course_id,faculty_id,total_marks,duration_minutes,start_time,end_time,academic_year_id,status) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(title, course_id, facId, total_marks||10, duration_minutes||30, start_time||null, end_time||null, academic_year_id||1, 'draft');
    res.status(201).json({ id: r.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/quizzes/:id/status', authorize('faculty','admin','hod'), (req, res) => {
  try {
    const { status } = req.body;
    db.prepare('UPDATE lms_quizzes SET status=? WHERE id=?').run(status, req.params.id);
    res.json({ message: 'Status updated.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/quizzes/:id/attempt', authorize('student'), (req, res) => {
  try {
    const stu = getStudentInfo(req.user.id);
    if (!stu) return res.status(404).json({ error: 'Student not found.' });
    const quiz = db.prepare("SELECT status FROM lms_quizzes WHERE id=?").get(req.params.id);
    if (!quiz || quiz.status !== 'active') return res.status(400).json({ error: 'Quiz is not active.' });
    db.prepare("INSERT OR IGNORE INTO lms_quiz_attempts (quiz_id,student_id,started_at,status) VALUES (?,?,datetime('now'),'in_progress')")
      .run(req.params.id, stu.id);
    res.status(201).json({ message: 'Quiz started.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.put('/quizzes/:id/submit', authorize('student'), (req, res) => {
  try {
    const stu = getStudentInfo(req.user.id);
    if (!stu) return res.status(404).json({ error: 'Student not found.' });
    const { score } = req.body;
    db.prepare("UPDATE lms_quiz_attempts SET score=?,status='submitted',submitted_at=datetime('now') WHERE quiz_id=? AND student_id=?")
      .run(score||0, req.params.id, stu.id);
    res.json({ message: 'Quiz submitted.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Announcements ─────────────────────────────────────────────────────────────
router.get('/announcements', (req, res) => {
  try {
    const { course_id } = req.query;
    let q = `SELECT an.*, c.name as course_name, u.name as faculty_name
      FROM lms_announcements an
      JOIN courses c ON an.course_id=c.id
      JOIN faculty f ON an.faculty_id=f.id JOIN users u ON f.user_id=u.id WHERE 1=1`;
    const params = [];
    if (req.user.role === 'student') {
      const stu = getStudentInfo(req.user.id);
      if (stu) { q += ' AND c.program_id=? AND c.semester=?'; params.push(stu.program_id, stu.semester); }
    } else if (req.user.role === 'faculty') {
      const facId = getFacultyId(req.user.id);
      if (facId) { q += ' AND an.faculty_id=?'; params.push(facId); }
    }
    if (course_id) { q += ' AND an.course_id=?'; params.push(course_id); }
    q += ' ORDER BY an.pinned DESC, an.created_at DESC';
    res.json(db.prepare(q).all(...params));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.post('/announcements', authorize('faculty','admin','hod'), (req, res) => {
  try {
    const { title, content, course_id, priority, pinned } = req.body;
    if (!title || !course_id) return res.status(400).json({ error: 'Title and course required.' });
    const facId = getFacultyId(req.user.id);
    const r = db.prepare('INSERT INTO lms_announcements (title,content,course_id,faculty_id,priority,pinned) VALUES (?,?,?,?,?,?)')
      .run(title, content, course_id, facId, priority||'normal', pinned ? 1 : 0);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.delete('/announcements/:id', authorize('faculty','admin'), (req, res) => {
  try {
    db.prepare('DELETE FROM lms_announcements WHERE id=?').run(req.params.id);
    res.json({ message: 'Deleted.' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
