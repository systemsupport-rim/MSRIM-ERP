const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// Drive is a document/file management module
// Files are tracked in DB (actual file upload would need multer in production)
db.exec(`
  CREATE TABLE IF NOT EXISTS drive_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_id INTEGER REFERENCES drive_folders(id),
    owner_id INTEGER REFERENCES users(id),
    access_role TEXT DEFAULT 'all',
    course_id INTEGER REFERENCES courses(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS drive_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folder_id INTEGER REFERENCES drive_folders(id),
    name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER DEFAULT 0,
    file_url TEXT,
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    download_count INTEGER DEFAULT 0,
    access_role TEXT DEFAULT 'all',
    course_id INTEGER REFERENCES courses(id),
    tags TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed default folders
const rootExists = db.prepare('SELECT id FROM drive_folders LIMIT 1').get();
if (!rootExists) {
  const adminId = db.prepare("SELECT id FROM users WHERE username='admin'").get()?.id || 1;
  const folderInsert = db.prepare("INSERT INTO drive_folders (name, owner_id, access_role) VALUES (?, ?, ?)");
  folderInsert.run('Academic Resources', adminId, 'all');
  folderInsert.run('Exam Papers', adminId, 'all');
  folderInsert.run('Syllabus & Curriculum', adminId, 'all');
  folderInsert.run('Administrative Forms', adminId, 'admin');
  folderInsert.run('Placement Materials', adminId, 'student');
  // Seed some files
  const fileInsert = db.prepare("INSERT INTO drive_files (folder_id, name, file_type, file_size, description, uploaded_by, access_role) VALUES (?, ?, ?, ?, ?, ?, ?)");
  fileInsert.run(1, 'Financial Management - Lecture Notes.pdf', 'pdf', 2048000, 'Complete lecture notes for FM course', adminId, 'all');
  fileInsert.run(1, 'Marketing Management - Case Studies.pdf', 'pdf', 1536000, 'Collection of marketing case studies', adminId, 'all');
  fileInsert.run(2, 'Mid Term 2024 - Financial Management.pdf', 'pdf', 512000, 'Mid-term exam paper 2024', adminId, 'faculty');
  fileInsert.run(3, 'PGDM Syllabus 2024-26.pdf', 'pdf', 1024000, 'Complete PGDM programme syllabus', adminId, 'all');
  fileInsert.run(4, 'Fee Structure 2024-25.pdf', 'pdf', 256000, 'Official fee structure document', adminId, 'admin');
  fileInsert.run(5, 'Resume Writing Guide.pdf', 'pdf', 768000, 'Guide for writing effective resumes', adminId, 'student');
  fileInsert.run(5, 'Interview Preparation Tips.pdf', 'pdf', 512000, 'Placement interview preparation guide', adminId, 'student');
}

router.get('/folders', (req, res) => {
  const { parent_id } = req.query;
  let q = 'SELECT f.*, u.name as owner_name, (SELECT COUNT(*) FROM drive_files WHERE folder_id = f.id) as file_count FROM drive_folders f JOIN users u ON f.owner_id = u.id WHERE 1=1';
  const params = [];
  if (parent_id !== undefined) { q += ' AND f.parent_id ' + (parent_id ? '= ?' : 'IS NULL'); if (parent_id) params.push(parent_id); }
  else { q += ' AND f.parent_id IS NULL'; }

  // Filter by role access
  if (!['admin','registrar'].includes(req.user.role)) {
    q += " AND (f.access_role = 'all' OR f.access_role = ?)"; params.push(req.user.role);
  }
  q += ' ORDER BY f.name';
  res.json(db.prepare(q).all(...params));
});

router.post('/folders', authorize('admin','registrar','faculty','hod'), (req, res) => {
  const { name, parent_id, access_role, course_id } = req.body;
  const result = db.prepare('INSERT INTO drive_folders (name,parent_id,owner_id,access_role,course_id) VALUES (?,?,?,?,?)').run(name,parent_id||null,req.user.id,access_role||'all',course_id||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/files', (req, res) => {
  const { folder_id, search, file_type, course_id } = req.query;
  let q = 'SELECT df.*, u.name as uploaded_by_name FROM drive_files df JOIN users u ON df.uploaded_by = u.id WHERE 1=1';
  const params = [];
  if (folder_id !== undefined) { q += ' AND df.folder_id = ?'; params.push(folder_id || null); }
  if (search) { q += ' AND (df.name LIKE ? OR df.description LIKE ? OR df.tags LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (file_type) { q += ' AND df.file_type = ?'; params.push(file_type); }
  if (course_id) { q += ' AND df.course_id = ?'; params.push(course_id); }
  if (!['admin','registrar'].includes(req.user.role)) {
    q += " AND (df.access_role = 'all' OR df.access_role = ?)"; params.push(req.user.role);
  }
  q += ' ORDER BY df.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/files', authorize('admin','registrar','faculty','hod'), (req, res) => {
  const { folder_id, name, file_type, file_size, description, access_role, course_id, tags, file_url } = req.body;
  const result = db.prepare('INSERT INTO drive_files (folder_id,name,file_type,file_size,description,uploaded_by,access_role,course_id,tags,file_url) VALUES (?,?,?,?,?,?,?,?,?,?)').run(folder_id||null,name,file_type||'document',file_size||0,description||'',req.user.id,access_role||'all',course_id||null,tags||'',file_url||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/files/:id/download', (req, res) => {
  db.prepare('UPDATE drive_files SET download_count = download_count + 1 WHERE id = ?').run(req.params.id);
  const file = db.prepare('SELECT * FROM drive_files WHERE id = ?').get(req.params.id);
  res.json(file);
});

router.delete('/files/:id', authorize('admin','registrar','faculty'), (req, res) => {
  const file = db.prepare('SELECT uploaded_by FROM drive_files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'File not found.' });
  if (file.uploaded_by !== req.user.id && !['admin','registrar'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
  db.prepare('DELETE FROM drive_files WHERE id = ?').run(req.params.id);
  res.json({ message: 'File deleted.' });
});

router.get('/stats', (req, res) => {
  const files = db.prepare('SELECT COUNT(*) as c FROM drive_files').get();
  const folders = db.prepare('SELECT COUNT(*) as c FROM drive_folders').get();
  const downloads = db.prepare('SELECT SUM(download_count) as c FROM drive_files').get();
  const byType = db.prepare('SELECT file_type, COUNT(*) as count FROM drive_files GROUP BY file_type').all();
  res.json({ files: files.c, folders: folders.c, totalDownloads: downloads.c || 0, byType });
});

module.exports = router;
