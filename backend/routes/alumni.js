const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { graduation_year, industry, is_mentor, search } = req.query;
  let q = `SELECT al.*, COALESCE(u.name, al.name) as name, u.email, u.phone FROM alumni al LEFT JOIN users u ON al.user_id = u.id WHERE al.profile_visible=1`;
  const params = [];
  if (graduation_year) { q += ' AND al.graduation_year=?'; params.push(graduation_year); }
  if (industry) { q += ' AND al.industry=?'; params.push(industry); }
  if (is_mentor === '1') { q += ' AND al.is_mentor=1'; }
  if (search) { q += ' AND (u.name LIKE ? OR al.current_company LIKE ? OR al.skills LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  q += ' ORDER BY al.graduation_year DESC, u.name LIMIT 200';
  res.json(db.prepare(q).all(...params));
});

router.post('/', authorize('admin','registrar'), (req, res) => {
  const { user_id, student_id, name, graduation_year, program, current_company, current_designation, current_location, linkedin_url, industry, salary_range, skills, is_mentor } = req.body;
  if (!graduation_year) return res.status(400).json({ error: 'graduation_year required.' });
  const result = db.prepare(`INSERT INTO alumni (user_id,student_id,name,graduation_year,program,current_company,current_designation,current_location,linkedin_url,industry,salary_range,skills,is_mentor) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(user_id||null, student_id||null, name||'', graduation_year, program||'', current_company||'', current_designation||'', current_location||'', linkedin_url||'', industry||'', salary_range||'', skills||'', is_mentor?1:0);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { current_company, current_designation, current_location, linkedin_url, industry, salary_range, skills, is_mentor, profile_visible } = req.body;
  db.prepare(`UPDATE alumni SET current_company=?,current_designation=?,current_location=?,linkedin_url=?,industry=?,salary_range=?,skills=?,is_mentor=?,profile_visible=? WHERE id=?`).run(current_company||'', current_designation||'', current_location||'', linkedin_url||'', industry||'', salary_range||'', skills||'', is_mentor?1:0, profile_visible??1, req.params.id);
  res.json({ success: true });
});

// Alumni Jobs
router.get('/jobs', (req, res) => {
  const { is_active } = req.query;
  let q = `SELECT aj.*, al.current_company as alumni_company, COALESCE(u.name, al.name) as posted_by_name FROM alumni_jobs aj LEFT JOIN alumni al ON aj.posted_by=al.id LEFT JOIN users u ON al.user_id=u.id WHERE 1=1`;
  const params = [];
  if (is_active !== undefined) { q += ' AND aj.is_active=?'; params.push(parseInt(is_active)); }
  q += ' ORDER BY aj.created_at DESC LIMIT 100';
  res.json(db.prepare(q).all(...params));
});

router.post('/jobs', (req, res) => {
  const { posted_by, title, company, location, job_type, experience_required, salary_range, description, apply_link, last_date } = req.body;
  if (!title || !company) return res.status(400).json({ error: 'Title and company required.' });
  const result = db.prepare(`INSERT INTO alumni_jobs (posted_by,title,company,location,job_type,experience_required,salary_range,description,apply_link,last_date) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(posted_by||null, title, company, location||'', job_type||'full_time', experience_required||'', salary_range||'', description||'', apply_link||'', last_date||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/jobs/:id', (req, res) => {
  const { is_active } = req.body;
  db.prepare(`UPDATE alumni_jobs SET is_active=? WHERE id=?`).run(is_active?1:0, req.params.id);
  res.json({ success: true });
});

// Alumni Events
router.get('/events', (req, res) => {
  const events = db.prepare(`SELECT ae.*, u.name as organizer_name FROM alumni_events ae LEFT JOIN alumni al ON ae.organizer_id=al.id LEFT JOIN users u ON al.user_id=u.id ORDER BY ae.date DESC LIMIT 50`).all();
  res.json(events);
});

router.post('/events', authorize('admin','registrar'), (req, res) => {
  const { title, type, description, date, venue, organizer_id, max_attendees, registration_link } = req.body;
  if (!title || !date) return res.status(400).json({ error: 'Title and date required.' });
  const result = db.prepare(`INSERT INTO alumni_events (title,type,description,date,venue,organizer_id,max_attendees,registration_link) VALUES (?,?,?,?,?,?,?,?)`).run(title, type||'meetup', description||'', date, venue||'', organizer_id||null, max_attendees||null, registration_link||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/stats', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as c FROM alumni`).get().c;
  const employed = db.prepare(`SELECT COUNT(*) as c FROM alumni WHERE current_company != ''`).get().c;
  const mentors = db.prepare(`SELECT COUNT(*) as c FROM alumni WHERE is_mentor=1`).get().c;
  const jobs = db.prepare(`SELECT COUNT(*) as c FROM alumni_jobs WHERE is_active=1`).get().c;
  const events = db.prepare(`SELECT COUNT(*) as c FROM alumni_events WHERE status='upcoming'`).get().c;
  const byIndustry = db.prepare(`SELECT industry, COUNT(*) as c FROM alumni WHERE industry != '' GROUP BY industry ORDER BY c DESC LIMIT 8`).all();
  const byYear = db.prepare(`SELECT graduation_year, COUNT(*) as c FROM alumni GROUP BY graduation_year ORDER BY graduation_year DESC LIMIT 10`).all();
  const recentJobs = db.prepare(`SELECT * FROM alumni_jobs WHERE is_active=1 ORDER BY created_at DESC LIMIT 5`).all();
  res.json({ total, employed, mentors, jobs, events, byIndustry, byYear, recentJobs });
});

module.exports = router;
