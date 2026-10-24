/**
 * MSRIM ERP — Comprehensive Data Fix & Seed Script
 * Run once: node backend/database/seed_fix.js
 *
 * Fixes:
 *  1. Creates missing role users (hod, registrar, librarian, placement, parent)
 *  2. Removes duplicate academic years (keeps IDs 1, 2, 3)
 *  3. Adds PGDM Sem 3 & 4 courses + FPM/EPGDM/EMBA courses
 *  4. Seeds timetable for all courses
 *  5. Seeds examinations (IA1, IA2, End Sem)
 *  6. Seeds curriculum_map
 *  7. Adds venues
 *  8. Adds more library books
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = path.join(__dirname, 'msrim_erp.db');
const db = new DatabaseSync(DB_PATH);
const hash = (pwd) => bcrypt.hashSync(pwd, 10);

let fixed = 0;
function log(msg) { console.log('  ✓ ' + msg); fixed++; }

// ── 1. MISSING ROLE USERS ─────────────────────────────────────────────────────
console.log('\n[1] Creating missing role users...');

const insertUser = db.prepare(
  `INSERT OR IGNORE INTO users (username, password, role, name, email, phone, department, is_active)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
);

const roleUsers = [
  ['hod',        hash('Hod@msrim1'),      'hod',        'Dr. HOD Management',         'hod@msrim.in',        '9900000011', 'Management Studies'],
  ['registrar',  hash('Reg@msrim1'),      'registrar',  'Mr. Registrar',               'registrar@msrim.in',  '9900000012', 'Administration'],
  ['librarian',  hash('Lib@msrim1'),      'librarian',  'Mrs. Librarian',              'librarian@msrim.in',  '9900000013', 'Library'],
  ['placement',  hash('Place@msrim1'),    'placement',  'Mr. Placement Officer',       'placement@msrim.in',  '9900000014', 'Placements'],
  ['parent1',    hash('Parent@msrim1'),   'parent',     'Mr. Parent (Demo)',           'parent1@demo.in',     '9900000015', null],
];

roleUsers.forEach(([u, p, r, n, e, ph, d]) => {
  const res = insertUser.run(u, p, r, n, e, ph, d);
  if (res.changes > 0) log(`Created ${r} user: ${u} (password: ${r === 'hod' ? 'Hod@msrim1' : r === 'registrar' ? 'Reg@msrim1' : r === 'librarian' ? 'Lib@msrim1' : r === 'placement' ? 'Place@msrim1' : 'Parent@msrim1'})`);
  else console.log(`  – ${r} user already exists, skipped`);
});

// Create faculty record for HOD user
const hodUser = db.prepare("SELECT id FROM users WHERE username='hod'").get();
if (hodUser) {
  const existing = db.prepare('SELECT id FROM faculty WHERE user_id=?').get(hodUser.id);
  if (!existing) {
    db.prepare(`INSERT INTO faculty (user_id, employee_id, department_id, designation, qualification, experience_years, joining_date, employment_type)
                VALUES (?, 'HOD001', 1, 'Professor & HOD', 'Ph.D Management', 15, '2010-07-01', 'full-time')`).run(hodUser.id);
    log('Linked HOD user to faculty table');
  }
}

// ── 2. REMOVE DUPLICATE ACADEMIC YEARS ───────────────────────────────────────
console.log('\n[2] Removing duplicate academic years...');

// Keep IDs 1 (2024-2026 current), 2 (2025-2027), 3 (2027-2029). Delete 4,5,6,7
const dupIds = [4, 5, 6, 7];
dupIds.forEach(id => {
  const exists = db.prepare('SELECT id FROM academic_years WHERE id=?').get(id);
  if (exists) {
    db.prepare('DELETE FROM academic_years WHERE id=?').run(id);
    log(`Deleted duplicate academic_year id=${id}`);
  }
});

// Ensure only one is_current=1
db.prepare("UPDATE academic_years SET is_current=0 WHERE id != 1").run();
db.prepare("UPDATE academic_years SET is_current=1 WHERE id = 1").run();
log('Set academic_year id=1 (2024-2026) as the single current year');

// ── 3. ADD MORE COURSES ───────────────────────────────────────────────────────
console.log('\n[3] Adding courses for PGDM Sem 3 & 4, and other programs...');

// Get faculty IDs (using first few available)
const faculties = db.prepare('SELECT id FROM faculty ORDER BY id LIMIT 10').all();
const fac = (i) => faculties[i % faculties.length]?.id || 1;

const insertCourse = db.prepare(
  `INSERT OR IGNORE INTO courses (code, name, program_id, semester, credits, type, faculty_id, academic_year_id, max_students)
   VALUES (?, ?, ?, ?, ?, ?, ?, 1, 60)`
);

const newCourses = [
  // PGDM Sem 3
  ['PGDM-BP-301',  'Business Policy & Strategy',      1, 3, 4, 'core',     fac(0)],
  ['PGDM-RM-301',  'Research Methodology',             1, 3, 3, 'core',     fac(1)],
  ['PGDM-BL-301',  'Business Law & Ethics',            1, 3, 3, 'core',     fac(2)],
  ['PGDM-EM-301',  'Entrepreneurship Management',      1, 3, 3, 'elective', fac(3)],
  ['PGDM-PM-301',  'Project Management',               1, 3, 3, 'elective', fac(4)],
  // PGDM Sem 4
  ['PGDM-DS-401',  'Decision Sciences',                1, 4, 4, 'core',     fac(0)],
  ['PGDM-CR-401',  'Corporate Relations & CSR',        1, 4, 3, 'core',     fac(1)],
  ['PGDM-IB-401',  'International Business',           1, 4, 3, 'elective', fac(2)],
  ['PGDM-PE-401',  'Project & Entrepreneurship',       1, 4, 4, 'core',     fac(3)],
  // FPM Courses
  ['FPM-RS-101',   'Research Seminar I',               2, 1, 4, 'core',     fac(0)],
  ['FPM-PM-101',   'Philosophy of Management',         2, 1, 4, 'core',     fac(1)],
  ['FPM-QR-101',   'Quantitative Research Methods',   2, 1, 4, 'core',     fac(2)],
  // EPGDM Courses
  ['EPGDM-LM-101', 'Leadership & Management',         3, 1, 4, 'core',     fac(0)],
  ['EPGDM-SM-101', 'Strategic Management',            3, 1, 4, 'core',     fac(1)],
  ['EPGDM-BF-101', 'Business Finance',                3, 1, 3, 'core',     fac(2)],
  // EMBA Courses
  ['EMBA-GM-101',  'General Management',              4, 1, 4, 'core',     fac(0)],
  ['EMBA-DL-101',  'Digital Leadership',              4, 1, 4, 'core',     fac(1)],
  ['EMBA-CE-101',  'Corporate Excellence',            4, 1, 3, 'elective', fac(2)],
];

newCourses.forEach(([code, name, prog, sem, cred, type, facId]) => {
  const r = insertCourse.run(code, name, prog, sem, cred, type, facId);
  if (r.changes > 0) log(`Added course: ${code} - ${name}`);
});

// ── 4. CURRICULUM MAP ─────────────────────────────────────────────────────────
console.log('\n[4] Building curriculum map...');

const allCourses = db.prepare('SELECT id, program_id, semester FROM courses').all();
const insertCurr = db.prepare(
  `INSERT OR IGNORE INTO curriculum_map (program_id, course_id, semester, is_mandatory, created_at)
   VALUES (?, ?, ?, 1, datetime('now'))`
);
allCourses.forEach(c => {
  const r = insertCurr.run(c.program_id, c.id, c.semester);
  if (r.changes > 0) log(`Curriculum: program ${c.program_id} ← course ${c.id} (sem ${c.semester})`);
});

// ── 5. TIMETABLE ──────────────────────────────────────────────────────────────
console.log('\n[5] Seeding timetable...');

const pgdmCourses = db.prepare('SELECT id, semester FROM courses WHERE program_id=1 ORDER BY semester, id').all();
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const slots = [
  { start: '09:00', end: '10:30' },
  { start: '10:45', end: '12:15' },
  { start: '13:15', end: '14:45' },
  { start: '15:00', end: '16:30' },
];
const rooms = ['101','102','103','201','202'];

const insertTT = db.prepare(
  `INSERT OR IGNORE INTO timetable (course_id, day, start_time, end_time, room, academic_year_id)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// Assign each PGDM course to 3 slots per week (Mon/Wed/Fri or Tue/Thu/Sat)
pgdmCourses.forEach((course, idx) => {
  const daySet = idx % 2 === 0
    ? ['Monday', 'Wednesday', 'Friday']
    : ['Tuesday', 'Thursday', 'Saturday'];
  const slot = slots[idx % slots.length];
  const room = rooms[idx % rooms.length];
  daySet.forEach(day => {
    const r = insertTT.run(course.id, day, slot.start, slot.end, room, 1); // academic_year_id = 1
    if (r.changes > 0) log(`Timetable: course ${course.id} → ${day} ${slot.start}-${slot.end} Room ${room}`);
  });
});

// ── 6. EXAMINATIONS ───────────────────────────────────────────────────────────
console.log('\n[6] Seeding examinations...');

const insertExam = db.prepare(
  `INSERT OR IGNORE INTO examinations (name, exam_type, course_id, academic_year_id, exam_date, start_time, end_time, total_marks, passing_marks, room, created_at)
   VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, datetime('now'))`
);

pgdmCourses.forEach((course, idx) => {
  const offset = idx;
  const ia1Date = `2024-09-${(10 + (idx % 15)).toString().padStart(2,'0')}`;
  const ia2Date = `2024-11-${(5 + (idx % 15)).toString().padStart(2,'0')}`;
  const endDate = `2025-01-${(10 + (idx % 10)).toString().padStart(2,'0')}`;
  const room = rooms[idx % rooms.length];

  [
    ['Internal Assessment 1', 'internal',  ia1Date,  '10:00', '11:30', 25, 10],
    ['Internal Assessment 2', 'internal',  ia2Date,  '10:00', '11:30', 25, 10],
    ['End Semester Exam',     'semester',  endDate,  '10:00', '13:00', 100, 40],
  ].forEach(([name, type, date, start, end, total, pass]) => {
    const r = insertExam.run(name, type, course.id, date, start, end, total, pass, room);
    if (r.changes > 0) log(`Exam: ${name} for course ${course.id} on ${date}`);
  });
});

// ── 7. VENUES ─────────────────────────────────────────────────────────────────
console.log('\n[7] Adding venues...');

const insertVenue = db.prepare(
  `INSERT OR IGNORE INTO venues (name, type, capacity, location, features, is_active, created_by, created_at)
   VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'))`
);

const venues = [
  ['Seminar Hall A',         'seminar_hall',   80,  'Main Block, Ground Floor', 'Projector, AC, Microphone, Whiteboard'],
  ['Seminar Hall B',         'seminar_hall',   80,  'Main Block, 1st Floor',    'Projector, AC, Microphone'],
  ['Conference Room 1',      'conference',     20,  'Admin Block, 2nd Floor',   'Projector, AC, Video Conferencing'],
  ['Conference Room 2',      'conference',     15,  'Admin Block, 3rd Floor',   'TV Screen, AC'],
  ['Auditorium',             'auditorium',     350, 'Main Block, Ground Floor', 'Stage, PA System, Projector, AC'],
  ['Computer Lab 1',         'lab',            40,  'Main Block, 2nd Floor',    '40 Computers, AC, Projector'],
  ['Computer Lab 2',         'lab',            40,  'Main Block, 2nd Floor',    '40 Computers, AC'],
  ['Sports Hall',            'sports',         100, 'Sports Complex',           'Indoor Games, Changing Rooms'],
  ['Canteen Hall',           'dining',         150, 'Ground Floor',             'Air Cooled, Seating'],
  ['Board Room',             'conference',     25,  'Admin Block, 1st Floor',   'Projector, Video Conferencing, AC'],
  ['Classroom 101',          'classroom',      60,  'Main Block, 1st Floor',    'Projector, Whiteboard, AC'],
  ['Classroom 102',          'classroom',      60,  'Main Block, 1st Floor',    'Projector, Whiteboard, AC'],
  ['Classroom 201',          'classroom',      60,  'Main Block, 2nd Floor',    'Projector, Whiteboard, AC'],
  ['Classroom 202',          'classroom',      60,  'Main Block, 2nd Floor',    'Projector, Whiteboard'],
  ['Open Amphitheater',      'outdoor',        200, 'Campus Grounds',           'Open Air, PA System'],
];

venues.forEach(([name, type, cap, loc, feat]) => {
  const r = insertVenue.run(name, type, cap, loc, feat);
  if (r.changes > 0) log(`Venue: ${name} (${type}, cap ${cap})`);
});

// ── 8. MORE LIBRARY BOOKS ─────────────────────────────────────────────────────
console.log('\n[8] Adding library books...');

const libInsert = db.prepare('INSERT OR IGNORE INTO library_books (title, author, isbn, available_copies) VALUES (?, ?, ?, ?)');

const books = [
  ['Corporate Finance', 'Brealey, Myers & Allen', '978-1259917127', 4],
  ['Consumer Behaviour', 'Schiffman & Kanuk', '978-0133560763', 3],
  ['International Marketing', 'Keegan & Green', '978-0133545005', 3],
  ['Supply Chain Management', 'Chopra & Meindl', '978-0133800203', 4],
  ['Business Analytics', 'Winston', '978-1305947542', 5],
  ['Managerial Economics', 'Keat & Young', '978-0131479036', 4],
  ['Mergers & Acquisitions', 'DePamphilis', '978-0128150757', 3],
  ['Entrepreneurship', 'Kuratko', '978-1305576247', 4],
  ['Digital Marketing', 'Chaffey & Ellis-Chadwick', '978-1292241579', 5],
  ['Business Research Methods', 'Bryman & Bell', '978-0199668649', 4],
  ['Leadership', 'Northouse', '978-1506362311', 3],
  ['Corporate Governance', 'Mallin', '978-0198805250', 3],
  ['Project Management', 'PMBOK Guide', '978-1628251845', 2],
  ['Managerial Accounting', 'Garrison & Noreen', '978-1259307416', 4],
  ['Brand Management', 'Keller', '978-0132664257', 4],
  ['Investment Analysis', 'Reilly & Brown', '978-0538482387', 3],
  ['Total Quality Management', 'Oakland', '978-1138424548', 3],
  ['Organizational Design', 'Daft', '978-0324598896', 4],
  ['Services Marketing', 'Zeithaml', '978-0078029073', 3],
  ['Retail Management', 'Berman & Evans', '978-0132724807', 3],
  ['Financial Accounting', 'Horngren', '978-0133768589', 5],
  ['E-Commerce', 'Laudon & Traver', '978-0134784014', 4],
  ['Knowledge Management', 'Dalkir', '978-0262513159', 3],
  ['Cross Cultural Management', 'Browaeys', '978-1292015231', 3],
  ['Sports Management', 'Masteralexis', '978-1284091410', 2],
];

books.forEach(([title, author, isbn, copies]) => {
  const r = libInsert.run(title, author, isbn, copies);
  if (r.changes > 0) log(`Book: ${title}`);
});

// ── 9. ADDITIONAL NOTICES ────────────────────────────────────────────────────
console.log('\n[9] Adding notices if missing...');

const noticeCount = db.prepare('SELECT COUNT(*) as n FROM notices').get().n;
if (noticeCount < 10) {
  const noticeInsert = db.prepare(
    `INSERT INTO notices (title, content, category, is_pinned, target_role, published_by, created_at)
     VALUES (?, ?, ?, ?, 'all', 1, datetime('now', ? || ' days'))`
  );
  const notices = [
    ['Academic Calendar 2024-2026 Released', 'The academic calendar for 2024-2026 batch has been published. Please check the schedule for all key dates, holidays, and exam timelines.', 'academic', 1, '0'],
    ['Internal Assessment 1 Schedule', 'IA1 examinations are scheduled for September 2024. Timetable has been published in the Exam Planner module.', 'exam', 1, '-5'],
    ['Library Hours Extended', 'Library will remain open till 9 PM on all weekdays starting November 2024 for exam preparation.', 'general', 0, '-10'],
    ['Placement Drive — Deloitte', 'Deloitte will be conducting campus placement for PGDM batch 2024-2026. Eligible students must register before the deadline.', 'placement', 1, '-3'],
    ['Fee Payment Reminder — Semester 2', 'Semester 2 fee payment due date is 31st January 2025. Please ensure timely payment to avoid late fee charges.', 'fee', 1, '-7'],
    ['NAAC Peer Team Visit', 'NAAC Peer Team visit is scheduled. All departments must ensure documentation is updated in the Accreditation module.', 'urgent', 1, '-1'],
    ['Convocation Ceremony 2024', 'Annual Convocation Ceremony for the 2022-2024 batch will be held in the main auditorium. All faculty must attend in academic robes.', 'event', 0, '-15'],
    ['Winter Break Schedule', 'Winter break will be observed from December 24 to January 1. Classes resume January 2, 2025.', 'general', 0, '-20'],
    ['FDP Program on AI in Management', 'A Faculty Development Program on Artificial Intelligence applications in Management Education is scheduled for December 2024.', 'academic', 0, '-8'],
    ['Hostel Allotment 2024-25', 'Hostel room allotments for academic year 2024-25 are now available. Students can check their allotment in the Hostel module.', 'general', 0, '-12'],
  ];
  notices.forEach(([title, content, cat, pinned, days]) => {
    noticeInsert.run(title, content, cat, pinned, days);
    log(`Notice: ${title}`);
  });
}

// ── 10. HOSTEL ALLOCATIONS (demo) ─────────────────────────────────────────────
console.log('\n[10] Adding hostel allocations...');

const hostelAllocCols = db.prepare('PRAGMA table_info(hostel_allocations)').all().map(c => c.name);
const allocCount = db.prepare('SELECT COUNT(*) as n FROM hostel_allocations').get().n;
if (allocCount === 0) {
  const rooms = db.prepare('SELECT id FROM hostel_rooms LIMIT 10').all();
  const studentsForHostel = db.prepare('SELECT id FROM students LIMIT 10').all();
  const allocInsert = db.prepare(
    `INSERT OR IGNORE INTO hostel_allocations (student_id, room_id, allotment_date, status)
     VALUES (?, ?, '2024-07-15', 'active')`
  );
  studentsForHostel.slice(0, rooms.length).forEach((s, i) => {
    try {
      const r = allocInsert.run(s.id, rooms[i].id);
      if (r.changes > 0) log(`Hostel: student ${s.id} → room ${rooms[i].id}`);
    } catch(e) { /* skip if schema mismatch */ }
  });
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════');
console.log(`✅ Done. ${fixed} items fixed/seeded.`);
console.log('════════════════════════════════════════════════');
console.log('\n📋 New Login Credentials:');
console.log('  HOD        → username: hod        | password: Hod@msrim1');
console.log('  Registrar  → username: registrar  | password: Reg@msrim1');
console.log('  Librarian  → username: librarian  | password: Lib@msrim1');
console.log('  Placement  → username: placement  | password: Place@msrim1');
console.log('  Parent     → username: parent1    | password: Parent@msrim1');
console.log('\n  Admin      → username: systemsupport@msrim.org | password: support@2026');
console.log('  Accounts   → username: accounts   | password: Acc@123');
console.log('════════════════════════════════════════════════\n');
