const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1').get(username, username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  const { password: _, ...userInfo } = user;

  // Get additional info based on role
  let extraInfo = {};
  if (user.role === 'student') {
    const stu = db.prepare(`SELECT s.*, p.name as program_name, p.code as program_code
      FROM students s JOIN programs p ON s.program_id = p.id WHERE s.user_id = ?`).get(user.id);
    extraInfo = { studentInfo: stu };
  } else if (user.role === 'faculty') {
    const fac = db.prepare(`SELECT f.*, d.name as dept_name FROM faculty f
      LEFT JOIN departments d ON f.department_id = d.id WHERE f.user_id = ?`).get(user.id);
    extraInfo = { facultyInfo: fac };
  }

  res.json({ token, user: { ...userInfo, ...extraInfo } });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id,username,role,name,email,phone,department,profile_photo,last_login FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  let extra = {};
  if (user.role === 'student') {
    const stu = db.prepare(`SELECT s.*, p.name as program_name FROM students s JOIN programs p ON s.program_id = p.id WHERE s.user_id = ?`).get(user.id);
    extra = { studentInfo: stu };
  } else if (user.role === 'faculty') {
    const fac = db.prepare(`SELECT f.*, d.name as dept_name FROM faculty f LEFT JOIN departments d ON f.department_id = d.id WHERE f.user_id = ?`).get(user.id);
    extra = { facultyInfo: fac };
  }

  res.json({ ...user, ...extra });
});

router.post('/change-password', authenticate, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'Password changed successfully.' });
});

// ── Admin user management ──────────────────────────────────────────────────────
const { authorize } = require('../middleware/auth');

router.get('/users', authenticate, authorize('admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, name, email, phone, role, department, is_active, last_login, created_at FROM users ORDER BY role, name').all();
  res.json(users);
});

router.put('/users/:id/toggle-active', authenticate, authorize('admin'), (req, res) => {
  const u = db.prepare('SELECT id, is_active, role FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  if (u.role === 'admin' && req.user.id.toString() === req.params.id.toString()) return res.status(400).json({ error: 'Cannot deactivate your own account.' });
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(u.is_active ? 0 : 1, req.params.id);
  res.json({ message: `Account ${u.is_active ? 'deactivated' : 'activated'}.` });
});

router.put('/users/:id/role', authenticate, authorize('admin'), (req, res) => {
  const { role } = req.body;
  const allowed = ['admin','faculty','student','hod','registrar','librarian','accounts','placement','parent'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (req.user.id.toString() === req.params.id.toString()) return res.status(400).json({ error: 'Cannot change your own role.' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated.' });
});

router.put('/users/:id/reset-password', authenticate, authorize('admin'), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ message: 'Password reset successfully.' });
});

router.put('/users/:id/profile', authenticate, authorize('admin','registrar'), (req, res) => {
  const { name, email, phone, department } = req.body;
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const sets = []; const vals = [];
  if (name       !== undefined) { sets.push('name=?');       vals.push(name); }
  if (email      !== undefined) { sets.push('email=?');      vals.push(email); }
  if (phone      !== undefined) { sets.push('phone=?');      vals.push(phone); }
  if (department !== undefined) { sets.push('department=?'); vals.push(department); }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
  vals.push(req.params.id);
  db.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).run(...vals);

  // If user has a faculty record, update designation too
  const { designation } = req.body;
  if (designation !== undefined) {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id=?').get(req.params.id);
    if (fac) db.prepare('UPDATE faculty SET designation=? WHERE id=?').run(designation, fac.id);
  }
  res.json({ message: 'Profile updated.' });
});

module.exports = router;
