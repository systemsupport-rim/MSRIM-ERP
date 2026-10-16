const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { category, status, search } = req.query;
  let q = `SELECT c.*, u.name as author FROM cms_content c LEFT JOIN users u ON c.created_by = u.id WHERE 1=1`;
  const params = [];
  if (category) { q += ' AND c.category=?'; params.push(category); }
  if (status)   { q += ' AND c.status=?';   params.push(status); }
  if (search)   { q += ' AND (c.title LIKE ? OR c.content LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  q += ' ORDER BY c.updated_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', authorize('admin','registrar'), (req, res) => {
  const { title, slug, content, category, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required.' });
  const s = slug || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  try {
    const r = db.prepare('INSERT INTO cms_content (title,slug,content,category,status,created_by) VALUES (?,?,?,?,?,?)').run(title, s, content || '', category || 'general', status || 'draft', req.user.id);
    res.status(201).json({ id: r.lastInsertRowid });
  } catch { res.status(400).json({ error: 'Slug already exists.' }); }
});

router.put('/:id', authorize('admin','registrar'), (req, res) => {
  const { title, content, category, status } = req.body;
  const sets = ["updated_at=datetime('now')", 'updated_by=?']; const vals = [req.user.id];
  if (title   !== undefined) { sets.push('title=?');   vals.push(title); }
  if (content !== undefined) { sets.push('content=?'); vals.push(content); }
  if (category!== undefined) { sets.push('category=?');vals.push(category); }
  if (status  !== undefined) {
    sets.push('status=?'); vals.push(status);
    if (status === 'published') { sets.push("published_at=datetime('now')"); }
  }
  vals.push(req.params.id);
  db.prepare(`UPDATE cms_content SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ message: 'Updated.' });
});

router.delete('/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM cms_content WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

module.exports = router;
