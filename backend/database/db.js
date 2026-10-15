const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname);
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const DB_PATH = path.join(DB_DIR, 'msrim_erp.db');
const db = new DatabaseSync(DB_PATH);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Thin compatibility wrapper: mimic better-sqlite3's .run() returning integer lastInsertRowid
const _run = db.prepare.bind(db);
const _origPrepare = db.prepare.bind(db);
db.prepare = function(sql) {
  const stmt = _origPrepare(sql);
  const origRun = stmt.run.bind(stmt);
  stmt.run = function(...args) {
    const result = origRun(...args);
    return { changes: Number(result.changes), lastInsertRowid: Number(result.lastInsertRowid) };
  };
  return stmt;
};

db.transaction = function(fn) {
  return function(...args) {
    db.exec('BEGIN');
    try { const r = fn(...args); db.exec('COMMIT'); return r; }
    catch(e) { db.exec('ROLLBACK'); throw e; }
  };
};

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','faculty','student','hod','registrar','librarian','accounts','placement','parent')),
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      department TEXT,
      profile_photo TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      last_login TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      hod_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      duration_years INTEGER DEFAULT 2,
      department_id INTEGER REFERENCES departments(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS academic_years (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      is_current INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      enrollment_number TEXT UNIQUE NOT NULL,
      program_id INTEGER REFERENCES programs(id),
      semester INTEGER DEFAULT 1,
      batch_year INTEGER,
      section TEXT,
      roll_number TEXT,
      dob TEXT,
      gender TEXT,
      blood_group TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      pin TEXT,
      guardian_name TEXT,
      guardian_phone TEXT,
      guardian_relation TEXT,
      category TEXT DEFAULT 'General',
      admission_date TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','graduated','dropped')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      employee_id TEXT UNIQUE NOT NULL,
      department_id INTEGER REFERENCES departments(id),
      designation TEXT,
      qualification TEXT,
      specialization TEXT,
      experience_years INTEGER DEFAULT 0,
      joining_date TEXT,
      employment_type TEXT DEFAULT 'full-time',
      salary REAL DEFAULT 0,
      bank_account TEXT,
      ifsc_code TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      program_id INTEGER REFERENCES programs(id),
      semester INTEGER NOT NULL,
      credits INTEGER DEFAULT 3,
      type TEXT DEFAULT 'core' CHECK(type IN ('core','elective','lab','project')),
      faculty_id INTEGER REFERENCES faculty(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      max_students INTEGER DEFAULT 60,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      day TEXT NOT NULL CHECK(day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      room TEXT,
      academic_year_id INTEGER REFERENCES academic_years(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      course_id INTEGER REFERENCES courses(id),
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('present','absent','late','excused')),
      marked_by INTEGER REFERENCES users(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, course_id, date)
    );

    CREATE TABLE IF NOT EXISTS examinations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exam_type TEXT NOT NULL CHECK(exam_type IN ('midterm','endterm','internal','practical','assignment')),
      course_id INTEGER REFERENCES courses(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      exam_date TEXT,
      start_time TEXT,
      end_time TEXT,
      total_marks INTEGER DEFAULT 100,
      passing_marks INTEGER DEFAULT 40,
      room TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      examination_id INTEGER REFERENCES examinations(id),
      marks_obtained REAL,
      grade TEXT,
      remarks TEXT,
      entered_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, examination_id)
    );

    CREATE TABLE IF NOT EXISTS fee_structures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER REFERENCES programs(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      fee_type TEXT NOT NULL,
      amount REAL NOT NULL,
      due_date TEXT,
      semester INTEGER
    );

    CREATE TABLE IF NOT EXISTS fee_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      fee_structure_id INTEGER REFERENCES fee_structures(id),
      amount_paid REAL NOT NULL,
      payment_date TEXT DEFAULT (date('now')),
      payment_mode TEXT DEFAULT 'online' CHECK(payment_mode IN ('cash','online','dd','cheque')),
      transaction_id TEXT,
      receipt_number TEXT UNIQUE,
      status TEXT DEFAULT 'paid' CHECK(status IN ('paid','pending','partial','refunded')),
      collected_by INTEGER REFERENCES users(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS library_books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      isbn TEXT UNIQUE,
      title TEXT NOT NULL,
      author TEXT,
      publisher TEXT,
      year INTEGER,
      category TEXT,
      total_copies INTEGER DEFAULT 1,
      available_copies INTEGER DEFAULT 1,
      location TEXT,
      price REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS library_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER REFERENCES library_books(id),
      user_id INTEGER REFERENCES users(id),
      issue_date TEXT DEFAULT (date('now')),
      due_date TEXT,
      return_date TEXT,
      fine_amount REAL DEFAULT 0,
      fine_paid INTEGER DEFAULT 0,
      status TEXT DEFAULT 'issued' CHECK(status IN ('issued','returned','overdue','lost')),
      issued_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS placements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      job_role TEXT NOT NULL,
      package_lpa REAL,
      drive_date TEXT,
      last_apply_date TEXT,
      description TEXT,
      requirements TEXT,
      location TEXT,
      type TEXT DEFAULT 'campus' CHECK(type IN ('campus','off-campus','internship')),
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming','ongoing','completed','cancelled')),
      hr_contact TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS placement_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      placement_id INTEGER REFERENCES placements(id),
      student_id INTEGER REFERENCES students(id),
      applied_date TEXT DEFAULT (date('now')),
      status TEXT DEFAULT 'applied' CHECK(status IN ('applied','shortlisted','selected','rejected','on_hold')),
      remarks TEXT,
      UNIQUE(placement_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general' CHECK(category IN ('general','academic','exam','placement','fee','event','urgent')),
      target_role TEXT DEFAULT 'all',
      published_by INTEGER REFERENCES users(id),
      is_pinned INTEGER DEFAULT 0,
      attachment TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS hostel_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      block TEXT,
      floor INTEGER,
      capacity INTEGER DEFAULT 2,
      occupied INTEGER DEFAULT 0,
      type TEXT DEFAULT 'double' CHECK(type IN ('single','double','triple')),
      monthly_rent REAL DEFAULT 0,
      amenities TEXT
    );

    CREATE TABLE IF NOT EXISTS leave_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      max_days_per_year INTEGER DEFAULT 0,
      is_paid INTEGER DEFAULT 1,
      requires_approval INTEGER DEFAULT 1,
      applicable_to TEXT DEFAULT 'all',
      carry_forward INTEGER DEFAULT 0,
      max_carry_forward INTEGER DEFAULT 0,
      color TEXT DEFAULT '#3b82f6',
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
      year INTEGER NOT NULL,
      total_days INTEGER DEFAULT 0,
      used_days REAL DEFAULT 0,
      pending_days REAL DEFAULT 0,
      carried_forward REAL DEFAULT 0,
      encashed_days REAL DEFAULT 0,
      UNIQUE(user_id, leave_type_id, year)
    );

    CREATE TABLE IF NOT EXISTS holiday_calendar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      date TEXT NOT NULL UNIQUE,
      type TEXT DEFAULT 'public' CHECK(type IN ('public','restricted','optional','institutional')),
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS leave_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      leave_type TEXT NOT NULL,
      from_date TEXT NOT NULL,
      to_date TEXT NOT NULL,
      days REAL DEFAULT 1,
      reason TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
      approved_by INTEGER REFERENCES users(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date TEXT NOT NULL,
      end_date TEXT,
      venue TEXT,
      category TEXT DEFAULT 'academic',
      organizer TEXT,
      image TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  seedData();
}

function seedData() {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (adminExists) return;

  const hash = (pwd) => bcrypt.hashSync(pwd, 10);

  db.exec("INSERT OR IGNORE INTO departments (name, code) VALUES ('Management Studies', 'MGT')");
  db.exec("INSERT OR IGNORE INTO departments (name, code) VALUES ('Information Technology', 'IT')");
  db.exec("INSERT OR IGNORE INTO departments (name, code) VALUES ('Human Resources', 'HR')");

  db.exec("INSERT OR IGNORE INTO programs (name, code, duration_years, department_id) VALUES ('Post Graduate Diploma in Management', 'PGDM', 2, 1)");
  db.exec("INSERT OR IGNORE INTO programs (name, code, duration_years, department_id) VALUES ('Fellow Programme in Management', 'FPM', 3, 1)");
  db.exec("INSERT OR IGNORE INTO programs (name, code, duration_years, department_id) VALUES ('Executive PGDM', 'EPGDM', 1, 1)");

  db.exec("INSERT OR IGNORE INTO academic_years (name, start_date, end_date, is_current) VALUES ('2024-2026', '2024-07-01', '2026-06-30', 1)");
  db.exec("INSERT OR IGNORE INTO academic_years (name, start_date, end_date, is_current) VALUES ('2025-2027', '2025-07-01', '2027-06-30', 0)");

  const insertUser = db.prepare(`INSERT OR IGNORE INTO users (username, password, role, name, email, phone, department) VALUES (?, ?, ?, ?, ?, ?, ?)`);

  insertUser.run('admin', hash('Admin@123'), 'admin', 'System Administrator', 'admin@msrim.in', '9900000001', 'Administration');
  insertUser.run('registrar', hash('Reg@123'), 'registrar', 'Dr. Rajesh Kumar', 'registrar@msrim.in', '9900000002', 'Administration');
  insertUser.run('hod.mgt', hash('Hod@123'), 'hod', 'Dr. Priya Sharma', 'hod.mgt@msrim.in', '9900000003', 'Management Studies');
  insertUser.run('librarian', hash('Lib@123'), 'librarian', 'Mrs. Sunita Rao', 'librarian@msrim.in', '9900000004', 'Library');
  insertUser.run('accounts', hash('Acc@123'), 'accounts', 'Mr. Suresh Nair', 'accounts@msrim.in', '9900000005', 'Accounts');
  insertUser.run('placement', hash('Plc@123'), 'placement', 'Mr. Anand Krishnan', 'placement@msrim.in', '9900000006', 'Placement Cell');

  insertUser.run('faculty1', hash('Fac@123'), 'faculty', 'Dr. Meera Iyer', 'meera.iyer@msrim.in', '9900000010', 'Management Studies');
  insertUser.run('faculty2', hash('Fac@123'), 'faculty', 'Prof. Ravi Shankar', 'ravi.s@msrim.in', '9900000011', 'Management Studies');
  insertUser.run('faculty3', hash('Fac@123'), 'faculty', 'Dr. Kavitha Murthy', 'kavitha.m@msrim.in', '9900000012', 'Management Studies');
  insertUser.run('faculty4', hash('Fac@123'), 'faculty', 'Prof. Sunil Verma', 'sunil.v@msrim.in', '9900000013', 'Management Studies');

  const stuData = [
    ['student1', 'Aditya Sharma', 'aditya.s@student.msrim.in', '9900001001'],
    ['student2', 'Priya Patel', 'priya.p@student.msrim.in', '9900001002'],
    ['student3', 'Rahul Gupta', 'rahul.g@student.msrim.in', '9900001003'],
    ['student4', 'Sneha Reddy', 'sneha.r@student.msrim.in', '9900001004'],
    ['student5', 'Vikram Singh', 'vikram.s@student.msrim.in', '9900001005'],
    ['student6', 'Ananya Kumar', 'ananya.k@student.msrim.in', '9900001006'],
    ['student7', 'Karthik Nair', 'karthik.n@student.msrim.in', '9900001007'],
    ['student8', 'Deepika Joshi', 'deepika.j@student.msrim.in', '9900001008'],
    ['student9', 'Rohit Mehta', 'rohit.m@student.msrim.in', '9900001009'],
    ['student10', 'Shreya Das', 'shreya.d@student.msrim.in', '9900001010'],
  ];
  stuData.forEach(([u, n, e, ph]) => insertUser.run(u, hash('Stu@123'), 'student', n, e, ph, 'Management Studies'));

  const insertFaculty = db.prepare('INSERT OR IGNORE INTO faculty (user_id, employee_id, department_id, designation, qualification, experience_years, joining_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [['faculty1','MSR-FAC-001','Associate Professor','PhD Finance',12,'2012-07-01'],
   ['faculty2','MSR-FAC-002','Professor','PhD Marketing',18,'2006-07-01'],
   ['faculty3','MSR-FAC-003','Assistant Professor','MBA, PhD',7,'2017-07-01'],
   ['faculty4','MSR-FAC-004','Associate Professor','PhD HR',15,'2009-07-01']].forEach(([un,eid,desig,qual,exp,jd]) => {
    const u = db.prepare('SELECT id FROM users WHERE username = ?').get(un);
    if (u) insertFaculty.run(u.id, eid, 1, desig, qual, exp, jd);
  });

  const genders = ['Male','Female','Male','Female','Male','Female','Male','Female','Male','Female'];
  const insertStudent = db.prepare('INSERT OR IGNORE INTO students (user_id, enrollment_number, program_id, semester, batch_year, section, roll_number, dob, gender, admission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stuData.forEach(([u], i) => {
    const usr = db.prepare('SELECT id FROM users WHERE username = ?').get(u);
    if (usr) insertStudent.run(usr.id, `MSRIM-PGDM-24-${String(i+1).padStart(3,'0')}`, 1, i < 5 ? 1 : 2, 2024, i < 5 ? 'A' : 'B', `PGDM-A-${String(i+1).padStart(2,'0')}`, `200${i+1}-01-15`, genders[i], '2024-07-15');
  });

  const insertCourse = db.prepare('INSERT OR IGNORE INTO courses (code, name, program_id, semester, credits, type, faculty_id, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const getFacId = (eid) => { const f = db.prepare('SELECT id FROM faculty WHERE employee_id = ?').get(eid); return f?.id || 1; };
  [['PGDM-FM-101','Financial Management',1,1,4,'core','MSR-FAC-001'],
   ['PGDM-MM-101','Marketing Management',1,1,4,'core','MSR-FAC-002'],
   ['PGDM-OB-101','Organizational Behaviour',1,1,3,'core','MSR-FAC-003'],
   ['PGDM-HRM-101','Human Resource Management',1,1,3,'core','MSR-FAC-004'],
   ['PGDM-QM-101','Quantitative Methods',1,1,3,'core','MSR-FAC-001'],
   ['PGDM-BE-101','Business Economics',1,1,3,'core','MSR-FAC-002'],
   ['PGDM-SM-201','Strategic Management',1,2,4,'core','MSR-FAC-002'],
   ['PGDM-OM-201','Operations Management',1,2,4,'core','MSR-FAC-003']].forEach(([code,name,prog,sem,cred,type,eid]) => {
    insertCourse.run(code, name, prog, sem, cred, type, getFacId(eid), 1);
  });

  const adminId = db.prepare('SELECT id FROM users WHERE username = ?').get('admin').id;
  const stuRecords = db.prepare('SELECT id FROM students').all();
  const courseRecords = db.prepare('SELECT id FROM courses WHERE semester = 1').all();
  const insertAtt = db.prepare('INSERT OR IGNORE INTO attendance (student_id, course_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?)');
  const dates = ['2024-07-15','2024-07-16','2024-07-17','2024-07-18','2024-07-19','2024-07-22','2024-07-23','2024-07-24','2024-07-25','2024-07-26'];
  stuRecords.forEach(stu => {
    courseRecords.forEach(course => {
      dates.forEach(date => {
        insertAtt.run(stu.id, course.id, date, Math.random() > 0.15 ? 'present' : 'absent', adminId);
      });
    });
  });

  const insertNotice = db.prepare('INSERT INTO notices (title, content, category, published_by, is_pinned) VALUES (?, ?, ?, ?, ?)');
  [['Welcome to MSRIM Digital Campus 2024-26 Batch','Welcome to the new academic year! All students are requested to complete their profile on the portal within 3 days.','general',1],
   ['Mid-Term Examination Schedule','Mid-term examinations for Semester 1 are scheduled from August 12-18, 2024. Detailed timetable is available in the Examinations module.','exam',1],
   ['Campus Placement Drive - Deloitte','Deloitte will be visiting campus on August 25, 2024 for management consulting roles. Package: 12-18 LPA. Register in the Placement module.','placement',0],
   ['Fee Payment Reminder - Semester 1','Last date for Semester 1 fee payment is July 31, 2024. Students with pending fees will not be allowed to appear for mid-term examinations.','fee',1],
   ['Library Orientation Program','A library orientation program is scheduled for July 20, 2024 at 10:00 AM in the Library Hall. Attendance is mandatory for all first-year students.','general',0],
   ['Leadership Conclave 2024','MSRIM Leadership Conclave 2024 will be held on August 30, 2024. Distinguished industry leaders will share insights on the future of management.','event',0]
  ].forEach(([t,c,cat,pin]) => insertNotice.run(t, c, cat, adminId, pin));

  const insertFeeStr = db.prepare('INSERT INTO fee_structures (program_id, academic_year_id, fee_type, amount, due_date, semester) VALUES (?, ?, ?, ?, ?, ?)');
  [[1,1,'Tuition Fee',125000,'2024-07-31',1],[1,1,'Library Fee',5000,'2024-07-31',1],
   [1,1,'Examination Fee',3000,'2024-07-31',1],[1,1,'Activity Fee',7000,'2024-07-31',1],
   [1,1,'Tuition Fee',125000,'2025-01-31',2]].forEach(args => insertFeeStr.run(...args));

  const insertBook = db.prepare('INSERT INTO library_books (isbn, title, author, publisher, year, category, total_copies, available_copies, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  [['978-0134236735','Principles of Management','Robbins & Coulter','Pearson',2018,'Management',5,3,850],
   ['978-0071086929','Financial Management','Prasanna Chandra','McGraw Hill',2019,'Finance',8,5,750],
   ['978-0071341929','Marketing Management','Philip Kotler','Pearson',2020,'Marketing',6,4,950],
   ['978-0132545709','Human Resource Management','Gary Dessler','Pearson',2017,'HR',4,2,800],
   ['978-8120351738','Operations Management','Chase, Aquilano','McGraw Hill',2018,'Operations',5,5,700],
   ['978-0070634503','Strategic Management','Thompson & Strickland','McGraw Hill',2019,'Strategy',4,3,890],
   ['978-0199672073','Business Economics','Dominick Salvatore','Oxford',2020,'Economics',6,4,650],
   ['978-8120340947','Organizational Behaviour','Stephen Robbins','PHI',2019,'Management',5,3,720]
  ].forEach(args => insertBook.run(...args));

  const insertPlc = db.prepare('INSERT INTO placements (company_name, job_role, package_lpa, drive_date, last_apply_date, description, location, type, status, hr_contact, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  [['Deloitte','Management Consultant',15,'2024-08-25','2024-08-20','Deloitte is hiring management consultants for their Bangalore office.','Bangalore','campus','upcoming','hr@deloitte.com'],
   ['KPMG India','Business Analyst',12,'2024-09-05','2024-09-01','KPMG is looking for sharp MBA graduates for their advisory practice.','Mumbai','campus','upcoming','careers@kpmg.in'],
   ['Amazon India','Operations Manager',18,'2024-08-30','2024-08-25','Amazon is hiring operations managers for their fulfillment centers.','Multiple','campus','upcoming','amazon.hiring@amazon.in'],
   ['Infosys BPM','Process Analyst',8,'2024-07-20','2024-07-18','Infosys BPM hiring process analysts for various domains.','Bangalore','campus','completed','careers@infosysbpm.com'],
   ['Wipro Technologies','Business Development',10,'2024-09-15','2024-09-10','Wipro hiring for business development roles.','Bangalore','campus','upcoming','hr@wipro.com']
  ].forEach(([cn,jr,pkg,dd,lad,desc,loc,type,stat,hr]) => insertPlc.run(cn,jr,pkg,dd,lad,desc,loc,type,stat,hr,adminId));

  const insertPay = db.prepare('INSERT INTO fee_payments (student_id, fee_structure_id, amount_paid, payment_date, payment_mode, transaction_id, receipt_number, status, collected_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stuRecords.slice(0, 7).forEach((stu, i) => {
    insertPay.run(stu.id, 1, 125000, '2024-07-20', 'online', `TXN${Date.now()}${i}`, `MSRIM-RCPT-2024-${String(i+1).padStart(4,'0')}`, 'paid', adminId);
  });

  console.log('MSRIM Digital Campus database initialized with seed data.');
}

module.exports = { db, initializeDatabase };
