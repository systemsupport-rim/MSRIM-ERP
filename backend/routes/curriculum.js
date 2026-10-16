const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { program_id, semester } = req.query;
  let q = `SELECT cm.*, c.name as course_name, c.code as course_code, c.credits as course_credits,
    p.name as program_name, p.code as program_code
    FROM curriculum_map cm
    JOIN courses c ON cm.course_id = c.id JOIN programs p ON cm.program_id = p.id WHERE 1=1`;
  const params = [];
  if (program_id) { q += ' AND cm.program_id=?'; params.push(program_id); }
  if (semester)   { q += ' AND cm.semester=?';   params.push(semester); }
  q += ' ORDER BY cm.program_id, cm.semester, c.code';
  res.json(db.prepare(q).all(...params));
});

router.post('/', authorize('admin','registrar','hod'), (req, res) => {
  const { program_id, course_id, semester, is_mandatory, credits } = req.body;
  try {
    const r = db.prepare('INSERT INTO curriculum_map (program_id,course_id,semester,is_mandatory,credits,created_by) VALUES (?,?,?,?,?,?)').run(program_id, course_id, semester, is_mandatory !== false ? 1 : 0, credits || 3, req.user.id);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch { res.status(400).json({ error: 'Course already mapped to this semester.' }); }
});

router.delete('/:id', authorize('admin','registrar','hod'), (req, res) => {
  db.prepare('DELETE FROM curriculum_map WHERE id=?').run(req.params.id);
  res.json({ message: 'Removed from curriculum.' });
});

router.get('/summary', (req, res) => {
  const summary = db.prepare(`SELECT p.id, p.name, p.code,
    COUNT(DISTINCT cm.course_id) as total_courses,
    SUM(cm.credits) as total_credits,
    COUNT(DISTINCT cm.semester) as semesters_mapped
    FROM programs p LEFT JOIN curriculum_map cm ON cm.program_id = p.id
    GROUP BY p.id ORDER BY p.code`).all();
  res.json(summary);
});

module.exports = router;
