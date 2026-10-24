/**
 * Import real courses from Digiicampus into MSRIM ERP
 * Run: node backend/database/import_courses.js
 */
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(path.join(__dirname, 'msrim_erp.db'));

// ── 1. Ensure academic years exist ────────────────────────────────────────────
const insertAY = db.prepare(`INSERT OR IGNORE INTO academic_years (name, start_date, end_date, is_current) VALUES (?,?,?,0)`);
insertAY.run('2025-2027', '2025-07-01', '2027-06-30');
insertAY.run('2026-2028', '2026-07-01', '2028-06-30');

const ay2025 = db.prepare("SELECT id FROM academic_years WHERE name='2025-2027'").get().id;
const ay2026 = db.prepare("SELECT id FROM academic_years WHERE start_date='2026-07-01'").get()?.id ||
               db.prepare("SELECT id FROM academic_years WHERE name='2026-2028'").get()?.id;

console.log('AY IDs  →  2025-2027:', ay2025, ' | 2026-2028:', ay2026);

// ── 2. Course data ─────────────────────────────────────────────────────────────
// Format: [code, name, credits, semester, program_id, academic_year_id, type]
// program_id: 1=PGDM  type: core/elective
const courses = [
  // ── 2026 Batch — Term 1 (10 core courses) ──────────────────────────────────
  ['26PGDC101', 'Financial Reporting for Decision Making',                    3, 1, 1, ay2026, 'core'],
  ['26PGDC102', 'Decision Sciences - I',                                      3, 1, 1, ay2026, 'core'],
  ['26PGDC103', 'Foundations in Management and Organizational Behaviour',      3, 1, 1, ay2026, 'core'],
  ['26PGDC104', 'Information System for Decision Making',                     3, 1, 1, ay2026, 'core'],
  ['26PGDC105', 'Strategic Wisdom: The Indian Way',                           3, 1, 1, ay2026, 'core'],
  ['26PGDC106', 'Economics for Management',                                   3, 1, 1, ay2026, 'core'],
  ['26PGDC107', 'Managerial Skills',                                          3, 1, 1, ay2026, 'core'],
  ['26PGDC108', 'Business Law & Corporate Governance',                        3, 1, 1, ay2026, 'core'],
  ['26PGDC109', 'Integrated Live Project (ILP)',                              3, 1, 1, ay2026, 'core'],
  ['26PGDC110', 'Harvard Business Impact (HBI) Online Certification',         3, 1, 1, ay2026, 'core'],

  // ── 2025 Batch — Term 4 (30 courses) ───────────────────────────────────────
  // Core
  ['25PGDC401', 'Leadership',                                                 2, 4, 1, ay2025, 'core'],
  ['25PGDC402', 'Business Ethics and Corporate Governance',                   2, 4, 1, ay2025, 'core'],

  // Marketing specialisation
  ['25PGDM401', 'Consumer Behaviour',                                         2, 4, 1, ay2025, 'elective'],
  ['25PGDM402', 'Digital Marketing',                                          2, 4, 1, ay2025, 'elective'],
  ['25PGDM403', 'Brand Management and Communication',                         2, 4, 1, ay2025, 'elective'],
  ['25PGDM411', 'Consumer Behaviour (Sec 2)',                                 2, 4, 1, ay2025, 'elective'],
  ['25PGDM412', 'Digital Marketing (Sec 2)',                                  2, 4, 1, ay2025, 'elective'],
  ['25PGDM413', 'Brand Management and Communication (Sec 2)',                 2, 4, 1, ay2025, 'elective'],

  // Finance specialisation
  ['25PGDF401', 'Derivatives Management',                                     3, 4, 1, ay2025, 'elective'],
  ['25PGDF402', 'Corporate Valuation',                                        3, 4, 1, ay2025, 'elective'],

  // BFSI specialisation
  ['25PGDB401', 'Fintech & Digital Banking',                                  3, 4, 1, ay2025, 'elective'],
  ['25PGDB402', 'Investment Banking',                                         3, 4, 1, ay2025, 'elective'],

  // HR specialisation
  ['25PGDH401', 'Performance and Compensation Management',                    3, 4, 1, ay2025, 'elective'],
  ['25PGDH402', 'Organizational Development and Change Management',           3, 4, 1, ay2025, 'elective'],
  ['25PGDH411', 'Learning and Development',                                   3, 4, 1, ay2025, 'elective'],
  ['25PGDH412', 'Labour Codes & Employment Compliances',                      3, 4, 1, ay2025, 'elective'],

  // Business Analytics specialisation
  ['25PGDBA401', 'Predictive Analytics using R',                              3, 4, 1, ay2025, 'elective'],
  ['25PGDBA402', 'Machine Learning with Python',                              3, 4, 1, ay2025, 'elective'],

  // International Business specialisation
  ['25PGDIB401', 'Global Marketing',                                          3, 4, 1, ay2025, 'elective'],
  ['25PGDIB402', 'International Human Resource Management',                   3, 4, 1, ay2025, 'elective'],

  // Operations specialisation
  ['25PGDO401', 'Total Quality Management',                                   3, 4, 1, ay2025, 'elective'],
  ['25PGDO402', 'Service Operation Management',                               3, 4, 1, ay2025, 'elective'],

  // Logistics specialisation
  ['25PGDL401', 'Quality Toolkit for Managers',                               3, 4, 1, ay2025, 'elective'],
  ['25PGDL402', 'Sustainable Supply Chain Management',                        3, 4, 1, ay2025, 'elective'],

  // Entrepreneurship specialisation
  ['25PGDE401', 'Product Development & Scale Up',                             3, 4, 1, ay2025, 'elective'],
  ['25PGDE402', 'Technology for Startups and Digital Innovation',             3, 4, 1, ay2025, 'elective'],

  // Open electives
  ['25PGDOP402', 'Corporate Storytelling',                                    2, 4, 1, ay2025, 'elective'],
  ['25PGDOP403', 'Optimization Techniques',                                   2, 4, 1, ay2025, 'elective'],
  ['25PGDOP404', 'Basic Japanese Language',                                   2, 4, 1, ay2025, 'elective'],
  ['25PGDOP405', 'Digital Transformation',                                    2, 4, 1, ay2025, 'elective'],
];

// ── 3. Insert courses ──────────────────────────────────────────────────────────
const insertCourse = db.prepare(`
  INSERT OR IGNORE INTO courses (code, name, program_id, semester, credits, type, academic_year_id, max_students, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, 60, datetime('now'))
`);

const insertCurr = db.prepare(`
  INSERT OR IGNORE INTO curriculum_map (program_id, course_id, semester, is_mandatory, created_at)
  VALUES (?, ?, ?, ?, datetime('now'))
`);

let imported = 0;
courses.forEach(([code, name, credits, semester, progId, ayId, type]) => {
  const r = insertCourse.run(code, name, progId, semester, credits, type, ayId);
  if (r.changes > 0) {
    const courseId = db.prepare('SELECT id FROM courses WHERE code=?').get(code).id;
    insertCurr.run(progId, courseId, semester, type === 'core' ? 1 : 0);
    imported++;
    console.log(`  ✓ [${semester === 1 ? '2026-T1' : '2025-T4'}] ${code} | ${name} | ${credits}cr | ${type}`);
  }
});

// ── 4. Summary ─────────────────────────────────────────────────────────────────
console.log(`\n════════════════════════════════════════════
✅  Imported ${imported} courses
════════════════════════════════════════════`);

const bySem = db.prepare('SELECT semester, COUNT(*) as n, SUM(credits) as total_credits FROM courses GROUP BY semester ORDER BY semester').all();
const byType = db.prepare("SELECT type, COUNT(*) as n FROM courses GROUP BY type").all();
console.log('\nBy semester:', bySem.map(r=>`Term ${r.semester}: ${r.n} courses (${r.total_credits} credits)`).join(' | '));
console.log('By type:', byType.map(r=>`${r.type}: ${r.n}`).join(' | '));
console.log('Curriculum map entries:', db.prepare('SELECT COUNT(*) as n FROM curriculum_map').get().n);
