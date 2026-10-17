const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/forms', (req, res) => {
  const { type, status } = req.query;
  let q = `SELECT f.*, u.name as created_by_name, c.name as course_name FROM feedback_forms f
    LEFT JOIN users u ON f.created_by = u.id LEFT JOIN courses c ON f.course_id = c.id WHERE 1=1`;
  const params = [];
  if (type) { q += ' AND f.type = ?'; params.push(type); }
  if (status) { q += ' AND f.status = ?'; params.push(status); }
  if (req.user.role === 'student') { q += " AND f.target_role IN ('student','all') AND f.status = 'active'"; }
  q += ' ORDER BY f.created_at DESC';
  const forms = db.prepare(q).all(...params);
  res.json(forms.map(f => {
    const respCount = db.prepare('SELECT COUNT(*) as c FROM feedback_responses WHERE form_id = ?').get(f.id);
    const hasResponded = req.user.role === 'student' ? db.prepare('SELECT id FROM feedback_responses WHERE form_id = ? AND respondent_id = ?').get(f.id, req.user.id) : null;
    return { ...f, response_count: respCount.c, has_responded: !!hasResponded };
  }));
});

router.get('/forms/:id', (req, res) => {
  const form = db.prepare('SELECT * FROM feedback_forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found.' });
  const questions = db.prepare('SELECT * FROM feedback_questions WHERE form_id = ? ORDER BY order_num').all(req.params.id);
  res.json({ ...form, questions });
});

router.post('/forms', authorize('admin','hod','registrar','faculty'), (req, res) => {
  const { title, description, type, target_role, course_id, faculty_id, academic_year_id, start_date, end_date, is_anonymous, questions } = req.body;
  const result = db.prepare('INSERT INTO feedback_forms (title,description,type,target_role,course_id,faculty_id,academic_year_id,start_date,end_date,is_anonymous,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(title,description,type||'general',target_role||'student',course_id||null,faculty_id||null,academic_year_id||1,start_date,end_date,is_anonymous?1:0,'active',req.user.id);
  const formId = result.lastInsertRowid;
  if (questions && Array.isArray(questions)) {
    const qStmt = db.prepare('INSERT INTO feedback_questions (form_id,question_text,question_type,is_required,order_num) VALUES (?,?,?,?,?)');
    questions.forEach((q,i) => qStmt.run(formId,q.text,q.type||'rating',q.required?1:0,i+1));
  }
  res.status(201).json({ id: formId });
});

router.post('/forms/:id/respond', authorize('student','faculty'), (req, res) => {
  const { response_data } = req.body;
  const form = db.prepare('SELECT * FROM feedback_forms WHERE id = ?').get(req.params.id);
  if (!form || form.status !== 'active') return res.status(400).json({ error: 'Form not available.' });
  try {
    db.prepare('INSERT INTO feedback_responses (form_id,respondent_id,response_data) VALUES (?,?,?)').run(form.id, req.user.id, JSON.stringify(response_data));
    res.status(201).json({ message: 'Response submitted successfully.' });
  } catch { res.status(400).json({ error: 'Already responded to this form.' }); }
});

router.get('/forms/:id/responses', authorize('admin','hod','registrar','faculty'), (req, res) => {
  const form = db.prepare('SELECT * FROM feedback_forms WHERE id = ?').get(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found.' });
  const responses = db.prepare(`SELECT fr.*, ${form.is_anonymous ? 'NULL as respondent_name' : 'u.name as respondent_name'} FROM feedback_responses fr LEFT JOIN users u ON fr.respondent_id = u.id WHERE fr.form_id = ? ORDER BY fr.submitted_at DESC`).all(req.params.id);
  const questions = db.prepare('SELECT * FROM feedback_questions WHERE form_id = ? ORDER BY order_num').all(req.params.id);
  res.json({ form, questions, responses: responses.map(r => ({ ...r, response_data: JSON.parse(r.response_data || '{}') })) });
});

router.put('/forms/:id/close', authorize('admin','hod','registrar'), (req, res) => {
  db.prepare("UPDATE feedback_forms SET status = 'closed' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Form closed.' });
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM feedback_forms').get();
  const active = db.prepare("SELECT COUNT(*) as c FROM feedback_forms WHERE status = 'active'").get();
  const responses = db.prepare('SELECT COUNT(*) as c FROM feedback_responses').get();
  const uniqueStudents = db.prepare("SELECT COUNT(DISTINCT respondent_id) as c FROM feedback_responses WHERE respondent_id IN (SELECT user_id FROM students)").get();
  const uniqueFaculty = db.prepare("SELECT COUNT(DISTINCT fac.user_id) as c FROM feedback_forms f JOIN faculty fac ON f.faculty_id = fac.id WHERE f.status = 'active'").get();
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM feedback_forms GROUP BY type').all();
  res.json({ total: total.c, active: active.c, responses: responses.c, uniqueStudents: uniqueStudents.c, uniqueFaculty: uniqueFaculty.c, byType });
});

module.exports = router;
