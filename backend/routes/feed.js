const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/posts', (req, res) => {
  const { booth_id, post_type, limit = 20, offset = 0 } = req.query;
  let q = `SELECT p.*, u.name as author_name, u.role as author_role,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
    (SELECT COUNT(*) FROM post_comments WHERE post_id = p.id) as comment_count,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id AND user_id = ${req.user.id}) as user_liked
    FROM feed_posts p JOIN users u ON p.author_id = u.id WHERE 1=1`;
  const params = [];
  if (booth_id) { q += ' AND p.booth_id = ?'; params.push(booth_id); }
  if (post_type) { q += ' AND p.post_type = ?'; params.push(post_type); }
  q += ` ORDER BY p.is_pinned DESC, p.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
  res.json(db.prepare(q).all(...params));
});

router.post('/posts', (req, res) => {
  const { content, post_type, image_url, target_audience, booth_id, is_pinned } = req.body;
  const canPin = ['admin','registrar','hod'].includes(req.user.role);
  const result = db.prepare('INSERT INTO feed_posts (author_id,content,post_type,image_url,target_audience,booth_id,is_pinned) VALUES (?,?,?,?,?,?,?)').run(req.user.id,content,post_type||'general',image_url||null,target_audience||'all',booth_id||null,canPin&&is_pinned?1:0);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/posts/:id/like', (req, res) => {
  try {
    db.prepare('INSERT INTO post_likes (post_id,user_id) VALUES (?,?)').run(req.params.id,req.user.id);
    res.json({ liked: true });
  } catch {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(req.params.id,req.user.id);
    res.json({ liked: false });
  }
});

router.get('/posts/:id/comments', (req, res) => {
  const comments = db.prepare('SELECT c.*, u.name as author_name FROM post_comments c JOIN users u ON c.author_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC').all(req.params.id);
  res.json(comments);
});

router.post('/posts/:id/comments', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content required.' });
  const result = db.prepare('INSERT INTO post_comments (post_id,author_id,content) VALUES (?,?,?)').run(req.params.id,req.user.id,content);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.delete('/posts/:id', (req, res) => {
  const post = db.prepare('SELECT author_id FROM feed_posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Not found.' });
  if (post.author_id !== req.user.id && !['admin','registrar'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
  db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(req.params.id);
  db.prepare('DELETE FROM post_comments WHERE post_id = ?').run(req.params.id);
  db.prepare('DELETE FROM feed_posts WHERE id = ?').run(req.params.id);
  res.json({ message: 'Post deleted.' });
});

router.get('/booths', (req, res) => {
  const booths = db.prepare('SELECT b.*, u.name as created_by_name, (SELECT COUNT(*) FROM feed_posts WHERE booth_id = b.id) as post_count FROM booths b LEFT JOIN users u ON b.created_by = u.id WHERE b.is_active = 1 ORDER BY b.name').all();
  res.json(booths);
});

router.post('/booths', authorize('admin','hod','registrar'), (req, res) => {
  const { name, description, type, banner_url } = req.body;
  const result = db.prepare('INSERT INTO booths (name,description,type,created_by,banner_url) VALUES (?,?,?,?,?)').run(name,description||'',type||'club',req.user.id,banner_url||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/stats', (req, res) => {
  const posts = db.prepare('SELECT COUNT(*) as c FROM feed_posts').get();
  const likes = db.prepare('SELECT COUNT(*) as c FROM post_likes').get();
  const comments = db.prepare('SELECT COUNT(*) as c FROM post_comments').get();
  const booths = db.prepare('SELECT COUNT(*) as c FROM booths WHERE is_active = 1').get();
  res.json({ posts: posts.c, likes: likes.c, comments: comments.c, booths: booths.c });
});

module.exports = router;
