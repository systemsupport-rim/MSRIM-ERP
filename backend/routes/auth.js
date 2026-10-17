const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/db');
const { authenticate, authorize, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// ── In-memory rate limiter (brute-force protection on login) ──────────────────
const loginAttempts = new Map();
const RATE = { windowMs: 15 * 60 * 1000, max: 10 };
function rateLimitLogin(req, res, next) {
  const key = (req.ip || req.headers['x-forwarded-for'] || 'unknown') + ':' + (req.body?.username || '');
  const now = Date.now();
  const rec = loginAttempts.get(key) || { count: 0, resetAt: now + RATE.windowMs };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + RATE.windowMs; }
  if (rec.count >= RATE.max) {
    const wait = Math.ceil((rec.resetAt - now) / 60000);
    return res.status(429).json({ error: `Too many login attempts. Try again in ${wait} minute(s).` });
  }
  rec.count++;
  loginAttempts.set(key, rec);
  next();
}
// Clean up expired entries every 30 minutes
setInterval(() => { const now = Date.now(); for (const [k, v] of loginAttempts) if (now > v.resetAt) loginAttempts.delete(k); }, 30 * 60 * 1000);

const REFRESH_SECRET = process.env.REFRESH_SECRET || 'msrim-refresh-secret-2024';
const REFRESH_EXPIRY = '7d';
const ACCESS_EXPIRY = '1h';

function issueTokens(user, res) {
  const payload = { id: user.id, username: user.username, role: user.role, name: user.name, email: user.email };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY });
  const refreshToken = jwt.sign({ id: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY });

  // Store refresh token hash in DB (allows revocation)
  const hash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
  db.prepare("INSERT OR REPLACE INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?,?,datetime('now','+7 days'))").run(user.id, hash);

  // Set as httpOnly cookie (more secure than localStorage)
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh'
  });

  return accessToken;
}

router.post('/login', rateLimitLogin, (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required.' });

  const user = db.prepare('SELECT * FROM users WHERE (username = ? OR email = ?) AND is_active = 1').get(username, username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

  // Clear rate limit on success
  const key = (req.ip || req.headers['x-forwarded-for'] || 'unknown') + ':' + username;
  loginAttempts.delete(key);

  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(user.id);

  const accessToken = issueTokens(user, res);
  const { password: _, ...userInfo } = user;

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

  res.json({ token: accessToken, user: { ...userInfo, ...extraInfo } });
});

// ── Refresh access token using httpOnly cookie ────────────────────────────────
router.post('/refresh', (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token.' });

  let payload;
  try { payload = jwt.verify(refreshToken, REFRESH_SECRET); }
  catch { return res.status(401).json({ error: 'Invalid or expired refresh token.' }); }

  const hash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
  const stored = db.prepare("SELECT * FROM refresh_tokens WHERE user_id=? AND token_hash=? AND datetime('now') < expires_at").get(payload.id, hash);
  if (!stored) return res.status(401).json({ error: 'Refresh token revoked.' });

  const user = db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1').get(payload.id);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  // Rotate: delete old token, issue new pair
  db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  const accessToken = issueTokens(user, res);
  const { password: _, ...userInfo } = user;

  res.json({ token: accessToken, user: userInfo });
});

// ── Logout ────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (refreshToken) {
    const hash = require('crypto').createHash('sha256').update(refreshToken).digest('hex');
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(hash);
  }
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out.' });
});

// ── Logout from all devices ───────────────────────────────────────────────────
router.post('/logout-all', authenticate, (req, res) => {
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);
  res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out from all devices.' });
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
  if (!newPassword || newPassword.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) return res.status(400).json({ error: 'Password must contain at least one uppercase letter and one number.' });
  const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 12), req.user.id);
  // Revoke all other sessions on password change
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user.id);
  res.json({ message: 'Password changed. Please log in again on other devices.' });
});

// ── Admin user management ──────────────────────────────────────────────────────
router.get('/users', authenticate, authorize('admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, name, email, phone, role, department, designation, gender, joining_date, employee_id, is_active, last_login, created_at FROM users ORDER BY role, name').all();
  res.json(users);
});

router.put('/users/:id/toggle-active', authenticate, authorize('admin'), (req, res) => {
  const u = db.prepare('SELECT id, is_active, role FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  if (u.role === 'admin' && req.user.id.toString() === req.params.id.toString()) return res.status(400).json({ error: 'Cannot deactivate your own account.' });
  db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(u.is_active ? 0 : 1, req.params.id);
  if (!u.is_active === false) db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.params.id);
  res.json({ message: `Account ${u.is_active ? 'deactivated' : 'activated'}.` });
});

router.put('/users/:id/role', authenticate, authorize('admin'), (req, res) => {
  const { role } = req.body;
  const allowed = ['admin','faculty','student','hod','registrar','librarian','accounts','placement','parent','staff'];
  if (!allowed.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (req.user.id.toString() === req.params.id.toString()) return res.status(400).json({ error: 'Cannot change your own role.' });
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  res.json({ message: 'Role updated.' });
});

router.put('/users/:id/reset-password', authenticate, authorize('admin'), (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(bcrypt.hashSync(password, 12), req.params.id);
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.params.id);
  res.json({ message: 'Password reset. User must log in again.' });
});

router.put('/users/:id/profile', authenticate, authorize('admin','registrar'), (req, res) => {
  const { name, email, phone, department, designation } = req.body;
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!u) return res.status(404).json({ error: 'User not found.' });
  const sets = []; const vals = [];
  if (name        !== undefined) { sets.push('name=?');        vals.push(name); }
  if (email       !== undefined) { sets.push('email=?');       vals.push(email); }
  if (phone       !== undefined) { sets.push('phone=?');       vals.push(phone); }
  if (department  !== undefined) { sets.push('department=?');  vals.push(department); }
  if (designation !== undefined) { sets.push('designation=?'); vals.push(designation); }
  if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
  vals.push(req.params.id);
  db.prepare(`UPDATE users SET ${sets.join(',')} WHERE id=?`).run(...vals);
  if (designation !== undefined) {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id=?').get(req.params.id);
    if (fac) db.prepare('UPDATE faculty SET designation=? WHERE id=?').run(designation, fac.id);
  }
  res.json({ message: 'Profile updated.' });
});

module.exports = router;
