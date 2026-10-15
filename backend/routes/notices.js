const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { category, target_role } = req.query;
  let query = `SELECT n.*, u.name as published_by_name FROM notices n JOIN users u ON n.published_by = u.id WHERE 1=1
    AND (n.expires_at IS NULL OR n.expires_at >= date('now'))`;
  const params = [];
  if (category) { query += ' AND n.category = ?'; params.push(category); }
  if (target_role && target_role !== 'all') {
    query += " AND (n.target_role = 'all' OR n.target_role = ?)"; params.push(target_role);
  } else {
    query += " AND (n.target_role = 'all' OR n.target_role = ?)"; params.push(req.user.role);
  }
  query += ' ORDER BY n.is_pinned DESC, n.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/stats', authorize('admin', 'registrar'), (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM notices').get();
  const pinned = db.prepare('SELECT COUNT(*) as c FROM notices WHERE is_pinned = 1').get();
  const active = db.prepare("SELECT COUNT(*) as c FROM notices WHERE expires_at IS NULL OR expires_at >= date('now')").get();
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM notices GROUP BY category').all();
  res.json({ total: total.c, pinned: pinned.c, active: active.c, byCategory });
});

router.get('/:id', (req, res) => {
  const notice = db.prepare(`SELECT n.*, u.name as published_by_name FROM notices n JOIN users u ON n.published_by = u.id WHERE n.id = ?`).get(req.params.id);
  if (!notice) return res.status(404).json({ error: 'Notice not found.' });
  res.json(notice);
});

router.post('/', authorize('admin', 'registrar', 'hod', 'faculty', 'placement'), (req, res) => {
  const { title, content, category, target_role, is_pinned, expires_at, attachment } = req.body;
  const result = db.prepare('INSERT INTO notices (title,content,category,target_role,published_by,is_pinned,expires_at,attachment) VALUES (?,?,?,?,?,?,?,?)')
    .run(title, content, category || 'general', target_role || 'all', req.user.id, is_pinned ? 1 : 0, expires_at || null, attachment || null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id', authorize('admin', 'registrar'), (req, res) => {
  const notice = db.prepare('SELECT * FROM notices WHERE id = ?').get(req.params.id);
  if (!notice) return res.status(404).json({ error: 'Notice not found.' });
  const { title, content, category, is_pinned, expires_at } = req.body;
  db.prepare('UPDATE notices SET title=?,content=?,category=?,is_pinned=?,expires_at=? WHERE id=?').run(title || notice.title, content || notice.content, category || notice.category, is_pinned !== undefined ? (is_pinned ? 1 : 0) : notice.is_pinned, expires_at !== undefined ? expires_at : notice.expires_at, req.params.id);
  res.json({ message: 'Updated.' });
});

router.patch('/:id/pin', authorize('admin', 'registrar'), (req, res) => {
  const notice = db.prepare('SELECT is_pinned FROM notices WHERE id = ?').get(req.params.id);
  if (!notice) return res.status(404).json({ error: 'Notice not found.' });
  const newPin = notice.is_pinned ? 0 : 1;
  db.prepare('UPDATE notices SET is_pinned = ? WHERE id = ?').run(newPin, req.params.id);
  res.json({ message: newPin ? 'Notice pinned.' : 'Notice unpinned.', is_pinned: newPin });
});

router.delete('/:id', authorize('admin', 'registrar'), (req, res) => {
  db.prepare('DELETE FROM notices WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
