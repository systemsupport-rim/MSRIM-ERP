const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { type, is_active } = req.query;
  let q = `SELECT nt.*, u.name as created_by_name FROM notification_templates nt LEFT JOIN users u ON nt.created_by = u.id WHERE 1=1`;
  const params = [];
  if (type)      { q += ' AND nt.type=?'; params.push(type); }
  if (is_active !== undefined) { q += ' AND nt.is_active=?'; params.push(is_active === 'true' ? 1 : 0); }
  q += ' ORDER BY nt.type, nt.name';
  res.json(db.prepare(q).all(...params));
});

router.post('/', authorize('admin','registrar'), (req, res) => {
  const { name, type, event_key, subject, body, variables } = req.body;
  if (!name || !body) return res.status(400).json({ error: 'Name and body required.' });
  const r = db.prepare('INSERT INTO notification_templates (name,type,event_key,subject,body,variables,created_by) VALUES (?,?,?,?,?,?,?)').run(name, type || 'email', event_key || null, subject || '', body, JSON.stringify(variables || []), req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/:id', authorize('admin','registrar'), (req, res) => {
  const { name, subject, body, is_active } = req.body;
  const sets = ["updated_at=datetime('now')"]; const vals = [];
  if (name      !== undefined) { sets.push('name=?');      vals.push(name); }
  if (subject   !== undefined) { sets.push('subject=?');   vals.push(subject); }
  if (body      !== undefined) { sets.push('body=?');      vals.push(body); }
  if (is_active !== undefined) { sets.push('is_active=?'); vals.push(is_active ? 1 : 0); }
  vals.push(req.params.id);
  db.prepare(`UPDATE notification_templates SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ message: 'Updated.' });
});

router.delete('/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM notification_templates WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
