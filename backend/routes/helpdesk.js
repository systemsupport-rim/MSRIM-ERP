const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/services', (req, res) => {
  const services = db.prepare('SELECT *, (SELECT COUNT(*) FROM help_requests WHERE service_id = id) as request_count FROM help_services WHERE is_active = 1 ORDER BY category, name').all();
  res.json(services);
});

router.post('/services', authorize('admin','registrar'), (req, res) => {
  const { name, category, description, sla_hours, assigned_department } = req.body;
  const result = db.prepare('INSERT INTO help_services (name,category,description,sla_hours,assigned_department) VALUES (?,?,?,?,?)').run(name,category,description||'',sla_hours||24,assigned_department||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/requests', (req, res) => {
  const { status, priority, service_id } = req.query;
  let q = `SELECT r.*, s.name as service_name, s.category, u.name as raised_by_name, au.name as assigned_to_name
    FROM help_requests r JOIN help_services s ON r.service_id = s.id JOIN users u ON r.raised_by = u.id LEFT JOIN users au ON r.assigned_to = au.id WHERE 1=1`;
  const params = [];
  if (req.user.role !== 'admin' && req.user.role !== 'registrar') {
    q += ' AND r.raised_by = ?'; params.push(req.user.id);
  }
  if (status) { q += ' AND r.status = ?'; params.push(status); }
  if (priority) { q += ' AND r.priority = ?'; params.push(priority); }
  if (service_id) { q += ' AND r.service_id = ?'; params.push(service_id); }
  q += ' ORDER BY r.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/requests', (req, res) => {
  const { service_id, subject, description, priority } = req.body;
  const result = db.prepare('INSERT INTO help_requests (service_id,raised_by,subject,description,priority) VALUES (?,?,?,?,?)').run(service_id,req.user.id,subject,description||'',priority||'medium');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/requests/:id/assign', authorize('admin','registrar'), (req, res) => {
  const { assigned_to } = req.body;
  db.prepare("UPDATE help_requests SET assigned_to=?, status='in_progress' WHERE id=?").run(assigned_to, req.params.id);
  res.json({ message: 'Assigned.' });
});

router.put('/requests/:id/resolve', authorize('admin','registrar'), (req, res) => {
  const { resolution_notes, rating } = req.body;
  db.prepare("UPDATE help_requests SET status='resolved', resolved_at=datetime('now'), resolution_notes=? WHERE id=?").run(resolution_notes||'',req.params.id);
  res.json({ message: 'Resolved.' });
});

router.put('/requests/:id/rate', (req, res) => {
  const { rating } = req.body;
  const req_record = db.prepare('SELECT raised_by FROM help_requests WHERE id = ?').get(req.params.id);
  if (req_record?.raised_by !== req.user.id) return res.status(403).json({ error: 'Access denied.' });
  db.prepare('UPDATE help_requests SET rating = ? WHERE id = ?').run(rating, req.params.id);
  res.json({ message: 'Rating submitted.' });
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM help_requests').get();
  const open = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status = 'open'").get();
  const resolved = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status = 'resolved'").get();
  const services = db.prepare('SELECT COUNT(*) as c FROM help_services WHERE is_active = 1').get();
  const totalServices = db.prepare('SELECT COUNT(*) as c FROM help_services').get();
  const byCategory = db.prepare('SELECT s.category, COUNT(*) as count FROM help_requests r JOIN help_services s ON r.service_id = s.id GROUP BY s.category').all();
  res.json({ total: total.c, open: open.c, resolved: resolved.c, liveSvcs: services.c, totalSvcs: totalServices.c, byCategory });
});

module.exports = router;
