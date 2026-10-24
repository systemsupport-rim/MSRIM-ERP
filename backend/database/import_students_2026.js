/**
 * Import Term 1 Students — 2026-2028 Batch (PGDM + FPM)
 * Source: students_import_2026.json
 * Run: node backend/database/import_students_2026.js
 *
 * PGDM sections A-D → program_id=1, semester=1, batch_year=2026
 * FPM → program_id=2, semester=1, batch_year=2026
 */

const path   = require('path');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH     = path.join(__dirname, 'msrim_erp.db');
const IMPORT_FILE = path.join(__dirname, 'students_import_2026.json');

const db      = new DatabaseSync(DB_PATH);
const records = JSON.parse(fs.readFileSync(IMPORT_FILE, 'utf8').replace(/^﻿/, ''));

const hashPwd = (pwd) => bcrypt.hashSync(pwd, 10);

function toUsername(email, regId) {
  if (email && email.includes('@')) return email.split('@')[0].toLowerCase();
  return 'stu' + regId.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// programme → program_id
const progMap = { PGDM: 1, FPM: 2 };

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users
    (username, password, role, name, email, phone, department, is_active)
  VALUES (?, ?, 'student', ?, ?, ?, 'Management Studies', 1)
`);
const getUserId = db.prepare(`SELECT id FROM users WHERE username = ?`);
const insertStudent = db.prepare(`
  INSERT OR IGNORE INTO students
    (user_id, enrollment_number, program_id, semester, batch_year,
     section, gender, admission_date, status, created_at)
  VALUES (?, ?, ?, 1, 2026, ?, ?, ?, 'active', datetime('now'))
`);

let created = 0, skipped = 0, errors = 0;
console.log(`\nImporting ${records.length} students (2026 batch)…\n`);

for (const rec of records) {
  try {
    const username   = toUsername(rec.email, rec.reg_id);
    const password   = hashPwd(rec.reg_id);
    const progId     = progMap[rec.programme] || 1;
    const gender     = (!rec.gender || rec.gender === '--' || rec.gender === 'unknown') ? null : rec.gender.toLowerCase();
    const admDate    = rec.doj && rec.doj !== '--' ? rec.doj : '2026-07-28';
    // Enrollment format: MSRIM-PGDM-26-261001 or MSRIM-FPM-26-26FPM01
    const prefix     = rec.programme === 'FPM' ? 'MSRIM-FPM-26' : 'MSRIM-PGDM-26';
    const enrollment = `${prefix}-${rec.reg_id}`;

    insertUser.run(username, password, rec.name, rec.email, rec.phone || null);
    const user = getUserId.get(username);
    if (!user) { errors++; console.error(`  ✗ No user for ${rec.name}`); continue; }

    const sRes = insertStudent.run(user.id, enrollment, progId, rec.section, gender, admDate);
    if (sRes.changes > 0) {
      created++;
      if (created <= 10 || created % 50 === 0)
        console.log(`  ✓ [${created}] ${rec.reg_id} | ${rec.name} | Sec:${rec.section} | ${rec.programme}`);
    } else {
      skipped++;
    }
  } catch (err) {
    errors++;
    console.error(`  ✗ ${rec.reg_id} (${rec.name}): ${err.message}`);
  }
}

console.log(`
════════════════════════════════════════════════
✅  Import complete — 2026 batch
    Created : ${created}
    Skipped : ${skipped} (already existed)
    Errors  : ${errors}
════════════════════════════════════════════════

📋  Student login:
    Username : <email prefix>  e.g.  abhaysurya261001
    Password : <registration ID>  e.g.  261001
    FPM:  e.g.  username: mallika26fpm01  / password: 26FPM01
`);

const total   = db.prepare('SELECT COUNT(*) as n FROM students').get().n;
const byBatch = db.prepare('SELECT batch_year, COUNT(*) as n FROM students GROUP BY batch_year ORDER BY batch_year').all();
const bySec   = db.prepare(`SELECT section, COUNT(*) as n FROM students WHERE batch_year=2026 GROUP BY section ORDER BY section`).all();
console.log(`Total students: ${total}`);
console.log('By batch:', byBatch.map(r => r.batch_year + ':' + r.n).join(', '));
console.log('2026 sections:', bySec.map(r => r.section + ':' + r.n).join(', '));
