const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const adminRoles = ['admin', 'placement'];

// List assessments
router.get('/', (req, res) => {
  const { job_id, type, status } = req.query;
  let q = `SELECT pa.*, jp.title as job_title, cp.name as company_name
    FROM placement_assessments pa
    LEFT JOIN job_postings jp ON pa.job_id = jp.id
    LEFT JOIN company_profiles cp ON jp.company_id = cp.id
    WHERE 1=1`;
  const p = [];
  if (job_id) { q += ' AND pa.job_id = ?'; p.push(job_id); }
  if (type) { q += ' AND pa.type = ?'; p.push(type); }
  if (status) { q += ' AND pa.status = ?'; p.push(status); }
  q += ' ORDER BY pa.created_at DESC';
  const assessments = db.prepare(q).all(...p);
  const enriched = assessments.map(a => {
    const qcount = db.prepare("SELECT COUNT(*) as c FROM assessment_questions WHERE assessment_id = ?").get(a.id);
    const results = db.prepare("SELECT COUNT(*) as appeared, AVG(percentage) as avg_pct, SUM(CASE WHEN status='passed' THEN 1 ELSE 0 END) as passed FROM student_assessment_results WHERE assessment_id = ?").get(a.id);
    return { ...a, question_count: qcount?.c || 0, results_summary: results };
  });
  res.json(enriched);
});

// Get single assessment with questions
router.get('/:id', (req, res) => {
  const a = db.prepare(`SELECT pa.*, jp.title as job_title FROM placement_assessments pa LEFT JOIN job_postings jp ON pa.job_id = jp.id WHERE pa.id = ?`).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Assessment not found.' });
  const questions = db.prepare('SELECT * FROM assessment_questions WHERE assessment_id = ? ORDER BY id').all(a.id);
  res.json({ ...a, questions });
});

// Create assessment
router.post('/', authorize(...adminRoles), (req, res) => {
  const { job_id, round_id, title, type, description, duration_minutes, pass_percentage, scheduled_at } = req.body;
  if (!title) return res.status(400).json({ error: 'Assessment title required.' });
  const result = db.prepare(`
    INSERT INTO placement_assessments (job_id,round_id,title,type,description,duration_minutes,pass_percentage,scheduled_at,created_by)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(job_id,round_id,title,type||'aptitude',description,duration_minutes||60,pass_percentage||60,scheduled_at,req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Assessment created.' });
});

// Update assessment
router.put('/:id', authorize(...adminRoles), (req, res) => {
  const { title, type, description, duration_minutes, pass_percentage, scheduled_at, status } = req.body;
  db.prepare(`UPDATE placement_assessments SET title=?,type=?,description=?,duration_minutes=?,pass_percentage=?,scheduled_at=?,status=? WHERE id=?`)
    .run(title,type,description,duration_minutes,pass_percentage,scheduled_at,status,req.params.id);
  res.json({ message: 'Assessment updated.' });
});

// Add question
router.post('/:id/questions', authorize(...adminRoles), (req, res) => {
  const { question, option_a, option_b, option_c, option_d, correct_option, marks, type, topic, difficulty } = req.body;
  if (!question) return res.status(400).json({ error: 'Question text required.' });
  const result = db.prepare(`
    INSERT INTO assessment_questions (assessment_id,question,option_a,option_b,option_c,option_d,correct_option,marks,type,topic,difficulty)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(req.params.id,question,option_a,option_b,option_c,option_d,correct_option,marks||1,type||'mcq',topic,difficulty||'medium');
  db.prepare("UPDATE placement_assessments SET total_questions = (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = ?) WHERE id = ?")
    .run(req.params.id, req.params.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Delete question
router.delete('/:id/questions/:qid', authorize(...adminRoles), (req, res) => {
  db.prepare('DELETE FROM assessment_questions WHERE id = ? AND assessment_id = ?').run(req.params.qid, req.params.id);
  db.prepare("UPDATE placement_assessments SET total_questions = (SELECT COUNT(*) FROM assessment_questions WHERE assessment_id = ?) WHERE id = ?")
    .run(req.params.id, req.params.id);
  res.json({ message: 'Question deleted.' });
});

// Student submits assessment
router.post('/:id/submit', authorize('student'), (req, res) => {
  const { answers } = req.body; // { questionId: 'A', ... }
  const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
  if (!stu) return res.status(404).json({ error: 'Student not found.' });
  const assessment = db.prepare('SELECT * FROM placement_assessments WHERE id = ?').get(req.params.id);
  if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });

  const questions = db.prepare('SELECT * FROM assessment_questions WHERE assessment_id = ?').all(req.params.id);
  let score = 0;
  const totalMarks = questions.reduce((s, q) => s + (q.marks || 1), 0);
  questions.forEach(q => {
    if (answers && answers[q.id] && answers[q.id].toLowerCase() === (q.correct_option || '').toLowerCase()) {
      score += q.marks || 1;
    }
  });
  const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
  const status = pct >= (assessment.pass_percentage || 60) ? 'passed' : 'failed';

  try {
    db.prepare(`
      INSERT INTO student_assessment_results (assessment_id,student_id,score,total_marks,percentage,status,answers,submitted_at)
      VALUES (?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(assessment_id,student_id) DO UPDATE SET score=excluded.score,total_marks=excluded.total_marks,percentage=excluded.percentage,status=excluded.status,answers=excluded.answers,submitted_at=excluded.submitted_at
    `).run(req.params.id, stu.id, score, totalMarks, pct, status, JSON.stringify(answers||{}));
    res.json({ score, totalMarks, percentage: pct, status });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Get assessment results
router.get('/:id/results', authorize(...adminRoles), (req, res) => {
  const results = db.prepare(`
    SELECT sar.*, u.name as student_name, s.enrollment_number
    FROM student_assessment_results sar
    JOIN students s ON sar.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE sar.assessment_id = ?
    ORDER BY sar.percentage DESC
  `).all(req.params.id);
  res.json(results);
});

// Publish assessment
router.put('/:id/publish', authorize(...adminRoles), (req, res) => {
  db.prepare("UPDATE placement_assessments SET status='scheduled' WHERE id=?").run(req.params.id);
  res.json({ message: 'Assessment published.' });
});

module.exports = router;
