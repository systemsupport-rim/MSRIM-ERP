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
