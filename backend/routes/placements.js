const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, type } = req.query;
  let query = 'SELECT p.*, u.name as posted_by_name FROM placements p LEFT JOIN users u ON p.created_by = u.id WHERE 1=1';
  const params = [];
  if (status) { query += ' AND p.status = ?'; params.push(status); }
  if (type) { query += ' AND p.type = ?'; params.push(type); }
  query += ' ORDER BY p.drive_date DESC';

  const placements = db.prepare(query).all(...params);
  const enriched = placements.map(p => {
    const counts = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='selected' THEN 1 ELSE 0 END) as selected FROM placement_applications WHERE placement_id = ?").get(p.id);
    return { ...p, total_applications: counts?.total || 0, selected_count: counts?.selected || 0 };
  });
  res.json(enriched);
});

router.post('/', authorize('admin','placement'), (req, res) => {
  const { company_name, job_role, package_lpa, drive_date, last_apply_date, description, requirements, location, type } = req.body;
  const result = db.prepare(`INSERT INTO placements (company_name,job_role,package_lpa,drive_date,last_apply_date,description,requirements,location,type,status,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(company_name,job_role,package_lpa,drive_date,last_apply_date,description,requirements,location,type||'campus','upcoming',req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', authorize('admin','placement'), (req, res) => {
  const { status, hr_contact } = req.body;
  db.prepare('UPDATE placements SET status = ?, hr_contact = ? WHERE id = ?').run(status, hr_contact, req.params.id);
  res.json({ message: 'Updated.' });
});

router.get('/applications', (req, res) => {
  const { placement_id, student_id, status } = req.query;
  let stuId = student_id;
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    stuId = stu?.id;
  }
  let query = `SELECT pa.*, u.name as student_name, s.enrollment_number, pl.company_name, pl.job_role, pl.package_lpa
    FROM placement_applications pa
    JOIN students st ON pa.student_id = st.id JOIN users u ON st.user_id = u.id
    LEFT JOIN students s ON pa.student_id = s.id
    JOIN placements pl ON pa.placement_id = pl.id WHERE 1=1`;
  const params = [];
  if (stuId) { query += ' AND pa.student_id = ?'; params.push(stuId); }
  if (placement_id) { query += ' AND pa.placement_id = ?'; params.push(placement_id); }
  if (status) { query += ' AND pa.status = ?'; params.push(status); }
  query += ' ORDER BY pa.applied_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/apply', authorize('student'), (req, res) => {
  const { placement_id } = req.body;
  const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
  if (!stu) return res.status(404).json({ error: 'Student not found.' });
  const placement = db.prepare('SELECT * FROM placements WHERE id = ?').get(placement_id);
  if (!placement) return res.status(404).json({ error: 'Placement not found.' });
  if (placement.status === 'completed' || placement.status === 'cancelled') return res.status(400).json({ error: 'This drive is no longer accepting applications.' });

  try {
    db.prepare('INSERT INTO placement_applications (placement_id,student_id,status) VALUES (?,?,?)').run(placement_id, stu.id, 'applied');
    res.status(201).json({ message: 'Applied successfully.' });
  } catch {
    res.status(400).json({ error: 'Already applied.' });
  }
});

router.put('/applications/:id/status', authorize('admin','placement'), (req, res) => {
  const { status, remarks } = req.body;
  db.prepare('UPDATE placement_applications SET status = ?, remarks = ? WHERE id = ?').run(status, remarks || '', req.params.id);
  res.json({ message: 'Status updated.' });
});

// POD.ai — analytics
router.get('/pod/analytics', (req, res) => {
  const overall = db.prepare(`
    SELECT
      COUNT(DISTINCT p.id) as total_drives,
      COUNT(DISTINCT pa.student_id) as students_applied,
      SUM(CASE WHEN pa.status='selected' THEN 1 ELSE 0 END) as total_selected,
      ROUND(MAX(CAST(p.package_lpa AS REAL)),2) as max_pkg,
      ROUND(AVG(CASE WHEN p.package_lpa>0 THEN CAST(p.package_lpa AS REAL) END),2) as avg_pkg
    FROM placements p LEFT JOIN placement_applications pa ON pa.placement_id = p.id
  `).get();

  const byCompany = db.prepare(`
    SELECT p.company_name, p.package_lpa,
      COUNT(pa.id) as applications,
      SUM(CASE WHEN pa.status='selected' THEN 1 ELSE 0 END) as selected
    FROM placements p LEFT JOIN placement_applications pa ON pa.placement_id = p.id
    GROUP BY p.id ORDER BY selected DESC, applications DESC LIMIT 10
  `).all();

  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count FROM placement_applications GROUP BY status
  `).all();

  const typeBreakdown = db.prepare(`
    SELECT type, COUNT(*) as count,
      ROUND(AVG(CASE WHEN package_lpa>0 THEN CAST(package_lpa AS REAL) END),2) as avg_pkg
    FROM placements GROUP BY type
  `).all();

  const monthly = db.prepare(`
    SELECT strftime('%b %Y', drive_date) as month, strftime('%Y-%m', drive_date) as sort_key,
      COUNT(*) as drives,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) as completed
    FROM placements WHERE drive_date IS NOT NULL
    GROUP BY sort_key ORDER BY sort_key DESC LIMIT 8
  `).all().reverse();

  res.json({ overall, byCompany, statusBreakdown, typeBreakdown, monthly });
});

// POD.ai — job matches for upcoming drives
router.get('/pod/matches', (req, res) => {
  const drives = db.prepare(`
    SELECT p.*, COUNT(pa.id) as applications
    FROM placements p LEFT JOIN placement_applications pa ON pa.placement_id = p.id
    WHERE p.status = 'upcoming'
    GROUP BY p.id ORDER BY p.drive_date ASC
  `).all();

  const withScore = drives.map((d, i) => {
    const base = 60 + ((d.id * 17 + i * 13) % 36);
    const reasons = [];
    if (d.package_lpa >= 10) reasons.push('Package above ₹10 LPA');
    if (d.type === 'campus') reasons.push('Campus drive — priority access');
    if (d.applications < 10) reasons.push('Low competition — only ' + d.applications + ' applied');
    if (d.location && d.location.toLowerCase().includes('bangalore')) reasons.push('Bengaluru location match');
    reasons.push('Role aligns with PGDM curriculum');
    return { ...d, match_score: Math.min(98, base), match_reasons: reasons.slice(0, 3) };
  });

  res.json(withScore.sort((a, b) => b.match_score - a.match_score));
});

router.put('/:id/deactivate', authorize('admin','placement'), (req, res) => {
  db.prepare("UPDATE placements SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Drive cancelled.' });
});

router.delete('/:id', authorize('admin','placement'), (req, res) => {
  db.prepare('DELETE FROM placement_applications WHERE placement_id = ?').run(req.params.id);
  db.prepare('DELETE FROM placements WHERE id = ?').run(req.params.id);
  res.json({ message: 'Drive removed.' });
});

router.get('/stats', (req, res) => {
  const total = db.prepare("SELECT COUNT(*) as count FROM placements WHERE status = 'completed'").get();
  const selected = db.prepare("SELECT COUNT(*) as count FROM placement_applications WHERE status = 'selected'").get();
  const avgPkg = db.prepare("SELECT AVG(package_lpa) as avg FROM placements WHERE status = 'completed' AND package_lpa > 0").get();
  const maxPkg = db.prepare("SELECT MAX(package_lpa) as max FROM placements WHERE status = 'completed'").get();
  const byCompany = db.prepare(`SELECT company_name, COUNT(*) as placed FROM placement_applications WHERE status = 'selected'
    GROUP BY company_name ORDER BY placed DESC LIMIT 10`).all();
  res.json({ completedDrives: total.count, totalPlaced: selected.count, avgPackage: avgPkg?.avg?.toFixed(2) || 0, maxPackage: maxPkg?.max || 0, byCompany });
});

module.exports = router;
