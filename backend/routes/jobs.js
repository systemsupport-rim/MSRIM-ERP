const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const adminRoles = ['admin', 'placement'];

function enrichJob(job) {
  const company = db.prepare('SELECT name, sector, city, hr_name, hr_email FROM company_profiles WHERE id = ?').get(job.company_id);
  const apps = db.prepare("SELECT COUNT(*) as c FROM job_applications WHERE job_id = ?").get(job.id);
  const hired = db.prepare("SELECT COUNT(*) as c FROM placement_offers WHERE job_id = ? AND status IN ('issued','accepted')").get(job.id);
  const rounds = db.prepare('SELECT * FROM hiring_rounds WHERE job_id = ? ORDER BY round_number').all(job.id);
  return { ...job, company, total_applications: apps?.c || 0, total_hired: hired?.c || 0, rounds };
}

// List jobs
router.get('/', (req, res) => {
  const { status, type, company_id, approval_status, search } = req.query;
  let q = 'SELECT * FROM job_postings WHERE 1=1';
  const p = [];
  if (status) { q += ' AND status = ?'; p.push(status); }
  if (type) { q += ' AND type = ?'; p.push(type); }
  if (company_id) { q += ' AND company_id = ?'; p.push(company_id); }
  if (approval_status) { q += ' AND approval_status = ?'; p.push(approval_status); }
  if (search) { q += ' AND (title LIKE ? OR job_role LIKE ?)'; const s = `%${search}%`; p.push(s, s); }
  q += ' ORDER BY created_at DESC';
  const jobs = db.prepare(q).all(...p);
  res.json(jobs.map(enrichJob));
});

// Get eligible students for a job
router.get('/:id/eligible-students', authorize(...adminRoles), (req, res) => {
  const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });

  let q = `
    SELECT s.*, u.name, u.email, u.phone,
      CASE WHEN ja.id IS NOT NULL THEN 1 ELSE 0 END as has_applied,
      ja.status as application_status
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN job_applications ja ON ja.job_id = ? AND ja.student_id = s.id
    WHERE u.is_active = 1
  `;
  const p = [job.id];

  if (job.min_cgpa > 0) { q += ' AND (s.cgpa IS NULL OR CAST(s.cgpa AS REAL) >= ?)'; p.push(job.min_cgpa); }
  if (job.max_backlogs >= 0) { q += ' AND (s.backlogs IS NULL OR s.backlogs <= ?)'; p.push(job.max_backlogs); }

  const students = db.prepare(q).all(...p);

  let eligible = students;
  if (job.allowed_batches && job.allowed_batches !== '[]') {
    try {
      const batches = JSON.parse(job.allowed_batches);
      if (batches.length) eligible = eligible.filter(s => batches.includes(String(s.batch_year)));
    } catch (_) {}
  }
  if (job.allowed_branches && job.allowed_branches !== '[]') {
    try {
      const branches = JSON.parse(job.allowed_branches);
      if (branches.length) eligible = eligible.filter(s => branches.some(b => (s.program || '').toLowerCase().includes(b.toLowerCase())));
    } catch (_) {}
  }

  res.json({ total: eligible.length, students: eligible });
});

// Get single job
router.get('/:id', (req, res) => {
  const job = db.prepare('SELECT * FROM job_postings WHERE id = ?').get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  res.json(enrichJob(job));
});

// Create job
router.post('/', authorize(...adminRoles), (req, res) => {
  const {
    company_id, title, job_role, description, requirements, skills_required, location, type,
    package_min, package_max, package_lpa, stipend_monthly, duration_months, openings,
    min_cgpa, max_backlogs, allowed_branches, allowed_batches,
    drive_date, last_apply_date, ppt_date, ppt_venue, bond_years
  } = req.body;
  if (!title) return res.status(400).json({ error: 'Job title is required.' });
  const result = db.prepare(`
    INSERT INTO job_postings (company_id,title,job_role,description,requirements,skills_required,location,type,
      package_min,package_max,package_lpa,stipend_monthly,duration_months,openings,
      min_cgpa,max_backlogs,allowed_branches,allowed_batches,
      drive_date,last_apply_date,ppt_date,ppt_venue,bond_years,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(company_id,title,job_role,description,requirements,skills_required,location,type||'fulltime',
    package_min,package_max,package_lpa,stipend_monthly,duration_months,openings||1,
    min_cgpa||0,max_backlogs||0,
    JSON.stringify(allowed_branches||[]),JSON.stringify(allowed_batches||[]),
    drive_date,last_apply_date,ppt_date,ppt_venue,bond_years||0,req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Job created.' });
});

// Update job
router.put('/:id', authorize(...adminRoles), (req, res) => {
  const {
    title, job_role, description, requirements, skills_required, location, type,
    package_min, package_max, package_lpa, stipend_monthly, openings,
    min_cgpa, max_backlogs, allowed_branches, allowed_batches,
    drive_date, last_apply_date, ppt_date, ppt_venue, bond_years, status
  } = req.body;
  db.prepare(`
    UPDATE job_postings SET title=?,job_role=?,description=?,requirements=?,skills_required=?,location=?,type=?,
      package_min=?,package_max=?,package_lpa=?,stipend_monthly=?,openings=?,
      min_cgpa=?,max_backlogs=?,allowed_branches=?,allowed_batches=?,
      drive_date=?,last_apply_date=?,ppt_date=?,ppt_venue=?,bond_years=?,status=?
    WHERE id=?
  `).run(title,job_role,description,requirements,skills_required,location,type,
    package_min,package_max,package_lpa,stipend_monthly,openings,
    min_cgpa,max_backlogs,
    Array.isArray(allowed_branches)?JSON.stringify(allowed_branches):allowed_branches,
    Array.isArray(allowed_batches)?JSON.stringify(allowed_batches):allowed_batches,
    drive_date,last_apply_date,ppt_date,ppt_venue,bond_years,status,req.params.id);
  res.json({ message: 'Job updated.' });
});

// Approve job
router.put('/:id/approve', authorize('admin'), (req, res) => {
  const { action, remarks } = req.body;
  const status = action === 'approve' ? 'approved' : 'rejected';
  db.prepare(`UPDATE job_postings SET approval_status=?, approved_by=?, approved_at=datetime('now') WHERE id=?`)
    .run(status, req.user.id, req.params.id);
  if (status === 'approved') {
    db.prepare(`UPDATE job_postings SET status='open', published_at=datetime('now') WHERE id=?`).run(req.params.id);
  }
  res.json({ message: `Job ${status}.` });
});

// Publish job
router.put('/:id/publish', authorize(...adminRoles), (req, res) => {
  db.prepare(`UPDATE job_postings SET status='open', published_at=datetime('now') WHERE id=?`).run(req.params.id);
  res.json({ message: 'Job published.' });
});

// Close job
router.put('/:id/close', authorize(...adminRoles), (req, res) => {
  db.prepare(`UPDATE job_postings SET status='closed' WHERE id=?`).run(req.params.id);
  res.json({ message: 'Job closed.' });
});

// Delete job
router.delete('/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM round_results WHERE job_id = ?').run(req.params.id);
  db.prepare('DELETE FROM hiring_rounds WHERE job_id = ?').run(req.params.id);
  db.prepare('DELETE FROM job_applications WHERE job_id = ?').run(req.params.id);
  db.prepare('DELETE FROM job_postings WHERE id = ?').run(req.params.id);
  res.json({ message: 'Job deleted.' });
});

// ── Applications ─────────────────────────────────────────────────────────────

router.get('/:id/applications', (req, res) => {
  const apps = db.prepare(`
    SELECT ja.*, u.name as student_name, s.enrollment_number, s.cgpa, s.backlogs, s.program
    FROM job_applications ja
    JOIN students s ON ja.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE ja.job_id = ?
    ORDER BY ja.applied_at DESC
  `).all(req.params.id);
  res.json(apps);
});

router.post('/:id/apply', authorize('student'), (req, res) => {
  const job = db.prepare("SELECT * FROM job_postings WHERE id = ? AND status = 'open'").get(req.params.id);
  if (!job) return res.status(400).json({ error: 'Job is not open for applications.' });
  const stu = db.prepare('SELECT * FROM students WHERE user_id = ?').get(req.user.id);
  if (!stu) return res.status(404).json({ error: 'Student profile not found.' });

  // Eligibility check
  if (job.min_cgpa > 0 && stu.cgpa && parseFloat(stu.cgpa) < job.min_cgpa)
    return res.status(400).json({ error: `Minimum CGPA required: ${job.min_cgpa}` });
  if (stu.backlogs !== null && stu.backlogs > job.max_backlogs)
    return res.status(400).json({ error: `Maximum backlogs allowed: ${job.max_backlogs}` });

  try {
    db.prepare('INSERT INTO job_applications (job_id, student_id) VALUES (?, ?)').run(req.params.id, stu.id);
    res.status(201).json({ message: 'Applied successfully.' });
  } catch {
    res.status(400).json({ error: 'Already applied to this job.' });
  }
});

router.put('/applications/:appId/status', authorize(...adminRoles), (req, res) => {
  const { status, remarks } = req.body;
  db.prepare('UPDATE job_applications SET status=?, remarks=? WHERE id=?').run(status, remarks, req.params.appId);
  res.json({ message: 'Application status updated.' });
});

// ── Hiring Rounds ─────────────────────────────────────────────────────────────

router.get('/:id/rounds', (req, res) => {
  const rounds = db.prepare('SELECT * FROM hiring_rounds WHERE job_id = ? ORDER BY round_number').all(req.params.id);
  const enriched = rounds.map(r => {
    const results = db.prepare("SELECT status, COUNT(*) as count FROM round_results WHERE round_id = ? GROUP BY status").all(r.id);
    return { ...r, results_summary: results };
  });
  res.json(enriched);
});

router.post('/:id/rounds', authorize(...adminRoles), (req, res) => {
  const { round_number, round_name, round_type, scheduled_date, venue, duration_minutes, is_eliminatory, instructions } = req.body;
  const result = db.prepare(`
    INSERT INTO hiring_rounds (job_id,round_number,round_name,round_type,scheduled_date,venue,duration_minutes,is_eliminatory,instructions)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(req.params.id,round_number,round_name,round_type||'interview',scheduled_date,venue,duration_minutes||60,is_eliminatory?1:1,instructions);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Round added.' });
});

router.put('/:id/rounds/:roundId', authorize(...adminRoles), (req, res) => {
  const { round_name, round_type, scheduled_date, venue, duration_minutes, status, instructions } = req.body;
  db.prepare(`UPDATE hiring_rounds SET round_name=?,round_type=?,scheduled_date=?,venue=?,duration_minutes=?,status=?,instructions=? WHERE id=?`)
    .run(round_name,round_type,scheduled_date,venue,duration_minutes,status,instructions,req.params.roundId);
  res.json({ message: 'Round updated.' });
});

// Get round results
router.get('/:id/rounds/:roundId/results', (req, res) => {
  const results = db.prepare(`
    SELECT rr.*, u.name as student_name, s.enrollment_number, s.cgpa
    FROM round_results rr
    JOIN students s ON rr.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE rr.round_id = ?
    ORDER BY rr.score DESC
  `).all(req.params.roundId);
  res.json(results);
});

// Update/bulk upsert round results
router.post('/:id/rounds/:roundId/results', authorize(...adminRoles), (req, res) => {
  const { results } = req.body; // array of { student_id, status, score, feedback, interviewer }
  if (!Array.isArray(results)) return res.status(400).json({ error: 'results must be an array.' });
  const upsert = db.prepare(`
    INSERT INTO round_results (round_id, job_id, student_id, status, score, max_score, feedback, interviewer, interviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(round_id, student_id) DO UPDATE SET status=excluded.status, score=excluded.score,
      feedback=excluded.feedback, interviewer=excluded.interviewer, interviewed_at=excluded.interviewed_at
  `);
  results.forEach(r => upsert.run(req.params.roundId, req.params.id, r.student_id, r.status, r.score, r.max_score||100, r.feedback, r.interviewer));
  res.json({ message: `${results.length} results saved.` });
});

// ── Offer Letters ─────────────────────────────────────────────────────────────

router.get('/offers/all', (req, res) => {
  const offers = db.prepare(`
    SELECT ol.*, u.name as student_name, s.enrollment_number, cp.name as company_name
    FROM placement_offers ol
    JOIN students s ON ol.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN company_profiles cp ON ol.company_id = cp.id
    ORDER BY ol.created_at DESC
  `).all();
  res.json(offers);
});

router.post('/offers', authorize(...adminRoles), (req, res) => {
  const { job_id, student_id, company_id, offer_date, joining_date, package_lpa, designation, location } = req.body;
  try {
    const result = db.prepare(`
      INSERT INTO placement_offers (job_id,student_id,company_id,offer_date,joining_date,package_lpa,designation,location,issued_by)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(job_id,student_id,company_id,offer_date,joining_date,package_lpa,designation,location,req.user.id);
    // Update application status
    if (job_id && student_id) {
      db.prepare("UPDATE job_applications SET status='selected', offer_extended=1 WHERE job_id=? AND student_id=?").run(job_id,student_id);
    }
    res.status(201).json({ id: result.lastInsertRowid, message: 'Offer letter issued.' });
  } catch {
    res.status(400).json({ error: 'Offer already issued to this student for this job.' });
  }
});

router.put('/offers/:id', authorize(...adminRoles), (req, res) => {
  const { status, joining_date, package_lpa, remarks } = req.body;
  db.prepare('UPDATE placement_offers SET status=?,joining_date=?,package_lpa=?,remarks=? WHERE id=?')
    .run(status,joining_date,package_lpa,remarks,req.params.id);
  res.json({ message: 'Offer updated.' });
});

// ── Notifications ─────────────────────────────────────────────────────────────

router.post('/notify', authorize(...adminRoles), (req, res) => {
  const { title, message, recipient_type, recipient_id, channel, job_id } = req.body;
  db.prepare(`INSERT INTO placement_notifications (title,message,recipient_type,recipient_id,channel,job_id,created_by)
    VALUES (?,?,?,?,?,?,?)`).run(title,message,recipient_type||'all_students',recipient_id,channel||'in_app',job_id,req.user.id);
  res.status(201).json({ message: 'Notification sent.' });
});

router.get('/notifications', (req, res) => {
  const notifs = db.prepare('SELECT * FROM placement_notifications ORDER BY created_at DESC LIMIT 50').all();
  res.json(notifs);
});

// ── Full placement stats ──────────────────────────────────────────────────────

router.get('/stats/overview', (req, res) => {
  const overview = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM job_postings) as total_jobs,
      (SELECT COUNT(*) FROM job_postings WHERE status='open') as open_jobs,
      (SELECT COUNT(*) FROM job_applications) as total_applications,
      (SELECT COUNT(*) FROM placement_offers WHERE status IN ('issued','accepted')) as total_offers,
      (SELECT COUNT(*) FROM company_profiles WHERE is_active=1) as total_companies,
      (SELECT AVG(package_lpa) FROM placement_offers WHERE package_lpa > 0) as avg_package,
      (SELECT MAX(package_lpa) FROM placement_offers WHERE package_lpa > 0) as max_package
  `).get();

  const byDept = db.prepare(`
    SELECT s.program as dept, COUNT(DISTINCT ol.student_id) as placed
    FROM placement_offers ol JOIN students s ON ol.student_id = s.id
    GROUP BY s.program ORDER BY placed DESC
  `).all();

  const bySector = db.prepare(`
    SELECT cp.sector, COUNT(ol.id) as offers
    FROM placement_offers ol JOIN company_profiles cp ON ol.company_id = cp.id
    GROUP BY cp.sector ORDER BY offers DESC
  `).all();

  const byType = db.prepare(`
    SELECT type, COUNT(*) as count, AVG(package_lpa) as avg_pkg FROM job_postings GROUP BY type
  `).all();

  res.json({ overview, byDept, bySector, byType });
});

module.exports = router;
