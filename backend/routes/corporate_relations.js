const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const mgmt = ['admin','hod','registrar','placement'];

// ── Corporate Partners ─────────────────────────────────────────────────────────
router.get('/partners', (req, res) => {
  const { type, status, sector } = req.query;
  let q = 'SELECT * FROM corporate_partners WHERE 1=1';
  const p = [];
  if (type)   { q += ' AND partner_type=?';   p.push(type); }
  if (status) { q += ' AND status=?'; p.push(status); }
  if (sector) { q += ' AND sector=?'; p.push(sector); }
  q += ' ORDER BY name';
  res.json(db.prepare(q).all(...p));
});

router.get('/partners/:id', (req, res) => {
  const partner = db.prepare('SELECT * FROM corporate_partners WHERE id=?').get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Not found.' });
  const mous = db.prepare('SELECT * FROM mou_agreements WHERE partner_id=? ORDER BY signing_date DESC').all(partner.id);
  const events = db.prepare('SELECT * FROM cr_events WHERE partner_id=? ORDER BY event_date DESC LIMIT 10').all(partner.id);
  const mentors = db.prepare('SELECT * FROM executive_mentors WHERE company_id=? AND is_active=1').all(partner.id);
  res.json({ ...partner, mous, events, mentors });
});

router.post('/partners', authorize(...mgmt), (req, res) => {
  const { name, sector, partner_type, website, hq_city, hq_country, hr_contact_name, hr_contact_email,
    hr_contact_phone, description, linkedin_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const result = db.prepare(`INSERT INTO corporate_partners
    (name,sector,partner_type,website,hq_city,hq_country,hr_contact_name,hr_contact_email,hr_contact_phone,description,linkedin_url,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,'active')`).run(name,sector||null,partner_type||'placement',website||null,
    hq_city||null,hq_country||'India',hr_contact_name||null,hr_contact_email||null,hr_contact_phone||null,description||null,linkedin_url||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/partners/:id', authorize(...mgmt), (req, res) => {
  const p = db.prepare('SELECT * FROM corporate_partners WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found.' });
  const f = req.body;
  db.prepare(`UPDATE corporate_partners SET name=?,sector=?,partner_type=?,website=?,hq_city=?,hq_country=?,
    hr_contact_name=?,hr_contact_email=?,hr_contact_phone=?,description=?,linkedin_url=?,status=? WHERE id=?`)
    .run(f.name??p.name,f.sector??p.sector,f.partner_type??p.partner_type,f.website??p.website,
      f.hq_city??p.hq_city,f.hq_country??p.hq_country,f.hr_contact_name??p.hr_contact_name,
      f.hr_contact_email??p.hr_contact_email,f.hr_contact_phone??p.hr_contact_phone,
      f.description??p.description,f.linkedin_url??p.linkedin_url,f.status??p.status,req.params.id);
  res.json({ message: 'Updated.' });
});

// ── MOU Agreements ────────────────────────────────────────────────────────────
router.get('/mous', (req, res) => {
  const { status } = req.query;
  let q = `SELECT m.*, cp.name as partner_name, cp.sector FROM mou_agreements m
    JOIN corporate_partners cp ON m.partner_id = cp.id WHERE 1=1`;
  const p = [];
  if (status) { q += ' AND m.status=?'; p.push(status); }
  q += " ORDER BY m.signing_date DESC";
  const mous = db.prepare(q).all(...p);
  // Flag expiring within 60 days
  const now = Date.now();
  mous.forEach(m => {
    if (m.expiry_date) {
      const daysLeft = Math.ceil((new Date(m.expiry_date) - now) / (1000 * 60 * 60 * 24));
      m.days_to_expiry = daysLeft;
      m.expiring_soon = daysLeft > 0 && daysLeft <= 60;
    }
  });
  res.json(mous);
});

router.post('/mous', authorize(...mgmt), (req, res) => {
  const { partner_id, mou_type, signing_date, expiry_date, scope, benefits, document_url, signed_by } = req.body;
  if (!partner_id || !signing_date) return res.status(400).json({ error: 'Partner and signing date required.' });
  if (expiry_date && expiry_date < signing_date) return res.status(400).json({ error: 'Expiry must be after signing date.' });
  const result = db.prepare(`INSERT INTO mou_agreements
    (partner_id,mou_type,signing_date,expiry_date,scope,benefits,document_url,signed_by,status)
    VALUES (?,?,?,?,?,?,?,?,'active')`).run(partner_id,mou_type||'general',signing_date,expiry_date||null,scope||null,benefits||null,document_url||null,signed_by||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/mous/:id', authorize(...mgmt), (req, res) => {
  const m = db.prepare('SELECT * FROM mou_agreements WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found.' });
  const f = req.body;
  db.prepare('UPDATE mou_agreements SET mou_type=?,signing_date=?,expiry_date=?,scope=?,benefits=?,document_url=?,status=? WHERE id=?')
    .run(f.mou_type??m.mou_type,f.signing_date??m.signing_date,f.expiry_date??m.expiry_date,f.scope??m.scope,f.benefits??m.benefits,f.document_url??m.document_url,f.status??m.status,req.params.id);
  res.json({ message: 'Updated.' });
});

// ── Guest Lectures ────────────────────────────────────────────────────────────
router.get('/guest-lectures', (req, res) => {
  const { year, partner_id } = req.query;
  let q = `SELECT gl.*, cp.name as company_name, u.name as course_faculty FROM cr_guest_lectures gl
    LEFT JOIN corporate_partners cp ON gl.partner_id = cp.id
    LEFT JOIN users u ON gl.faculty_coordinator_id = u.id WHERE 1=1`;
  const p = [];
  if (year)       { q += " AND strftime('%Y',gl.event_date)=?"; p.push(year); }
  if (partner_id) { q += ' AND gl.partner_id=?'; p.push(partner_id); }
  q += ' ORDER BY gl.event_date DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/guest-lectures', authorize(...mgmt,'faculty'), (req, res) => {
  const { speaker_name, speaker_designation, speaker_company, partner_id, topic, event_date, venue,
    duration_hours, program, audience_size, feedback_score, faculty_coordinator_id, recording_url, description } = req.body;
  if (!speaker_name || !topic || !event_date) return res.status(400).json({ error: 'Speaker, topic and date required.' });
  const result = db.prepare(`INSERT INTO cr_guest_lectures
    (speaker_name,speaker_designation,speaker_company,partner_id,topic,event_date,venue,duration_hours,
     program,audience_size,feedback_score,faculty_coordinator_id,recording_url,description,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(speaker_name,speaker_designation||null,speaker_company||null,partner_id||null,topic,event_date,venue||null,duration_hours||1,program||null,audience_size||0,feedback_score||null,faculty_coordinator_id||req.user.id,recording_url||null,description||null,req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Industry Advisory Board ───────────────────────────────────────────────────
router.get('/advisory-board', (req, res) => {
  res.json(db.prepare('SELECT * FROM industry_advisory_board ORDER BY member_since DESC').all());
});

router.post('/advisory-board', authorize('admin','registrar'), (req, res) => {
  const { name, designation, company, sector, email, phone, expertise, member_since, term_end, profile_url } = req.body;
  if (!name || !company) return res.status(400).json({ error: 'Name and company required.' });
  const result = db.prepare(`INSERT INTO industry_advisory_board
    (name,designation,company,sector,email,phone,expertise,member_since,term_end,profile_url,is_active)
    VALUES (?,?,?,?,?,?,?,?,?,?,1)`).run(name,designation||null,company,sector||null,email||null,phone||null,expertise||null,member_since||null,term_end||null,profile_url||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/advisory-board/:id', authorize('admin','registrar'), (req, res) => {
  const f = req.body;
  const m = db.prepare('SELECT * FROM industry_advisory_board WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Not found.' });
  db.prepare('UPDATE industry_advisory_board SET name=?,designation=?,company=?,sector=?,email=?,phone=?,expertise=?,term_end=?,is_active=? WHERE id=?')
    .run(f.name??m.name,f.designation??m.designation,f.company??m.company,f.sector??m.sector,f.email??m.email,f.phone??m.phone,f.expertise??m.expertise,f.term_end??m.term_end,f.is_active!==undefined?f.is_active?1:0:m.is_active,req.params.id);
  res.json({ message: 'Updated.' });
});

// ── Executive Mentors ─────────────────────────────────────────────────────────
router.get('/mentors', (req, res) => {
  res.json(db.prepare('SELECT * FROM executive_mentors WHERE is_active=1 ORDER BY name').all());
});

router.post('/mentors', authorize(...mgmt), (req, res) => {
  const { name, designation, company_id, company_name, sector, email, phone, expertise, linkedin_url, max_mentees } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const result = db.prepare(`INSERT INTO executive_mentors
    (name,designation,company_id,company_name,sector,email,phone,expertise,linkedin_url,max_mentees,is_active)
    VALUES (?,?,?,?,?,?,?,?,?,?,1)`).run(name,designation||null,company_id||null,company_name||null,sector||null,email||null,phone||null,expertise||null,linkedin_url||null,max_mentees||5);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/mentors/:id/assign', authorize(...mgmt), (req, res) => {
  const { student_id, batch_year } = req.body;
  if (!student_id) return res.status(400).json({ error: 'Student ID required.' });
  try {
    db.prepare('INSERT INTO executive_mentor_assignments (mentor_id,student_id,batch_year,assigned_by) VALUES (?,?,?,?)')
      .run(req.params.id, student_id, batch_year||new Date().getFullYear(), req.user.id);
    res.status(201).json({ message: 'Assigned.' });
  } catch { res.status(400).json({ error: 'Already assigned.' }); }
});

// ── Corporate Events ──────────────────────────────────────────────────────────
router.get('/events', (req, res) => {
  const { year, type } = req.query;
  let q = `SELECT ce.*, cp.name as partner_name FROM cr_events ce
    LEFT JOIN corporate_partners cp ON ce.partner_id = cp.id WHERE 1=1`;
  const p = [];
  if (year) { q += " AND strftime('%Y',ce.event_date)=?"; p.push(year); }
  if (type) { q += ' AND ce.event_type=?'; p.push(type); }
  q += ' ORDER BY ce.event_date DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/events', authorize(...mgmt,'faculty'), (req, res) => {
  const { title, event_type, partner_id, event_date, venue, description, audience_size, outcome } = req.body;
  if (!title || !event_date) return res.status(400).json({ error: 'Title and date required.' });
  const result = db.prepare(`INSERT INTO cr_events
    (title,event_type,partner_id,event_date,venue,description,audience_size,outcome,created_by)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(title,event_type||'seminar',partner_id||null,event_date,venue||null,description||null,audience_size||0,outcome||null,req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Analytics Dashboard ───────────────────────────────────────────────────────
router.get('/analytics', authorize(...mgmt), (req, res) => {
  const overview = db.prepare(`SELECT
    (SELECT COUNT(*) FROM corporate_partners WHERE status='active') as active_partners,
    (SELECT COUNT(*) FROM mou_agreements WHERE status='active') as active_mous,
    (SELECT COUNT(*) FROM mou_agreements WHERE status='active' AND expiry_date <= date('now','+60 days')) as expiring_mous,
    (SELECT COUNT(*) FROM cr_guest_lectures) as total_guest_lectures,
    (SELECT COUNT(*) FROM industry_advisory_board WHERE is_active=1) as advisory_members,
    (SELECT COUNT(*) FROM executive_mentors WHERE is_active=1) as active_mentors,
    (SELECT COUNT(*) FROM cr_events) as total_events`).get();
  const bySector = db.prepare("SELECT sector, COUNT(*) as count FROM corporate_partners WHERE sector IS NOT NULL GROUP BY sector ORDER BY count DESC LIMIT 10").all();
  const byType = db.prepare("SELECT partner_type, COUNT(*) as count FROM corporate_partners GROUP BY partner_type").all();
  const recentLectures = db.prepare("SELECT gl.*, cp.name as company FROM cr_guest_lectures gl LEFT JOIN corporate_partners cp ON gl.partner_id=cp.id ORDER BY gl.event_date DESC LIMIT 5").all();
  const mouExpiring = db.prepare("SELECT m.*, cp.name as partner_name FROM mou_agreements m JOIN corporate_partners cp ON m.partner_id=cp.id WHERE m.status='active' AND m.expiry_date IS NOT NULL AND m.expiry_date <= date('now','+90 days') ORDER BY m.expiry_date").all();
  res.json({ overview, bySector, byType, recentLectures, mouExpiring });
});

module.exports = router;
