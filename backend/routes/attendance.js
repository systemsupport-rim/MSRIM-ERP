const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { course_id, student_id, date, from_date, to_date } = req.query;
  let query = `SELECT a.*, u.name as student_name, s.enrollment_number, c.name as course_name, c.code as course_code
    FROM attendance a
    JOIN students st ON a.student_id = st.id
    JOIN users u ON st.user_id = u.id
    JOIN courses c ON a.course_id = c.id
    LEFT JOIN students s ON a.student_id = s.id
    WHERE 1=1`;
  const params = [];

  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!stu) return res.json([]);
    query += ' AND a.student_id = ?'; params.push(stu.id);
  } else if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { query += ' AND c.faculty_id = ?'; params.push(fac.id); }
  }

  if (course_id) { query += ' AND a.course_id = ?'; params.push(course_id); }
  if (student_id && req.user.role !== 'student') { query += ' AND a.student_id = ?'; params.push(student_id); }
  if (date) { query += ' AND a.date = ?'; params.push(date); }
  if (from_date) { query += ' AND a.date >= ?'; params.push(from_date); }
  if (to_date) { query += ' AND a.date <= ?'; params.push(to_date); }

  query += ' ORDER BY a.date DESC, u.name';
  const records = db.prepare(query).all(...params);
  res.json(records);
});

router.get('/summary', (req, res) => {
  const { course_id, student_id } = req.query;
  let stuId = student_id;

  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    stuId = stu?.id;
  }

  let query = `SELECT a.course_id, c.name as course_name, c.code as course_code,
    COUNT(*) as total_classes,
    SUM(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 ELSE 0 END) as attended,
    ROUND(100.0 * SUM(CASE WHEN a.status = 'present' OR a.status = 'late' THEN 1 ELSE 0 END) / COUNT(*), 2) as percentage
    FROM attendance a JOIN courses c ON a.course_id = c.id WHERE 1=1`;
  const params = [];
  if (stuId) { query += ' AND a.student_id = ?'; params.push(stuId); }
  if (course_id) { query += ' AND a.course_id = ?'; params.push(course_id); }
  query += ' GROUP BY a.course_id, c.name, c.code';

  res.json(db.prepare(query).all(...params));
});

// Per-student attendance summary (for admin/HOD/faculty view)
router.get('/student-summary', authorize('admin','hod','registrar','faculty'), (req, res) => {
  const { course_id, section, min_pct, max_pct } = req.query;

  let q = `
    SELECT
      s.id as student_id,
      u.name,
      s.enrollment_number,
      s.section,
      s.batch_year,
      COUNT(a.id) as total_classes,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absents,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late_count,
      ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(a.id),0), 1) as percentage
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN attendance a ON a.student_id = s.id
    WHERE s.status = 'active'
  `;
  const params = [];
  if (course_id) { q += ' AND a.course_id = ?'; params.push(course_id); }
  if (section) { q += ' AND s.section = ?'; params.push(section); }
  q += ' GROUP BY s.id, u.name, s.enrollment_number, s.section, s.batch_year';
  if (min_pct) { q += ' HAVING percentage >= ?'; params.push(parseFloat(min_pct)); }
  if (max_pct) { q += (min_pct ? ' AND' : ' HAVING') + ' percentage <= ?'; params.push(parseFloat(max_pct)); }
  q += ' ORDER BY CASE WHEN percentage IS NULL THEN 1 ELSE 0 END, percentage ASC';

  const students = db.prepare(q).all(...params);

  // Per-course breakdown for each student
  const courseBreakdown = db.prepare(`
    SELECT a.student_id, c.name as course_name, c.code as course_code,
      COUNT(*) as total,
      SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
      ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(*), 1) as pct
    FROM attendance a JOIN courses c ON a.course_id = c.id
    GROUP BY a.student_id, a.course_id
  `).all();

  const courseMap = {};
  courseBreakdown.forEach(r => {
    if (!courseMap[r.student_id]) courseMap[r.student_id] = [];
    courseMap[r.student_id].push(r);
  });

  const result = students.map(s => ({
    ...s,
    courses: courseMap[s.student_id] || []
  }));

  res.json(result);
});

// Quick stats for dashboard
router.get('/stats', authorize('admin','hod','registrar','faculty'), (req, res) => {
  const overall = db.prepare(`
    SELECT
      COUNT(DISTINCT student_id) as total_students,
      ROUND(100.0 * SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) as avg_pct,
      SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as total_present,
      SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absent
    FROM attendance
  `).get();

  const critical = db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT student_id,
        ROUND(100.0 * SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0),1) as pct
      FROM attendance GROUP BY student_id HAVING pct < 65
    )
  `).get().c;

  const low = db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT student_id,
        ROUND(100.0 * SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0),1) as pct
      FROM attendance GROUP BY student_id HAVING pct >= 65 AND pct < 75
    )
  `).get().c;

  const good = db.prepare(`
    SELECT COUNT(*) as c FROM (
      SELECT student_id,
        ROUND(100.0 * SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0),1) as pct
      FROM attendance GROUP BY student_id HAVING pct >= 75
    )
  `).get().c;

  const todayDate = new Date().toISOString().split('T')[0];
  const todayStats = db.prepare(`
    SELECT
      SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent,
      COUNT(*) as total
    FROM attendance WHERE date = ?
  `).get(todayDate);

  res.json({ ...overall, critical, low, good, todayStats });
});

router.post('/bulk', authorize('faculty','admin','registrar'), (req, res) => {
  const { course_id, date, records } = req.body;
  if (!course_id || !date || !records) return res.status(400).json({ error: 'Missing required fields.' });

  const stmt = db.prepare(`INSERT INTO attendance (student_id,course_id,date,status,marked_by) VALUES (?,?,?,?,?)
    ON CONFLICT(student_id,course_id,date) DO UPDATE SET status=excluded.status`);

  const insertMany = db.transaction((recs) => {
    recs.forEach(r => stmt.run(r.student_id, course_id, date, r.status, req.user.id));
  });
  insertMany(records);
  res.json({ message: `Attendance marked for ${records.length} students.` });
});

router.get('/course/:courseId/date/:date', authorize('faculty','admin','registrar','hod'), (req, res) => {
  const { courseId, date } = req.params;
  const enrolled = db.prepare(`SELECT s.id as student_id, u.name, s.enrollment_number, s.roll_number, s.section
    FROM students s JOIN users u ON s.user_id = u.id
    JOIN courses c ON s.program_id = c.program_id AND s.semester = c.semester
    WHERE c.id = ? AND s.status = 'active' ORDER BY s.roll_number`).all(courseId);

  const marked = db.prepare('SELECT student_id, status FROM attendance WHERE course_id = ? AND date = ?').all(courseId, date);
  const markedMap = {};
  marked.forEach(m => markedMap[m.student_id] = m.status);

  const result = enrolled.map(s => ({ ...s, status: markedMap[s.student_id] || 'absent' }));
  res.json(result);
});

module.exports = router;
