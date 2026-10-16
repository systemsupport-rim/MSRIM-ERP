const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const adminRoles = ['admin', 'placement'];

// List all companies
router.get('/', (req, res) => {
  const { active, sector, search } = req.query;
  let q = 'SELECT * FROM company_profiles WHERE 1=1';
  const p = [];
  if (active !== undefined) { q += ' AND is_active = ?'; p.push(active === 'true' ? 1 : 0); }
  if (sector) { q += ' AND sector = ?'; p.push(sector); }
  if (search) { q += ' AND (name LIKE ? OR sector LIKE ? OR city LIKE ?)'; const s = `%${search}%`; p.push(s, s, s); }
  q += ' ORDER BY name ASC';
  const companies = db.prepare(q).all(...p);
  const enriched = companies.map(c => {
    const jobs = db.prepare("SELECT COUNT(*) as c FROM job_postings WHERE company_id = ?").get(c.id);
    const hired = db.prepare("SELECT COUNT(*) as c FROM placement_offers WHERE company_id = ? AND status IN ('issued','accepted')").get(c.id);
    return { ...c, total_jobs: jobs?.c || 0, total_hired: hired?.c || 0 };
  });
  res.json(enriched);
});

// Get sectors for filter
router.get('/sectors', (req, res) => {
  const sectors = db.prepare("SELECT DISTINCT sector FROM company_profiles WHERE sector IS NOT NULL ORDER BY sector").all().map(r => r.sector);
  res.json(sectors);
});

// Get single company
router.get('/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM company_profiles WHERE id = ?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Company not found.' });
  const jobs = db.prepare('SELECT * FROM job_postings WHERE company_id = ? ORDER BY created_at DESC').all(c.id);
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT jp.id) as total_drives,
      COUNT(DISTINCT ja.student_id) as total_applications,
      COUNT(DISTINCT ol.student_id) as total_hired,
      MAX(jp.package_lpa) as max_package,
      AVG(jp.package_lpa) as avg_package
    FROM job_postings jp
    LEFT JOIN job_applications ja ON ja.job_id = jp.id
    LEFT JOIN placement_offers ol ON ol.job_id = jp.id
    WHERE jp.company_id = ?
  `).get(c.id);
  res.json({ ...c, jobs, stats });
});

// Create company
router.post('/', authorize(...adminRoles), (req, res) => {
  const { name, sector, website, description, hr_name, hr_email, hr_phone, address, city, state, employee_count, founded_year, mou_signed, mou_date } = req.body;
  if (!name) return res.status(400).json({ error: 'Company name is required.' });
  const result = db.prepare(`
    INSERT INTO company_profiles (name,sector,website,description,hr_name,hr_email,hr_phone,address,city,state,employee_count,founded_year,mou_signed,mou_date,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(name,sector,website,description,hr_name,hr_email,hr_phone,address,city,state,employee_count,founded_year,mou_signed?1:0,mou_date,req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Company created.' });
});

// Update company
router.put('/:id', authorize(...adminRoles), (req, res) => {
  const { name, sector, website, description, hr_name, hr_email, hr_phone, address, city, state, employee_count, founded_year, mou_signed, mou_date, mou_expiry, is_active } = req.body;
  db.prepare(`
    UPDATE company_profiles SET name=?,sector=?,website=?,description=?,hr_name=?,hr_email=?,hr_phone=?,
    address=?,city=?,state=?,employee_count=?,founded_year=?,mou_signed=?,mou_date=?,mou_expiry=?,is_active=?
    WHERE id=?
  `).run(name,sector,website,description,hr_name,hr_email,hr_phone,address,city,state,employee_count,founded_year,mou_signed?1:0,mou_date,mou_expiry,is_active?1:0,req.params.id);
  res.json({ message: 'Company updated.' });
});

// Delete company
router.delete('/:id', authorize('admin'), (req, res) => {
  db.prepare('UPDATE company_profiles SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Company deactivated.' });
});

// Get company hiring stats (year-wise)
router.get('/:id/stats', (req, res) => {
  const yearWise = db.prepare(`
    SELECT strftime('%Y', ol.created_at) as year, COUNT(*) as hired, AVG(ol.package_lpa) as avg_pkg
    FROM placement_offers ol WHERE ol.company_id = ? GROUP BY year ORDER BY year DESC
  `).all(req.params.id);
  const rounds = db.prepare(`
    SELECT hr.round_name, COUNT(rr.id) as appeared, SUM(CASE WHEN rr.status='passed' THEN 1 ELSE 0 END) as passed
    FROM hiring_rounds hr
    JOIN job_postings jp ON hr.job_id = jp.id
    LEFT JOIN round_results rr ON rr.round_id = hr.id
    WHERE jp.company_id = ? GROUP BY hr.round_name
  `).all(req.params.id);
  res.json({ yearWise, rounds });
});

module.exports = router;
