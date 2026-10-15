const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Leave Types (configurable) ───────────────────────────────────────────────
router.get('/types', (req, res) => {
  res.json(db.prepare('SELECT * FROM leave_types ORDER BY code').all());
});

router.post('/types', authorize('admin'), (req, res) => {
  const { code, name, max_days_per_year, is_paid, carry_forward, max_carry_forward, color, description, applicable_to } = req.body;
  try {
    const r = db.prepare('INSERT INTO leave_types (code,name,max_days_per_year,is_paid,carry_forward,max_carry_forward,color,description,applicable_to) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(code, name, max_days_per_year || 0, is_paid ? 1 : 0, carry_forward ? 1 : 0, max_carry_forward || 0, color || '#3b82f6', description || '', applicable_to || 'all');
    const newId = r.lastInsertRowid;
    // Auto-create balance rows for all active staff for current year
    const year = new Date().getFullYear();
    const staff = db.prepare("SELECT id FROM users WHERE role IN ('faculty','admin','registrar','hod','librarian','accounts','placement') AND is_active=1").all();
    const balInsert = db.prepare('INSERT OR IGNORE INTO leave_balances (user_id,leave_type_id,year,total_days) VALUES (?,?,?,?)');
    staff.forEach(u => balInsert.run(u.id, newId, year, max_days_per_year || 0));
    res.status(201).json({ id: newId, message: 'Leave type created.' });
  } catch (e) { res.status(400).json({ error: 'Code already exists.' }); }
});

router.put('/types/:id', authorize('admin'), (req, res) => {
  const { name, max_days_per_year, is_paid, carry_forward, max_carry_forward, color, description, is_active, applicable_to } = req.body;
  db.prepare('UPDATE leave_types SET name=?,max_days_per_year=?,is_paid=?,carry_forward=?,max_carry_forward=?,color=?,description=?,is_active=?,applicable_to=? WHERE id=?')
    .run(name, max_days_per_year, is_paid ? 1 : 0, carry_forward ? 1 : 0, max_carry_forward, color, description, is_active ? 1 : 0, applicable_to || 'all', req.params.id);
  res.json({ message: 'Leave type updated.' });
});

router.delete('/types/:id', authorize('admin'), (req, res) => {
  const lt = db.prepare('SELECT code FROM leave_types WHERE id = ?').get(req.params.id);
  if (!lt) return res.status(404).json({ error: 'Leave type not found.' });
  const inUse = db.prepare('SELECT COUNT(*) as c FROM leave_applications WHERE leave_type = ?').get(lt.code).c;
  if (inUse > 0) return res.status(400).json({ error: `Cannot delete: "${lt.code}" is used in ${inUse} leave application(s).` });
  // Remove balances first (no actual leave data, safe to delete)
  db.prepare('DELETE FROM leave_balances WHERE leave_type_id = ?').run(req.params.id);
  db.prepare('DELETE FROM leave_types WHERE id = ?').run(req.params.id);
  res.json({ message: 'Leave type deleted.' });
});

// ── Leave Balances ────────────────────────────────────────────────────────────
router.get('/balances', (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const uid = ['admin','registrar','hod'].includes(req.user.role) && req.query.user_id ? req.query.user_id : req.user.id;

  const balances = db.prepare(`
    SELECT lb.*, lt.code, lt.name as type_name, lt.color, lt.is_paid, lt.max_days_per_year as default_days,
      (lb.total_days - lb.used_days - lb.pending_days) as available
    FROM leave_balances lb
    JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE lb.user_id = ? AND lb.year = ? AND lt.is_active = 1
    ORDER BY lt.code
  `).all(uid, year);
  res.json(balances);
});

router.get('/balances/all', authorize('admin','registrar','hod'), (req, res) => {
  const year = req.query.year || new Date().getFullYear();
  const staff = db.prepare(`
    SELECT u.id, u.name, u.role, u.department,
      json_group_array(json_object('code',lt.code,'name',lt.name,'total',lb.total_days,'used',lb.used_days,'pending',lb.pending_days,'available',(lb.total_days - lb.used_days - lb.pending_days),'color',lt.color)) as balances
    FROM users u
    JOIN leave_balances lb ON lb.user_id = u.id
    JOIN leave_types lt ON lb.leave_type_id = lt.id
    WHERE u.role IN ('faculty','admin','registrar','hod','librarian','accounts','placement')
      AND lb.year = ? AND lt.is_active = 1 AND u.is_active = 1
    GROUP BY u.id ORDER BY u.name
  `).all(year);
  res.json(staff.map(s => ({ ...s, balances: JSON.parse(s.balances) })));
});

router.put('/balances/:userId/:leaveTypeId', authorize('admin','registrar'), (req, res) => {
  const { total_days, year } = req.body;
  const y = year || new Date().getFullYear();
  db.prepare('INSERT INTO leave_balances (user_id,leave_type_id,year,total_days) VALUES (?,?,?,?) ON CONFLICT(user_id,leave_type_id,year) DO UPDATE SET total_days=excluded.total_days')
    .run(req.params.userId, req.params.leaveTypeId, y, total_days);
  res.json({ message: 'Balance updated.' });
});

// ── Holiday Calendar ──────────────────────────────────────────────────────────
router.get('/holidays', (req, res) => {
  const { year } = req.query;
  let q = "SELECT * FROM holiday_calendar WHERE is_active = 1";
  const params = [];
  if (year) { q += " AND strftime('%Y', date) = ?"; params.push(year.toString()); }
  q += " ORDER BY date";
  res.json(db.prepare(q).all(...params));
});

router.post('/holidays', authorize('admin','registrar'), (req, res) => {
  const { title, date, type, description } = req.body;
  try {
    const r = db.prepare('INSERT INTO holiday_calendar (title,date,type,description) VALUES (?,?,?,?)').run(title, date, type || 'public', description || '');
    res.status(201).json({ id: r.lastInsertRowid });
  } catch { res.status(400).json({ error: 'Holiday on that date already exists.' }); }
});

router.delete('/holidays/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM holiday_calendar WHERE id = ?').run(req.params.id);
  res.json({ message: 'Holiday removed.' });
});

// ── Leave Applications ────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { status, user_id, from_date, to_date, year } = req.query;
  let q = `SELECT la.*, u.name as applicant_name, u.role, u.department,
    au.name as approved_by_name, lt.color, lt.name as type_name, lt.is_paid
    FROM leave_applications la
    JOIN users u ON la.user_id = u.id
    LEFT JOIN users au ON la.approved_by = au.id
    LEFT JOIN leave_types lt ON lt.code = la.leave_type
    WHERE 1=1`;
  const params = [];

  if (!['admin','registrar','hod'].includes(req.user.role)) {
    q += ' AND la.user_id = ?'; params.push(req.user.id);
  } else if (user_id) { q += ' AND la.user_id = ?'; params.push(user_id); }

  if (status) { q += ' AND la.status = ?'; params.push(status); }
  if (from_date) { q += ' AND la.from_date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND la.to_date <= ?'; params.push(to_date); }
  if (year) { q += " AND strftime('%Y', la.from_date) = ?"; params.push(year.toString()); }
  q += ' ORDER BY la.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', (req, res) => {
  const { leave_type, from_date, to_date, days, reason, is_half_day, half_day_session } = req.body;
  if (!leave_type || !from_date || !to_date) return res.status(400).json({ error: 'Missing required fields.' });

  // Check leave balance
  const lt = db.prepare('SELECT * FROM leave_types WHERE code = ?').get(leave_type);
  if (lt && lt.max_days_per_year > 0) {
    const year = new Date(from_date).getFullYear();
    const bal = db.prepare('SELECT lb.* FROM leave_balances lb JOIN leave_types lt ON lb.leave_type_id = lt.id WHERE lb.user_id = ? AND lt.code = ? AND lb.year = ?').get(req.user.id, leave_type, year);
    if (bal) {
      const available = bal.total_days - bal.used_days - bal.pending_days;
      if (parseFloat(days) > available) return res.status(400).json({ error: `Insufficient ${lt.name} balance. Available: ${available} days.` });
    }
  }

  const r = db.prepare('INSERT INTO leave_applications (user_id,leave_type,from_date,to_date,days,reason) VALUES (?,?,?,?,?,?)').run(req.user.id, leave_type, from_date, to_date, parseFloat(days) || 1, reason || '');

  // Update pending balance
  if (lt && lt.max_days_per_year > 0) {
    const year = new Date(from_date).getFullYear();
    db.prepare('UPDATE leave_balances SET pending_days = pending_days + ? WHERE user_id = ? AND leave_type_id = ? AND year = ?').run(parseFloat(days) || 1, req.user.id, lt.id, year);
  }

  res.status(201).json({ id: r.lastInsertRowid, message: 'Leave application submitted.' });
});

router.put('/:id/action', authorize('admin','registrar','hod'), (req, res) => {
  const { status, remarks } = req.body;
  const leave = db.prepare('SELECT * FROM leave_applications WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Not found.' });

  db.prepare('UPDATE leave_applications SET status=?,remarks=?,approved_by=? WHERE id=?').run(status, remarks || '', req.user.id, req.params.id);

  // Update balances
  const lt = db.prepare('SELECT * FROM leave_types WHERE code = ?').get(leave.leave_type);
  if (lt && lt.max_days_per_year > 0) {
    const year = new Date(leave.from_date).getFullYear();
    if (status === 'approved') {
      db.prepare('UPDATE leave_balances SET used_days = used_days + ?, pending_days = MAX(0, pending_days - ?) WHERE user_id = ? AND leave_type_id = ? AND year = ?').run(leave.days, leave.days, leave.user_id, lt.id, year);
    } else if (status === 'rejected') {
      db.prepare('UPDATE leave_balances SET pending_days = MAX(0, pending_days - ?) WHERE user_id = ? AND leave_type_id = ? AND year = ?').run(leave.days, leave.user_id, lt.id, year);
    }
  }
  res.json({ message: `Leave ${status}.` });
});

router.put('/:id/cancel', (req, res) => {
  const leave = db.prepare('SELECT * FROM leave_applications WHERE id = ?').get(req.params.id);
  if (!leave) return res.status(404).json({ error: 'Not found.' });
  if (leave.user_id !== req.user.id && !['admin','registrar'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
  if (leave.status === 'approved') {
    const lt = db.prepare('SELECT * FROM leave_types WHERE code = ?').get(leave.leave_type);
    if (lt) {
      const year = new Date(leave.from_date).getFullYear();
      db.prepare('UPDATE leave_balances SET used_days = MAX(0, used_days - ?) WHERE user_id = ? AND leave_type_id = ? AND year = ?').run(leave.days, leave.user_id, lt.id, year);
    }
  }
  db.prepare("UPDATE leave_applications SET status='cancelled' WHERE id=?").run(req.params.id);
  res.json({ message: 'Leave cancelled.' });
});

router.delete('/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM leave_applications WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

// ── Leave Summary stats ───────────────────────────────────────────────────────
router.get('/stats/summary', authorize('admin','registrar','hod'), (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const pending  = db.prepare("SELECT COUNT(*) as c FROM leave_applications WHERE status='pending'").get().c;
  const approved = db.prepare("SELECT COUNT(*) as c FROM leave_applications WHERE status='approved'").get().c;
  const onLeave  = db.prepare("SELECT COUNT(*) as c FROM leave_applications WHERE status='approved' AND from_date <= ? AND to_date >= ?").get(today, today).c;
  const byType   = db.prepare("SELECT leave_type, COUNT(*) as count, SUM(days) as total_days FROM leave_applications WHERE status='approved' GROUP BY leave_type").all();
  res.json({ pending, approved, onLeave, byType });
});

module.exports = router;
