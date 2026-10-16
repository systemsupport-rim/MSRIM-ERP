const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT ag.*, u.name as created_by_name FROM audience_groups ag LEFT JOIN users u ON ag.created_by = u.id ORDER BY ag.name').all());
});

router.post('/', authorize('admin','registrar','hod'), (req, res) => {
  const { name, description, type, criteria } = req.body;
  let count = 0;
  if (type === 'role-based' && criteria?.role) {
    count = db.prepare('SELECT COUNT(*) as c FROM users WHERE role=? AND is_active=1').get(criteria.role)?.c || 0;
  } else if (type === 'program-based' && criteria?.program_id) {
    count = db.prepare('SELECT COUNT(*) as c FROM students WHERE program_id=? AND status=?').get(criteria.program_id, 'active')?.c || 0;
  } else {
    count = db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active=1').get()?.c || 0;
  }
  const r = db.prepare('INSERT INTO audience_groups (name,description,type,criteria,member_count,created_by) VALUES (?,?,?,?,?,?)').run(name, description || '', type || 'custom', JSON.stringify(criteria || {}), count, req.user.id);
  res.status(201).json({ id: r.lastInsertRowid, member_count: count });
});

router.put('/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { name, description, is_active } = req.body;
  const sets = []; const vals = [];
  if (name        !== undefined) { sets.push('name=?');        vals.push(name); }
  if (description !== undefined) { sets.push('description=?'); vals.push(description); }
  if (is_active   !== undefined) { sets.push('is_active=?');   vals.push(is_active ? 1 : 0); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });
  vals.push(req.params.id);
  db.prepare(`UPDATE audience_groups SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ message: 'Updated.' });
});

router.delete('/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM audience_groups WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
