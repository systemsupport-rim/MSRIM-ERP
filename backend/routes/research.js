const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const mgmt = ['admin','hod','registrar'];
const faculty = [...mgmt,'faculty'];

// ── Publications ──────────────────────────────────────────────────────────────
router.get('/publications', (req, res) => {
  const { faculty_id, year, type, status } = req.query;
  let q = `SELECT rp.*, u.name as faculty_name, d.name as dept_name
    FROM research_publications rp
    JOIN users u ON rp.faculty_id = u.id
    LEFT JOIN departments d ON rp.dept_id = d.id WHERE 1=1`;
  const p = [];
  if (faculty_id) { q += ' AND rp.faculty_id=?'; p.push(faculty_id); }
  if (year) { q += ' AND rp.publication_year=?'; p.push(year); }
  if (type) { q += ' AND rp.pub_type=?'; p.push(type); }
  if (status) { q += ' AND rp.status=?'; p.push(status); }
  if (req.user.role === 'faculty') { q += ' AND rp.faculty_id=?'; p.push(req.user.id); }
  q += ' ORDER BY rp.publication_year DESC, rp.created_at DESC';
  res.json(db.prepare(q).all(...p));
});

router.get('/publications/:id', (req, res) => {
  const pub = db.prepare(`SELECT rp.*, u.name as faculty_name FROM research_publications rp
    JOIN users u ON rp.faculty_id = u.id WHERE rp.id=?`).get(req.params.id);
  if (!pub) return res.status(404).json({ error: 'Not found.' });
  const authors = db.prepare('SELECT * FROM research_publication_authors WHERE publication_id=?').all(pub.id);
  res.json({ ...pub, authors });
});

router.post('/publications', authorize(...faculty), (req, res) => {
  const {
    title, pub_type, journal_conference, issn_isbn, volume, issue, pages,
    publication_year, doi, url, impact_factor, quartile, indexed_in,
    abstract, keywords, dept_id, is_scopus, is_wos, is_ugc
  } = req.body;
  if (!title || !pub_type) return res.status(400).json({ error: 'Title and type are required.' });
  const faculty_id = req.user.role === 'faculty' ? req.user.id : (req.body.faculty_id || req.user.id);
  const result = db.prepare(`INSERT INTO research_publications
    (faculty_id,dept_id,title,pub_type,journal_conference,issn_isbn,volume,issue,pages,
     publication_year,doi,url,impact_factor,quartile,indexed_in,abstract,keywords,
     is_scopus,is_wos,is_ugc,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'published')`).run(
    faculty_id,dept_id||null,title,pub_type,journal_conference||null,issn_isbn||null,volume||null,issue||null,pages||null,
    publication_year||new Date().getFullYear(),doi||null,url||null,impact_factor||0,quartile||null,
    indexed_in||null,abstract||null,keywords||null,is_scopus?1:0,is_wos?1:0,is_ugc?1:0);
  // add co-authors
  if (Array.isArray(req.body.authors)) {
    const stmt = db.prepare('INSERT INTO research_publication_authors (publication_id,name,email,affiliation) VALUES (?,?,?,?)');
    req.body.authors.forEach(a => stmt.run(result.lastInsertRowid, a.name, a.email||null, a.affiliation||null));
  }
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/publications/:id', authorize(...faculty), (req, res) => {
  const pub = db.prepare('SELECT * FROM research_publications WHERE id=?').get(req.params.id);
  if (!pub) return res.status(404).json({ error: 'Not found.' });
  if (req.user.role === 'faculty' && pub.faculty_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  const f = req.body;
  db.prepare(`UPDATE research_publications SET title=?,pub_type=?,journal_conference=?,issn_isbn=?,volume=?,issue=?,
    pages=?,publication_year=?,doi=?,url=?,impact_factor=?,quartile=?,indexed_in=?,abstract=?,keywords=?,
    is_scopus=?,is_wos=?,is_ugc=?,status=? WHERE id=?`)
    .run(f.title??pub.title,f.pub_type??pub.pub_type,f.journal_conference??pub.journal_conference,
      f.issn_isbn??pub.issn_isbn,f.volume??pub.volume,f.issue??pub.issue,f.pages??pub.pages,
      f.publication_year??pub.publication_year,f.doi??pub.doi,f.url??pub.url,
      f.impact_factor??pub.impact_factor,f.quartile??pub.quartile,f.indexed_in??pub.indexed_in,
      f.abstract??pub.abstract,f.keywords??pub.keywords,
      f.is_scopus!==undefined?f.is_scopus?1:0:pub.is_scopus,
      f.is_wos!==undefined?f.is_wos?1:0:pub.is_wos,
      f.is_ugc!==undefined?f.is_ugc?1:0:pub.is_ugc,
      f.status??pub.status,req.params.id);
  res.json({ message: 'Updated.' });
});

router.delete('/publications/:id', authorize(...mgmt,'faculty'), (req, res) => {
  const pub = db.prepare('SELECT faculty_id FROM research_publications WHERE id=?').get(req.params.id);
  if (!pub) return res.status(404).json({ error: 'Not found.' });
  if (req.user.role === 'faculty' && pub.faculty_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  db.prepare('DELETE FROM research_publications WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

// ── Research Grants ───────────────────────────────────────────────────────────
router.get('/grants', (req, res) => {
  const q = req.user.role === 'faculty'
    ? 'SELECT rg.*, u.name as pi_name FROM research_grants rg JOIN users u ON rg.pi_id = u.id WHERE rg.pi_id=? ORDER BY rg.start_date DESC'
    : 'SELECT rg.*, u.name as pi_name FROM research_grants rg JOIN users u ON rg.pi_id = u.id ORDER BY rg.start_date DESC';
  const p = req.user.role === 'faculty' ? [req.user.id] : [];
  res.json(db.prepare(q).all(...p));
});

router.post('/grants', authorize(...faculty), (req, res) => {
  const { title, funding_agency, scheme, amount, start_date, end_date, status, reference_number, description, co_pis } = req.body;
  if (!title || !funding_agency) return res.status(400).json({ error: 'Title and funding agency required.' });
  const pi_id = req.user.role === 'faculty' ? req.user.id : (req.body.pi_id || req.user.id);
  const result = db.prepare(`INSERT INTO research_grants
    (pi_id,title,funding_agency,scheme,amount,start_date,end_date,status,reference_number,description)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(pi_id,title,funding_agency,scheme||null,amount||0,start_date,end_date,status||'ongoing',reference_number||null,description||null);
  if (Array.isArray(co_pis)) {
    const stmt = db.prepare('INSERT INTO research_grant_co_pis (grant_id, user_id) VALUES (?,?)');
    co_pis.forEach(id => { try { stmt.run(result.lastInsertRowid, id); } catch (_) {} });
  }
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/grants/:id', authorize(...faculty), (req, res) => {
  const g = db.prepare('SELECT * FROM research_grants WHERE id=?').get(req.params.id);
  if (!g) return res.status(404).json({ error: 'Not found.' });
  if (req.user.role === 'faculty' && g.pi_id !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  const f = req.body;
  db.prepare('UPDATE research_grants SET title=?,funding_agency=?,scheme=?,amount=?,start_date=?,end_date=?,status=?,reference_number=?,description=? WHERE id=?')
    .run(f.title??g.title,f.funding_agency??g.funding_agency,f.scheme??g.scheme,f.amount??g.amount,f.start_date??g.start_date,f.end_date??g.end_date,f.status??g.status,f.reference_number??g.reference_number,f.description??g.description,req.params.id);
  res.json({ message: 'Updated.' });
});

// ── Patents ───────────────────────────────────────────────────────────────────
router.get('/patents', (req, res) => {
  const q = req.user.role === 'faculty'
    ? 'SELECT p.*, u.name as inventor_name FROM research_patents p JOIN users u ON p.lead_inventor_id = u.id WHERE p.lead_inventor_id=? ORDER BY p.filing_date DESC'
    : 'SELECT p.*, u.name as inventor_name FROM research_patents p JOIN users u ON p.lead_inventor_id = u.id ORDER BY p.filing_date DESC';
  res.json(db.prepare(q).all(...(req.user.role === 'faculty' ? [req.user.id] : [])));
});

router.post('/patents', authorize(...faculty), (req, res) => {
  const { title, application_number, filing_date, grant_date, country, status, description, co_inventors } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required.' });
  const lead_inventor_id = req.user.role === 'faculty' ? req.user.id : (req.body.lead_inventor_id || req.user.id);
  const result = db.prepare(`INSERT INTO research_patents
    (lead_inventor_id,title,application_number,filing_date,grant_date,country,status,description)
    VALUES (?,?,?,?,?,?,?,?)`).run(lead_inventor_id,title,application_number||null,filing_date||null,grant_date||null,country||'India',status||'filed',description||null);
  if (co_inventors) db.prepare('UPDATE research_patents SET co_inventors=? WHERE id=?').run(co_inventors, result.lastInsertRowid);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Consultancy Projects ──────────────────────────────────────────────────────
router.get('/consultancy', (req, res) => {
  const q = req.user.role === 'faculty'
    ? 'SELECT c.*, u.name as faculty_name FROM research_consultancy c JOIN users u ON c.faculty_id = u.id WHERE c.faculty_id=? ORDER BY c.start_date DESC'
    : 'SELECT c.*, u.name as faculty_name FROM research_consultancy c JOIN users u ON c.faculty_id = u.id ORDER BY c.start_date DESC';
  res.json(db.prepare(q).all(...(req.user.role === 'faculty' ? [req.user.id] : [])));
});

router.post('/consultancy', authorize(...faculty), (req, res) => {
  const { title, client, amount, start_date, end_date, description, status } = req.body;
  if (!title || !client) return res.status(400).json({ error: 'Title and client required.' });
  const faculty_id = req.user.role === 'faculty' ? req.user.id : (req.body.faculty_id || req.user.id);
  const result = db.prepare('INSERT INTO research_consultancy (faculty_id,title,client,amount,start_date,end_date,description,status) VALUES (?,?,?,?,?,?,?,?)')
    .run(faculty_id,title,client,amount||0,start_date,end_date,description||null,status||'ongoing');
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── PhD Supervision ───────────────────────────────────────────────────────────
router.get('/phd-supervision', (req, res) => {
  const q = req.user.role === 'faculty'
    ? 'SELECT * FROM research_phd_supervision WHERE supervisor_id=? ORDER BY enrollment_year DESC'
    : 'SELECT ps.*, u.name as supervisor_name FROM research_phd_supervision ps JOIN users u ON ps.supervisor_id = u.id ORDER BY ps.enrollment_year DESC';
  res.json(db.prepare(q).all(...(req.user.role === 'faculty' ? [req.user.id] : [])));
});

router.post('/phd-supervision', authorize(...faculty), (req, res) => {
  const { student_name, student_id_ext, university, enrollment_year, thesis_title, status } = req.body;
  if (!student_name) return res.status(400).json({ error: 'Student name required.' });
  const supervisor_id = req.user.role === 'faculty' ? req.user.id : (req.body.supervisor_id || req.user.id);
  const result = db.prepare('INSERT INTO research_phd_supervision (supervisor_id,student_name,student_id_ext,university,enrollment_year,thesis_title,status) VALUES (?,?,?,?,?,?,?)')
    .run(supervisor_id,student_name,student_id_ext||null,university||'MSRIM',enrollment_year||new Date().getFullYear(),thesis_title||null,status||'ongoing');
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Analytics Dashboard ───────────────────────────────────────────────────────
router.get('/analytics', authorize(...mgmt), (req, res) => {
  const pubs = db.prepare('SELECT COUNT(*) as total, SUM(is_scopus) as scopus, SUM(is_wos) as wos, SUM(is_ugc) as ugc FROM research_publications').get();
  const pubsByYear = db.prepare("SELECT publication_year as year, COUNT(*) as count, SUM(impact_factor) as total_if FROM research_publications GROUP BY publication_year ORDER BY year DESC LIMIT 5").all();
  const pubsByType = db.prepare('SELECT pub_type, COUNT(*) as count FROM research_publications GROUP BY pub_type').all();
  const grants = db.prepare("SELECT COUNT(*) as total, SUM(amount) as total_amount, SUM(CASE WHEN status='ongoing' THEN 1 ELSE 0 END) as ongoing FROM research_grants").get();
  const patents = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='granted' THEN 1 ELSE 0 END) as granted FROM research_patents").get();
  const consultancy = db.prepare("SELECT COUNT(*) as total, SUM(amount) as total_amount FROM research_consultancy").get();
  const phd = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed FROM research_phd_supervision").get();
  const topFaculty = db.prepare(`SELECT u.name, COUNT(rp.id) as pub_count, SUM(rp.impact_factor) as total_if
    FROM research_publications rp JOIN users u ON rp.faculty_id = u.id
    GROUP BY rp.faculty_id ORDER BY pub_count DESC LIMIT 10`).all();
  res.json({ publications: pubs, pubsByYear, pubsByType, grants, patents, consultancy, phd, topFaculty });
});

module.exports = router;
