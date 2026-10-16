const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Student Placement Profile ─────────────────────────────────────────────────

function getStudentId(userId) {
  return db.prepare('SELECT id FROM students WHERE user_id = ?').get(userId)?.id;
}

// Get placement profile (self or admin)
router.get('/profile/:studentId?', (req, res) => {
  const stuId = req.params.studentId || getStudentId(req.user.id);
  if (!stuId) return res.status(404).json({ error: 'Student profile not found.' });
  const student = db.prepare(`
    SELECT s.*, u.name, u.email, u.phone FROM students s JOIN users u ON s.user_id = u.id WHERE s.id = ?
  `).get(stuId);
  const skills = db.prepare('SELECT * FROM student_skills WHERE student_id = ? ORDER BY category, skill_name').all(stuId);
  const certs = db.prepare('SELECT * FROM student_certifications WHERE student_id = ? ORDER BY issue_date DESC').all(stuId);
  const docs = db.prepare('SELECT * FROM placement_documents WHERE student_id = ? ORDER BY uploaded_at DESC').all(stuId);
  const applications = db.prepare(`
    SELECT ja.*, jp.title, jp.job_role, jp.package_lpa, cp.name as company_name, cp.sector
    FROM job_applications ja
    JOIN job_postings jp ON ja.job_id = jp.id
    JOIN company_profiles cp ON jp.company_id = cp.id
    WHERE ja.student_id = ? ORDER BY ja.applied_at DESC
  `).all(stuId);
  const offers = db.prepare(`
    SELECT ol.*, jp.title, cp.name as company_name FROM placement_offers ol
    JOIN job_postings jp ON ol.job_id = jp.id
    JOIN company_profiles cp ON ol.company_id = cp.id
    WHERE ol.student_id = ? ORDER BY ol.created_at DESC
  `).all(stuId);
  res.json({ student, skills, certs, docs, applications, offers });
});

// ── Skills ────────────────────────────────────────────────────────────────────

router.get('/skills', (req, res) => {
  const stuId = getStudentId(req.user.id);
  if (!stuId) return res.status(404).json({ error: 'Not found.' });
  res.json(db.prepare('SELECT * FROM student_skills WHERE student_id = ?').all(stuId));
});

router.post('/skills', (req, res) => {
  const stuId = req.body.student_id || getStudentId(req.user.id);
  const { skill_name, proficiency, category } = req.body;
  if (!skill_name) return res.status(400).json({ error: 'Skill name required.' });
  const result = db.prepare('INSERT INTO student_skills (student_id,skill_name,proficiency,category) VALUES (?,?,?,?)')
    .run(stuId, skill_name, proficiency||'intermediate', category||'technical');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/skills/:id', (req, res) => {
  db.prepare('DELETE FROM student_skills WHERE id = ?').run(req.params.id);
  res.json({ message: 'Skill removed.' });
});

// ── Certifications ────────────────────────────────────────────────────────────

router.get('/certifications', (req, res) => {
  const stuId = getStudentId(req.user.id);
  if (!stuId) return res.status(404).json({ error: 'Not found.' });
  res.json(db.prepare('SELECT * FROM student_certifications WHERE student_id = ? ORDER BY issue_date DESC').all(stuId));
});

router.post('/certifications', (req, res) => {
  const stuId = req.body.student_id || getStudentId(req.user.id);
  const { cert_name, issuer, issue_date, expiry_date, credential_id, cert_url } = req.body;
  if (!cert_name) return res.status(400).json({ error: 'Certificate name required.' });
  const result = db.prepare('INSERT INTO student_certifications (student_id,cert_name,issuer,issue_date,expiry_date,credential_id,cert_url) VALUES (?,?,?,?,?,?,?)')
    .run(stuId, cert_name, issuer, issue_date, expiry_date, credential_id, cert_url);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/certifications/:id', (req, res) => {
  db.prepare('DELETE FROM student_certifications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Certification removed.' });
});

// ── Documents ─────────────────────────────────────────────────────────────────

router.get('/documents', (req, res) => {
  const stuId = getStudentId(req.user.id);
  if (!stuId) return res.status(404).json({ error: 'Not found.' });
  res.json(db.prepare('SELECT * FROM placement_documents WHERE student_id = ? ORDER BY uploaded_at DESC').all(stuId));
});

router.post('/documents', (req, res) => {
  const stuId = req.body.student_id || getStudentId(req.user.id);
  const { doc_type, file_name, file_url } = req.body;
  const result = db.prepare('INSERT INTO placement_documents (student_id,doc_type,file_name,file_url) VALUES (?,?,?,?)')
    .run(stuId, doc_type, file_name, file_url);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/documents/:id', (req, res) => {
  db.prepare('DELETE FROM placement_documents WHERE id = ?').run(req.params.id);
  res.json({ message: 'Document removed.' });
});

// ── Eligibility Check ─────────────────────────────────────────────────────────

router.get('/eligibility/:jobId', (req, res) => {
  const stuId = getStudentId(req.user.id);
  if (!stuId) return res.status(404).json({ error: 'Student not found.' });
  const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  const stu = db.prepare('SELECT * FROM students WHERE id = ?').get(stuId);

  const checks = [];
  let eligible = true;

  if (job.min_cgpa > 0) {
    const cgpa = parseFloat(stu.cgpa) || 0;
    const pass = cgpa >= job.min_cgpa;
    checks.push({ criteria: 'Minimum CGPA', required: job.min_cgpa, actual: cgpa, pass });
    if (!pass) eligible = false;
  }
  if (job.max_backlogs >= 0) {
    const bl = stu.backlogs || 0;
    const pass = bl <= job.max_backlogs;
    checks.push({ criteria: 'Max Backlogs', required: job.max_backlogs, actual: bl, pass });
    if (!pass) eligible = false;
  }
  if (job.allowed_batches && job.allowed_batches !== '[]') {
    try {
      const batches = JSON.parse(job.allowed_batches);
      if (batches.length) {
        const pass = batches.includes(String(stu.batch_year));
        checks.push({ criteria: 'Batch', required: batches.join(', '), actual: stu.batch_year, pass });
        if (!pass) eligible = false;
      }
    } catch(_) {}
  }

  const alreadyApplied = db.prepare('SELECT id FROM job_applications WHERE job_id=? AND student_id=?').get(req.params.jobId, stuId);
  res.json({ eligible, already_applied: !!alreadyApplied, checks });
});

// ── Placement Reports ─────────────────────────────────────────────────────────

router.get('/reports/batch/:batch', authorize('admin','placement'), (req, res) => {
  const batch = req.params.batch;
  const students = db.prepare(`
    SELECT s.*, u.name, u.email,
      COUNT(DISTINCT ja.id) as applications,
      COUNT(DISTINCT ol.id) as offers,
      MAX(ol.package_lpa) as best_offer
    FROM students s JOIN users u ON s.user_id = u.id
    LEFT JOIN job_applications ja ON ja.student_id = s.id
    LEFT JOIN placement_offers ol ON ol.student_id = s.id
    WHERE s.batch_year = ? GROUP BY s.id
    ORDER BY offers DESC, applications DESC
  `).all(batch);

  const summary = {
    total_students: students.length,
    placed: students.filter(s => s.offers > 0).length,
    avg_package: students.filter(s=>s.best_offer).reduce((a,s)=>a+s.best_offer,0) / (students.filter(s=>s.best_offer).length||1),
    max_package: Math.max(...students.map(s=>s.best_offer||0)),
  };
  summary.placement_pct = summary.total_students ? Math.round((summary.placed/summary.total_students)*100) : 0;

  res.json({ batch, summary, students });
});

router.get('/reports/overall', authorize('admin','placement'), (req, res) => {
  const byBatch = db.prepare(`
    SELECT s.batch_year as batch,
      COUNT(DISTINCT s.id) as total,
      COUNT(DISTINCT ol.student_id) as placed,
      AVG(ol.package_lpa) as avg_pkg,
      MAX(ol.package_lpa) as max_pkg
    FROM students s LEFT JOIN placement_offers ol ON ol.student_id = s.id
    GROUP BY s.batch_year ORDER BY s.batch_year DESC
  `).all();

  const topCompanies = db.prepare(`
    SELECT cp.name as company, cp.sector, COUNT(ol.id) as offers, AVG(ol.package_lpa) as avg_pkg
    FROM placement_offers ol JOIN company_profiles cp ON ol.company_id = cp.id
    GROUP BY cp.id ORDER BY offers DESC LIMIT 10
  `).all();

  const bySector = db.prepare(`
    SELECT cp.sector, COUNT(ol.id) as placements
    FROM placement_offers ol JOIN company_profiles cp ON ol.company_id = cp.id
    GROUP BY cp.sector ORDER BY placements DESC
  `).all();

  res.json({ byBatch, topCompanies, bySector });
});

module.exports = router;
