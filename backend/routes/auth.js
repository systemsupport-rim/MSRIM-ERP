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
  if (newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ message: 'Password changed successfully.' });
});

module.exports = router;
