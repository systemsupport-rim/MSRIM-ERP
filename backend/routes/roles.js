const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

const BUILT_IN_ROLES = ['admin','registrar','hod','faculty','student','accounts','librarian','placement','parent','staff'];

// ── GET all roles with their privileges ───────────────────────────────────────
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT role, privilege FROM role_privileges ORDER BY role, privilege').all();
  const map = {};
  rows.forEach(({ role, privilege }) => {
    if (!map[role]) map[role] = { role, privileges: [], is_builtin: BUILT_IN_ROLES.includes(role) };
    map[role].privileges.push(privilege);
  });
  res.json(Object.values(map));
});

// ── GET single role ───────────────────────────────────────────────────────────
router.get('/:role', (req, res) => {
  const rows = db.prepare('SELECT privilege FROM role_privileges WHERE role = ? ORDER BY privilege').all(req.params.role);
  if (!rows.length && !BUILT_IN_ROLES.includes(req.params.role)) return res.status(404).json({ error: 'Role not found.' });
  res.json({
    role: req.params.role,
    privileges: rows.map(r => r.privilege),
    is_builtin: BUILT_IN_ROLES.includes(req.params.role),
  });
});

// ── POST create new custom role ───────────────────────────────────────────────
router.post('/', (req, res) => {
  const { role, privileges = [] } = req.body;
  if (!role) return res.status(400).json({ error: 'Role name is required.' });
  const clean = role.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
  if (!clean) return res.status(400).json({ error: 'Invalid role name.' });
  if (BUILT_IN_ROLES.includes(clean)) return res.status(400).json({ error: 'Cannot create a role with a built-in name.' });

  const existing = db.prepare('SELECT 1 FROM role_privileges WHERE role = ?').get(clean);
  if (existing) return res.status(400).json({ error: 'Role already exists.' });

  if (privileges.length) {
    const stmt = db.prepare('INSERT OR IGNORE INTO role_privileges (role, privilege) VALUES (?,?)');
    privileges.forEach(p => stmt.run(clean, p));
  } else {
    // Insert a placeholder so the role exists even with 0 privileges
    db.prepare('INSERT OR IGNORE INTO role_privileges (role, privilege) VALUES (?,?)').run(clean, '__none__');
  }
  res.status(201).json({ role: clean, message: 'Role created.' });
});

// ── PUT update privileges for a role (full replace) ───────────────────────────
router.put('/:role/privileges', (req, res) => {
  const { privileges } = req.body;
  if (!Array.isArray(privileges)) return res.status(400).json({ error: 'privileges must be an array.' });
  const role = req.params.role;

  db.prepare('DELETE FROM role_privileges WHERE role = ?').run(role);
  if (privileges.length) {
    const stmt = db.prepare('INSERT OR IGNORE INTO role_privileges (role, privilege) VALUES (?,?)');
    privileges.forEach(p => stmt.run(role, p));
  } else {
    db.prepare('INSERT OR IGNORE INTO role_privileges (role, privilege) VALUES (?,?)').run(role, '__none__');
  }
  res.json({ message: `Privileges updated for ${role}.`, count: privileges.length });
});

// ── PATCH rename a custom role ────────────────────────────────────────────────
router.patch('/:role/rename', (req, res) => {
  const { new_name } = req.body;
  const old = req.params.role;
  if (BUILT_IN_ROLES.includes(old)) return res.status(400).json({ error: 'Cannot rename a built-in role.' });
  if (!new_name) return res.status(400).json({ error: 'new_name is required.' });
  const clean = new_name.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
  if (BUILT_IN_ROLES.includes(clean)) return res.status(400).json({ error: 'Cannot rename to a built-in role name.' });
  db.prepare('UPDATE role_privileges SET role = ? WHERE role = ?').run(clean, old);
  res.json({ message: `Renamed ${old} → ${clean}.` });
});

// ── DELETE a custom role ──────────────────────────────────────────────────────
router.delete('/:role', (req, res) => {
  const role = req.params.role;
  if (BUILT_IN_ROLES.includes(role)) return res.status(400).json({ error: 'Cannot delete a built-in role.' });
  const r = db.prepare('SELECT 1 FROM role_privileges WHERE role = ?').get(role);
  if (!r) return res.status(404).json({ error: 'Role not found.' });
  db.prepare('DELETE FROM role_privileges WHERE role = ?').run(role);
  res.json({ message: `Role "${role}" deleted.` });
});

module.exports = router;
