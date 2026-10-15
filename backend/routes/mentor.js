const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/assignments', (req, res) => {
  let q = `SELECT ma.*, fu.name as mentor_name, f.employee_id, f.designation,
    su.name as mentee_name, s.enrollment_number, s.semester, s.section, ay.name as academic_year
    FROM mentor_assignments ma
    JOIN faculty f ON ma.mentor_id = f.id JOIN users fu ON f.user_id = fu.id
    JOIN students s ON ma.mentee_id = s.id JOIN users su ON s.user_id = su.id
    LEFT JOIN academic_years ay ON ma.academic_year_id = ay.id
    WHERE ma.status = 'active'`;
  const params = [];
  if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { q += ' AND ma.mentor_id = ?'; params.push(fac.id); }
  } else if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND ma.mentee_id = ?'; params.push(stu.id); }
  }
  q += ' ORDER BY fu.name, su.name';
  res.json(db.prepare(q).all(...params));
});

router.post('/assignments', authorize('admin','hod','registrar'), (req, res) => {
  const { mentor_id, mentee_id, academic_year_id } = req.body;
  try {
    const result = db.prepare('INSERT INTO mentor_assignments (mentor_id,mentee_id,academic_year_id) VALUES (?,?,?)').run(mentor_id,mentee_id,academic_year_id||1);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch { res.status(400).json({ error: 'Assignment already exists.' }); }
});

router.post('/assignments/bulk', authorize('admin','hod','registrar'), (req, res) => {
  const { mentor_id, mentee_ids, academic_year_id } = req.body;
  const stmt = db.prepare('INSERT OR IGNORE INTO mentor_assignments (mentor_id,mentee_id,academic_year_id) VALUES (?,?,?)');
  const insert = db.transaction((ids) => { ids.forEach(id => stmt.run(mentor_id,id,academic_year_id||1)); });
  insert(mentee_ids);
  res.json({ message: `${mentee_ids.length} mentees assigned.` });
});

router.get('/meetings/:assignmentId', (req, res) => {
  res.json(db.prepare('SELECT * FROM mentor_meetings WHERE assignment_id = ? ORDER BY meeting_date DESC').all(req.params.assignmentId));
});

router.post('/meetings', (req, res) => {
  const { assignment_id, meeting_date, duration_minutes, topics_discussed, action_points, next_meeting_date } = req.body;
  const result = db.prepare('INSERT INTO mentor_meetings (assignment_id,meeting_date,duration_minutes,topics_discussed,action_points,next_meeting_date) VALUES (?,?,?,?,?,?)').run(assignment_id,meeting_date,duration_minutes||30,topics_discussed||'',action_points||'',next_meeting_date||null);
  db.prepare('UPDATE mentor_assignments SET meeting_count = meeting_count + 1, last_meeting_date = ? WHERE id = ?').run(meeting_date,assignment_id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/stats', (req, res) => {
  const mentors = db.prepare("SELECT COUNT(DISTINCT mentor_id) as c FROM mentor_assignments WHERE status = 'active'").get();
  const mentees = db.prepare("SELECT COUNT(DISTINCT mentee_id) as c FROM mentor_assignments WHERE status = 'active'").get();
  const meetings = db.prepare('SELECT COUNT(*) as c FROM mentor_meetings').get();
  const unassigned = db.prepare("SELECT COUNT(*) as c FROM students WHERE id NOT IN (SELECT mentee_id FROM mentor_assignments WHERE status = 'active') AND status = 'active'").get();
  res.json({ mentors: mentors.c, mentees: mentees.c, totalMeetings: meetings.c, unassignedStudents: unassigned.c });
});

module.exports = router;
