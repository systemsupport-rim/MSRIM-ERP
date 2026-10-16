const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// Get all settings for a category (or all)
router.get('/settings', (req, res) => {
  const { category } = req.query;
  let q = 'SELECT * FROM system_settings WHERE 1=1';
  const params = [];
  if (category) { q += ' AND category=?'; params.push(category); }
  q += ' ORDER BY category, key';
  const rows = db.prepare(q).all(...params);
  const grouped = rows.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = {};
    acc[r.category][r.key] = { value: r.value, label: r.label, type: r.type };
    return acc;
  }, {});
  res.json(grouped);
});

router.put('/settings', authorize('admin'), (req, res) => {
  const { category, settings } = req.body;
  if (!category || !settings) return res.status(400).json({ error: 'category and settings required.' });
  const stmt = db.prepare(`INSERT INTO system_settings (category,key,value,updated_by,updated_at)
    VALUES (?,?,?,?,datetime('now'))
    ON CONFLICT(category,key) DO UPDATE SET value=excluded.value,updated_by=excluded.updated_by,updated_at=excluded.updated_at`);
  const update = db.transaction(s => Object.entries(s).forEach(([key, value]) => stmt.run(category, key, value, req.user.id)));
  update(settings);
  res.json({ message: 'Settings saved.' });
});

// Biometric records
router.get('/biometric', authorize('admin','registrar','hod'), (req, res) => {
  const { date, user_id } = req.query;
  let q = `SELECT br.*, u.name, u.department, u.role FROM biometric_records br JOIN users u ON br.user_id = u.id WHERE 1=1`;
  const params = [];
  if (date)    { q += ' AND br.date=?';    params.push(date); }
  if (user_id) { q += ' AND br.user_id=?'; params.push(user_id); }
  q += ' ORDER BY br.date DESC, br.punch_in';
  res.json(db.prepare(q).all(...params));
});

router.post('/biometric', authorize('admin','registrar'), (req, res) => {
  const { user_id, date, punch_in, punch_out, source } = req.body;
  try {
    db.prepare(`INSERT INTO biometric_records (user_id,date,punch_in,punch_out,source)
      VALUES (?,?,?,?,?)
      ON CONFLICT(user_id,date) DO UPDATE SET punch_in=excluded.punch_in,punch_out=excluded.punch_out`)
      .run(user_id, date, punch_in || null, punch_out || null, source || 'manual');
    res.json({ message: 'Record saved.' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

// HR Pay Scales
router.get('/pay-scales', (req, res) => {
  res.json(db.prepare('SELECT * FROM hr_pay_scales WHERE is_active=1 ORDER BY designation').all());
});

router.post('/pay-scales', authorize('admin','registrar'), (req, res) => {
  const { designation, level, basic_min, basic_max, grade_pay, da_percent, hra_percent } = req.body;
  const r = db.prepare('INSERT INTO hr_pay_scales (designation,level,basic_min,basic_max,grade_pay,da_percent,hra_percent,created_by) VALUES (?,?,?,?,?,?,?,?)').run(designation, level || '', basic_min || 0, basic_max || 0, grade_pay || 0, da_percent || 0, hra_percent || 0, req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/pay-scales/:id', authorize('admin','registrar'), (req, res) => {
  const { basic_min, basic_max, grade_pay, da_percent, hra_percent, is_active } = req.body;
  const sets = []; const vals = [];
  if (basic_min  !== undefined) { sets.push('basic_min=?');  vals.push(basic_min); }
  if (basic_max  !== undefined) { sets.push('basic_max=?');  vals.push(basic_max); }
  if (grade_pay  !== undefined) { sets.push('grade_pay=?');  vals.push(grade_pay); }
  if (da_percent !== undefined) { sets.push('da_percent=?'); vals.push(da_percent); }
  if (hra_percent!== undefined) { sets.push('hra_percent=?');vals.push(hra_percent); }
  if (is_active  !== undefined) { sets.push('is_active=?');  vals.push(is_active ? 1 : 0); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
  vals.push(req.params.id);
  db.prepare(`UPDATE hr_pay_scales SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ message: 'Updated.' });
});

module.exports = router;
