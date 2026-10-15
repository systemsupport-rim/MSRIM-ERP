const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// Staff Attendance
router.get('/attendance', (req, res) => {
  const { date, user_id, from_date, to_date } = req.query;
  let q = `SELECT sa.*, u.name, u.role FROM staff_attendance sa JOIN users u ON sa.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.user.role !== 'admin' && req.user.role !== 'registrar' && req.user.role !== 'hod') {
    q += ' AND sa.user_id = ?'; params.push(req.user.id);
  } else {
    if (user_id) { q += ' AND sa.user_id = ?'; params.push(user_id); }
  }
  if (date) { q += ' AND sa.date = ?'; params.push(date); }
  if (from_date) { q += ' AND sa.date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND sa.date <= ?'; params.push(to_date); }
  q += ' ORDER BY sa.date DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/attendance/mark', authorize('admin','registrar','hod'), (req, res) => {
  const { records } = req.body;
  const stmt = db.prepare("INSERT INTO staff_attendance (user_id,date,check_in,check_out,status,marked_by) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status");
  const insert = db.transaction((recs) => { recs.forEach(r => stmt.run(r.user_id,r.date,r.check_in||null,r.check_out||null,r.status||'present',req.user.id)); });
  insert(records);
  res.json({ message: `Attendance marked for ${records.length} staff.` });
});

router.post('/attendance/self', (req, res) => {
  const { date, check_in, check_out } = req.body;
  try {
    db.prepare("INSERT INTO staff_attendance (user_id,date,check_in,check_out,status,marked_by) VALUES (?,?,?,?,'present',?) ON CONFLICT(user_id,date) DO UPDATE SET check_in=excluded.check_in,check_out=excluded.check_out").run(req.user.id,date,check_in||null,check_out||null,req.user.id);
    res.json({ message: 'Attendance recorded.' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// Leave Management
router.get('/leaves', (req, res) => {
  const { status, user_id } = req.query;
  let q = `SELECT la.*, u.name as applicant_name, u.role, au.name as approved_by_name FROM leave_applications la JOIN users u ON la.user_id = u.id LEFT JOIN users au ON la.approved_by = au.id WHERE 1=1`;
  const params = [];
  if (req.user.role !== 'admin' && req.user.role !== 'registrar' && req.user.role !== 'hod') {
    q += ' AND la.user_id = ?'; params.push(req.user.id);
  } else if (user_id) { q += ' AND la.user_id = ?'; params.push(user_id); }
  if (status) { q += ' AND la.status = ?'; params.push(status); }
  q += ' ORDER BY la.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/leaves', (req, res) => {
  const { leave_type, from_date, to_date, days, reason } = req.body;
  const result = db.prepare('INSERT INTO leave_applications (user_id,leave_type,from_date,to_date,days,reason) VALUES (?,?,?,?,?,?)').run(req.user.id,leave_type,from_date,to_date,days,reason||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/leaves/:id/approve', authorize('admin','registrar','hod'), (req, res) => {
  const { status, remarks } = req.body;
  db.prepare("UPDATE leave_applications SET status=?,remarks=?,approved_by=? WHERE id=?").run(status||'approved',remarks||'',req.user.id,req.params.id);
  res.json({ message: 'Leave request updated.' });
});

// Portfolios
router.get('/portfolios', (req, res) => {
  const { user_id, category } = req.query;
  let q = `SELECT sp.*, u.name FROM staff_portfolios sp JOIN users u ON sp.user_id = u.id WHERE 1=1`;
  const params = [];
  if (req.user.role !== 'admin' && req.user.role !== 'hod' && req.user.role !== 'registrar') {
    q += ' AND sp.user_id = ?'; params.push(req.user.id);
  } else if (user_id) { q += ' AND sp.user_id = ?'; params.push(user_id); }
  if (category) { q += ' AND sp.category = ?'; params.push(category); }
  q += ' ORDER BY sp.date DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/portfolios', (req, res) => {
  const { category, title, description, institution, date, url } = req.body;
  const result = db.prepare('INSERT INTO staff_portfolios (user_id,category,title,description,institution,date,url) VALUES (?,?,?,?,?,?,?)').run(req.user.id,category,title,description||'',institution||'',date||'',url||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/portfolios/:id', (req, res) => {
  const p = db.prepare('SELECT user_id FROM staff_portfolios WHERE id = ?').get(req.params.id);
  if (!p || (p.user_id !== req.user.id && !['admin','hod'].includes(req.user.role))) return res.status(403).json({ error: 'Access denied.' });
  db.prepare('DELETE FROM staff_portfolios WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

router.get('/stats', authorize('admin','registrar','hod'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const presentToday = db.prepare("SELECT COUNT(*) as c FROM staff_attendance WHERE date = ? AND status = 'present'").get(today);
  const pendingLeaves = db.prepare("SELECT COUNT(*) as c FROM leave_applications WHERE status = 'pending'").get();
  const approvedLeaves = db.prepare("SELECT COUNT(*) as c FROM leave_applications WHERE status = 'approved'").get();
  const portfolios = db.prepare('SELECT COUNT(*) as c FROM staff_portfolios').get();
  const leaveByType = db.prepare("SELECT leave_type, COUNT(*) as count FROM leave_applications WHERE status = 'approved' GROUP BY leave_type").all();
  res.json({ presentToday: presentToday.c, pendingLeaves: pendingLeaves.c, approvedLeaves: approvedLeaves.c, portfolios: portfolios.c, leaveByType });
});

module.exports = router;
