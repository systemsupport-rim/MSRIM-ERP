const { db } = require('./db');

function extendDatabase() {
  // Migration: add designation, gender, joining_date columns to users table
  const userCols = db.prepare("PRAGMA table_info(users)").all();
  if (!userCols.some(c => c.name === 'designation')) {
    db.exec("ALTER TABLE users ADD COLUMN designation TEXT");
    console.log('Migrated users table: added designation column.');
  }
  if (!userCols.some(c => c.name === 'gender')) {
    db.exec("ALTER TABLE users ADD COLUMN gender TEXT");
    console.log('Migrated users table: added gender column.');
  }
  if (!userCols.some(c => c.name === 'joining_date')) {
    db.exec("ALTER TABLE users ADD COLUMN joining_date TEXT");
    console.log('Migrated users table: added joining_date column.');
  }
  if (!userCols.some(c => c.name === 'employee_id')) {
    db.exec("ALTER TABLE users ADD COLUMN employee_id TEXT");
    console.log('Migrated users table: added employee_id column.');
  }

  // Seed/sync staff data from official MSRIM faculty & staff list
  {
    const staffData = [
      { email:'shashidhar@msrim.org',     name:'Achakkagari Shashidhar',       phone:'9948574929',  department:'Business Analytics & Data Science',    designation:'Assistant Professor',                       employee_id:'T83',   gender:'male',   joining_date:'2026-09-07' },
      { email:'ajaypagare@msrim.org',     name:'Ajay Pagare',                  phone:'7583055777',  department:'Operations & Supply Chain Mgmt',        designation:'Associate Professor',                       employee_id:'T81',   gender:'male',   joining_date:'2026-08-01' },
      { email:'ajit.paul@digitali2o.com', name:'Ajit Paul',                    phone:'9987590134',  department:'HR & General Management',               designation:null,                                        employee_id:'VF504', gender:'male',   joining_date:'2026-02-10' },
      { email:'akshatha@msrim.org',       name:'Akshatha M K',                 phone:'9886051203',  department:'Administration',                        designation:'Executive Assistant',                       employee_id:'202',   gender:'female', joining_date:'2024-08-01' },
      { email:'anitas@msrim.org',         name:'Anita Singh',                  phone:'8217844013',  department:'HR & General Management',               designation:'Chairperson and Associate Professor',       employee_id:'49',    gender:'female', joining_date:'2006-07-24' },
      { email:'anjana@msrim.org',         name:'Anjana Seshagiri',             phone:'9449837370',  department:'International Affairs',                 designation:'Head - Ramaiah Japan Center',               employee_id:'82',    gender:'female', joining_date:'2021-01-18' },
      { email:'anjani@msrim.org',         name:'Anjani',                       phone:'9611830348',  department:'Administration',                        designation:'Watchman',                                  employee_id:'112',   gender:'male',   joining_date:'1995-10-01' },
      { email:'aravindar@msrim.org',      name:'Aravinda Reddy M.N',           phone:'7337780557',  department:'Business Analytics & Data Science',     designation:'Chairperson and Associate Professor',       employee_id:'23',    gender:'male',   joining_date:'2012-04-26' },
      { email:'aruljyothi@msrim.org',     name:'Arul Jyothi',                  phone:'9964664774',  department:'Marketing & International Business',    designation:'Senior Assistant Professor',                employee_id:'34',    gender:'female', joining_date:'2015-07-10' },
      { email:'aruna@msrim.org',          name:'Aruna M',                      phone:'9886517316',  department:'Library',                               designation:'Library Assistant',                         employee_id:'179',   gender:'female', joining_date:'2003-07-30' },
      { email:'arunprasad@msrim.org',     name:'Aruna S',                      phone:'9901322154',  department:'Administration',                        designation:'Office Assistant - Admin',                  employee_id:'126',   gender:'male',   joining_date:'2012-01-02' },
      { email:'arunamk@msrim.org',        name:'Aruna Mohan Kumar',            phone:'8951801149',  department:'Accounts Department',                   designation:'Office Assistant - Accounts',               employee_id:'153',   gender:'female', joining_date:'2011-12-15' },
      { email:'bhanumathi@msrim.org',     name:'Bhanumathi P.',                phone:'8050886607',  department:'Examination Department',                designation:'Chief of Examination',                      employee_id:'31',    gender:'female', joining_date:'2013-12-12' },
      { email:'bharath@msrim.org',        name:'Bharath Kumar S A',            phone:'9980070323',  department:'Accounts Department',                   designation:'Manager - Accounts & Administration',       employee_id:'151',   gender:'male',   joining_date:'2006-01-03' },
      { email:'bhavanesh@msrim.org',      name:'Bhavanesh Kumar B',            phone:'6363775784',  department:'Administration',                        designation:'Digital Marketing Executive',               employee_id:'201',   gender:'male',   joining_date:'2026-06-15' },
      { email:'bikash@msrim.org',         name:'Bikash Ranjan Debata',         phone:'7022118841',  department:'Marketing & International Business',    designation:'Professor',                                 employee_id:'74',    gender:'male',   joining_date:'2024-09-14' },
      { email:'chandan@msrim.org',        name:'Chandan K.N',                  phone:'9980488388',  department:'Admissions Department',                 designation:null,                                        employee_id:'149',   gender:'male',   joining_date:'2024-06-19' },
      { email:'deepak@msrim.org',         name:'Deepak S',                     phone:'9945041396',  department:'Examination Department',                designation:'Assistant Registrar',                       employee_id:'162',   gender:'male',   joining_date:'2001-10-01' },
      { email:'ektayadav@msrim.org',      name:'Ekta Yadav',                   phone:'8787288287',  department:'Finance, Banking & Insurance',          designation:'Assistant Professor',                       employee_id:'78',    gender:'female', joining_date:'2025-10-06' },
      { email:'vijaykumar@msrim.org',     name:'G R Vijaya kumar',             phone:'9945091913',  department:'Examination Department',                designation:'Attender - Evaluation',                     employee_id:'116',   gender:'male',   joining_date:'2003-05-01' },
      { email:'garimapande85@gmail.com',  name:'Garima Pande',                 phone:'8111840840',  department:'HR & General Management',               designation:null,                                        employee_id:'VF505', gender:'female', joining_date:'2026-02-10' },
      { email:'geetharajaram@msrim.org',  name:'Geetha M Rajaram',             phone:'9448310254',  department:'Administration',                        designation:'Professor and Dean',                        employee_id:'T80',   gender:'female', joining_date:'2026-04-01' },
      { email:'gifty@msrim.org',          name:'Gifty Malhotra',               phone:'8283823675',  department:'Business Analytics & Data Science',     designation:'Assistant Professor',                       employee_id:'59',    gender:'female', joining_date:'2023-02-01' },
      { email:'janardhan@msrim.org',      name:'Janaradhan Rao A N',           phone:'9880021875',  department:'Library',                               designation:'Librarian',                                 employee_id:'176',   gender:'male',   joining_date:'1999-02-15' },
      { email:'jeevitha@msrim.org',       name:'Jeevitha .R',                  phone:'9916089980',  department:'Placements & Corporate Relations',      designation:'Head Placements & Corporate Relations',     employee_id:'32',    gender:'female', joining_date:'2013-12-30' },
      { email:'kiran@msrim.org',          name:'Kiran B M',                    phone:'9886061740',  department:'IT Department',                         designation:'Computer Lab Assistant',                    employee_id:'187',   gender:'male',   joining_date:'2006-10-12' },
      { email:'kirankumarkv@msrim.org',   name:'Kiran Kumar K V',              phone:'7019483913',  department:'Finance, Banking & Insurance',          designation:'Adjunct Faculty',                           employee_id:'93',    gender:'male',   joining_date:'2024-01-01' },
      { email:'kirronbindu@msrim.org',    name:'Kirron Bindu',                 phone:'9742051567',  department:'Finance, Banking & Insurance',          designation:'Adjunct Faculty',                           employee_id:'80',    gender:'male',   joining_date:'2021-01-05' },
      { email:'kumuda@msrim.org',         name:'Kumuda P.R',                   phone:'9342299766',  department:'Finance, Banking & Insurance',          designation:'Associate Professor',                       employee_id:'20',    gender:'female', joining_date:'2011-02-07' },
      { email:'lakshman@msrim.org',       name:'Lakshman R P',                 phone:'9916065717',  department:'Administration',                        designation:'Sweeper',                                   employee_id:'115',   gender:'male',   joining_date:'1999-10-01' },
      { email:'mahadeva@msrim.org',       name:'Mahadeva S',                   phone:'9880587672',  department:'Administration',                        designation:'Driver',                                    employee_id:'119',   gender:'male',   joining_date:'2009-04-01' },
      { email:'mallieswari@msrim.org',    name:'Mallieswari .R',               phone:'9886684746',  department:'Business Analytics & Data Science',     designation:'Assistant Professor',                       employee_id:'24',    gender:'female', joining_date:'2012-07-05' },
      { email:'meghna@msrim.org',         name:'Meghna Verma',                 phone:'9845888372',  department:'Marketing & International Business',    designation:'Associate Professor',                       employee_id:'10',    gender:'female', joining_date:'2011-09-02' },
      { email:'mohans@msrim.org',         name:'Mohan S',                      phone:'9739677768',  department:'Administration',                        designation:'Sweeper',                                   employee_id:'113',   gender:'male',   joining_date:'1995-08-01' },
      { email:'mohan@msrim.org',          name:'Mohan Kumar B',                phone:'9980950028',  department:'Administration',                        designation:'Security Officer',                          employee_id:'117',   gender:'male',   joining_date:'2004-09-15' },
      { email:'connect@shadowandsun.app', name:'NEERAJ KUMAR',                 phone:'7892731362',  department:'HR & General Management',               designation:null,                                        employee_id:'VF507', gender:'male',   joining_date:'2026-09-17' },
      { email:'neeraja@msrim.org',        name:'Neeraja B',                    phone:'9980081483',  department:'Admissions Department',                 designation:null,                                        employee_id:'165',   gender:'female', joining_date:'2012-10-03' },
      { email:'nethravathi@msrim.org',    name:'NETHRAVATHI V',                phone:'8618453349',  department:'Administration',                        designation:'Site Engineer',                             employee_id:'NT150', gender:'female', joining_date:'2026-06-01' },
      { email:'niharika@msrim.org',       name:'Niharika Mishra',              phone:'9844401333',  department:'Marketing & International Business',    designation:'Chairperson and Senior Assistant Professor',employee_id:'30',    gender:'female', joining_date:'2013-11-29' },
      { email:'padmaja@msrim.org',        name:'Padmaja V',                    phone:'9972599100',  department:'HR & General Management',               designation:'Professor',                                 employee_id:'13',    gender:'female', joining_date:'2009-10-21' },
      { email:'padmakshi@msrim.org',      name:'Padmaskhi Lokesh',             phone:'9986000166',  department:'Administration',                        designation:null,                                        employee_id:'98',    gender:'female', joining_date:'2026-01-01' },
      { email:'parameshwara@msrim.org',   name:'Parameshwara P',               phone:'9945938845',  department:'Placements & Corporate Relations',      designation:'Head Placements & Corporate Relations',     employee_id:'195',   gender:'male',   joining_date:'2026-08-10' },
      { email:'parvathi@msrim.org',       name:'Parvathi .',                   phone:'9880946770',  department:'Administration',                        designation:'Office Assistant - Admin',                  employee_id:'152',   gender:'female', joining_date:'2009-05-07' },
      { email:'piyalideb@msrim.org',      name:'Piyali Deb',                   phone:'8337000333',  department:'Admissions Department',                 designation:'Head Admissions',                           employee_id:'147',   gender:'female', joining_date:'2025-05-02' },
      { email:'pp4663510@gmail.com',      name:'Prakash',                      phone:'9986162577',  department:'Administration',                        designation:'Driver',                                    employee_id:'121',   gender:'male',   joining_date:'2010-10-13' },
      { email:'prakash@msrim.org',        name:'Prakash M',                    phone:'7795769881',  department:'Administration',                        designation:'Sweeper',                                   employee_id:'114',   gender:'male',   joining_date:'1995-10-05' },
      { email:'prreeyashetty@msrim.org',  name:'Prreeya Shetty',               phone:'9900090112',  department:'Placements & Corporate Relations',      designation:'Placements – Senior Executive',        employee_id:'194',   gender:'female', joining_date:'2025-01-20' },
      { email:'raghavendra@lawnest.in',   name:'Raghavendra S',                phone:'9686777322',  department:'HR & General Management',               designation:null,                                        employee_id:'VF506', gender:'male',   joining_date:'2026-09-04' },
      { email:'raghavendra@msrim.org',    name:'Raghavendra R K',              phone:'9980730570',  department:'Administration',                        designation:'Manager Admin',                             employee_id:'102',   gender:'male',   joining_date:'2004-05-10' },
      { email:'rajashekhar@msrim.org',    name:'Rajashekhar C',                phone:'9611799689',  department:'Administration',                        designation:'Driver',                                    employee_id:'139',   gender:'male',   joining_date:'2023-07-03' },
      { email:'rakesh@msrim.org',         name:'Rakesh S P',                   phone:'9535085883',  department:'Examination Department',                designation:'Computer Lab Assistant',                    employee_id:'189',   gender:'male',   joining_date:'2012-09-15' },
      { email:'ramesh@msrim.org',         name:'Ramesh M',                     phone:'9740471675',  department:'Library',                               designation:'Attender Library',                          employee_id:'118',   gender:'male',   joining_date:'1998-05-01' },
      { email:'ranjitha@msrim.org',       name:'Ranjitha Bharadwaj',           phone:'9449281498',  department:'Admissions Department',                 designation:'Admissions Counselor',                      employee_id:'148',   gender:'female', joining_date:'2025-09-22' },
      { email:'ravindra@msrim.org',       name:'Ravindra B N',                 phone:'8147905896',  department:'Placements & Corporate Relations',      designation:'Placement Executive',                       employee_id:'174',   gender:'male',   joining_date:'2015-10-01' },
      { email:'reenaya@msrim.org',        name:'Reena Y A',                    phone:'9845415350',  department:'Operations & Supply Chain Mgmt',        designation:'Assistant Professor',                       employee_id:'79',    gender:'female', joining_date:'2025-11-10' },
      { email:'rray@msrim.org',           name:'Ribhu Ray',                    phone:'9903759108',  department:'Operations & Supply Chain Mgmt',        designation:'Assistant Professor',                       employee_id:'73',    gender:'male',   joining_date:'2024-08-20' },
      { email:'sadafanwar@msrim.org',     name:'Sadaf Anwar',                  phone:'9971986453',  department:'Finance, Banking & Insurance',          designation:'Associate Professor',                       employee_id:'57',    gender:'female', joining_date:'2022-12-16' },
      { email:'sagar.m@msrim.org',        name:'Sagar M',                      phone:'9164754075',  department:'Finance, Banking & Insurance',          designation:'Associate Professor',                       employee_id:'76',    gender:'male',   joining_date:'2025-06-10' },
      { email:'sailakshmi@msrim.org',     name:'Sai Lakshmi C',                phone:'9741666225',  department:'Administration',                        designation:'Receptionist',                              employee_id:'106',   gender:'female', joining_date:'2005-09-08' },
      { email:'sathish@msrim.org',        name:'Sathish KN',                   phone:'9986527327',  department:'Library',                               designation:'Assistant Librarian',                       employee_id:'181',   gender:'male',   joining_date:'2013-07-23' },
      { email:'savitha@msrim.org',        name:'Savitha V',                    phone:'7338296007',  department:'Administration',                        designation:null,                                        employee_id:'124',   gender:'female', joining_date:'2004-08-02' },
      { email:'shivaprakash@msrim.org',   name:'Shiva Prakash G E',            phone:'9880238589',  department:'Examination Department',                designation:'Office Assistant - Evaluation',             employee_id:'123',   gender:'male',   joining_date:'2003-07-30' },
      { email:'suma@msrim.org',           name:'Suma N',                       phone:'9731128489',  department:'Admissions Department',                 designation:'Admission Co-Ordinator',                    employee_id:'137',   gender:'female', joining_date:'2022-02-28' },
      { email:'sushma@msrim.org',         name:'Sushma Vasanth',               phone:'9945344552',  department:'Accounts Department',                   designation:'Office Assistant - Accounts',               employee_id:'155',   gender:'female', joining_date:'2013-06-21' },
      { email:'triveni@msrim.org',        name:'Triveni P',                    phone:'9845090480',  department:'Finance, Banking & Insurance',          designation:'Chairperson & Professor',                   employee_id:'19',    gender:'female', joining_date:'2011-02-07' },
      { email:'yashaswini@msrim.org',     name:'Yashaswini Murthy B',          phone:'9986520131',  department:'HR & General Management',               designation:'Assistant Professor',                       employee_id:'33',    gender:'female', joining_date:'2015-07-01' },
    ];

    const updateUser = db.prepare(`
      UPDATE users SET name=?, phone=?, department=?, designation=?, gender=?, joining_date=?, employee_id=?
      WHERE email=?
    `);
    const updateFaculty = db.prepare(`
      UPDATE faculty SET employee_id=?, designation=?, joining_date=? WHERE user_id=?
    `);

    const setStaffRole = db.prepare("UPDATE users SET role='staff' WHERE email=? AND role NOT IN ('admin','faculty','student','hod')");

    let updated = 0;
    for (const s of staffData) {
      const u = db.prepare('SELECT id, role FROM users WHERE email = ?').get(s.email);
      if (!u) continue;
      updateUser.run(s.name, s.phone, s.department, s.designation, s.gender, s.joining_date, s.employee_id, s.email);
      if (u.role === 'faculty') {
        const fac = db.prepare('SELECT id FROM faculty WHERE user_id=?').get(u.id);
        if (fac) updateFaculty.run(s.employee_id, s.designation, s.joining_date, u.id);
      } else if (!['admin','faculty','student','hod'].includes(u.role)) {
        setStaffRole.run(s.email);
      }
      updated++;
    }
    if (updated > 0) console.log(`Synced ${updated} staff records from MSRIM official list.`);
  }

  // Seed all 13 standard leave types (idempotent — INSERT OR IGNORE)
  {
    const leaveTypes = [
      { code:'CL',  name:'Casual Leave',             max_days:12,  paid:1, carry:0, carry_max:0,  color:'#3b82f6', desc:'For personal/urgent matters' },
      { code:'SL',  name:'Sick Leave',                max_days:10,  paid:1, carry:0, carry_max:0,  color:'#ef4444', desc:'For illness or medical treatment' },
      { code:'EL',  name:'Earned Leave',              max_days:15,  paid:1, carry:1, carry_max:15, color:'#10b981', desc:'Accrued based on service period' },
      { code:'ML',  name:'Maternity Leave',           max_days:180, paid:1, carry:0, carry_max:0,  color:'#ec4899', desc:'For childbirth and post-natal care' },
      { code:'PAL', name:'Paternity Leave',           max_days:15,  paid:1, carry:0, carry_max:0,  color:'#8b5cf6', desc:'For fathers at time of childbirth' },
      { code:'OD',  name:'On Duty',                   max_days:0,   paid:1, carry:0, carry_max:0,  color:'#f59e0b', desc:'Official work outside campus' },
      { code:'COP', name:'Compensatory Off',          max_days:0,   paid:1, carry:0, carry_max:0,  color:'#06b6d4', desc:'In lieu of working on holidays' },
      { code:'LWP', name:'Leave Without Pay',         max_days:0,   paid:0, carry:0, carry_max:0,  color:'#6b7280', desc:'Unpaid leave when balance exhausted' },
      { code:'RH',  name:'Restricted Holiday',        max_days:2,   paid:1, carry:0, carry_max:0,  color:'#f97316', desc:'Chosen from optional holiday list' },
      { code:'STL', name:'Study Leave',               max_days:30,  paid:1, carry:0, carry_max:0,  color:'#7c3aed', desc:'For higher studies or research' },
      { code:'VL',  name:'Vacation Leave',            max_days:21,  paid:1, carry:0, carry_max:0,  color:'#0ea5e9', desc:'Annual vacation period' },
      { code:'SPL', name:'Special / Emergency Leave', max_days:3,   paid:1, carry:0, carry_max:0,  color:'#dc2626', desc:'For bereavement or emergencies' },
      { code:'ACL', name:'Academic Conference Leave', max_days:0,   paid:1, carry:0, carry_max:0,  color:'#059669', desc:'For attending conferences, FDPs, workshops' },
    ];
    const insertLT = db.prepare('INSERT OR IGNORE INTO leave_types (code,name,max_days_per_year,is_paid,carry_forward,max_carry_forward,color,description) VALUES (?,?,?,?,?,?,?,?)');
    let newTypes = 0;
    for (const lt of leaveTypes) {
      const r = insertLT.run(lt.code, lt.name, lt.max_days, lt.paid, lt.carry, lt.carry_max, lt.color, lt.desc);
      if (r.changes) newTypes++;
    }
    if (newTypes > 0) console.log(`Seeded ${newTypes} new leave type(s).`);

    // Ensure leave balances exist for all staff for current year
    const year = new Date().getFullYear();
    const staff = db.prepare("SELECT id FROM users WHERE role IN ('faculty','admin','hod','registrar','librarian','accounts','placement','staff') AND is_active=1").all();
    const types = db.prepare('SELECT * FROM leave_types WHERE is_active=1').all();
    const balInsert = db.prepare('INSERT OR IGNORE INTO leave_balances (user_id,leave_type_id,year,total_days) VALUES (?,?,?,?)');
    let newBal = 0;
    for (const u of staff) {
      for (const lt of types) {
        const r = balInsert.run(u.id, lt.id, year, lt.max_days_per_year);
        if (r.changes) newBal++;
      }
    }
    if (newBal > 0) console.log(`Initialized ${newBal} missing leave balance(s) for ${year}.`);
  }

  // Migration: remove old leave_type CHECK constraint from leave_applications
  {
    const laSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name='leave_applications' AND type='table'").get();
    if (laSchema && laSchema.sql.includes("CHECK(leave_type IN")) {
      db.exec(`PRAGMA foreign_keys = OFF`);
      db.exec(`
        CREATE TABLE leave_applications_v2 (
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
        INSERT INTO leave_applications_v2 SELECT id,user_id,leave_type,from_date,to_date,days,reason,status,approved_by,remarks,created_at FROM leave_applications;
        DROP TABLE leave_applications;
        ALTER TABLE leave_applications_v2 RENAME TO leave_applications;
      `);
      db.exec(`PRAGMA foreign_keys = ON`);
      console.log('Migrated leave_applications: removed old leave_type CHECK constraint.');
    }
  }

  // Migration: add 'parent' to users role enum if not already present
  const userSchema = db.prepare("SELECT sql FROM sqlite_master WHERE name = 'users' AND type = 'table'").get();
  if (userSchema && (!userSchema.sql.includes("'parent'") || !userSchema.sql.includes("'staff'"))) {
    db.exec(`PRAGMA foreign_keys = OFF`);
    db.exec(`
      CREATE TABLE users_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','faculty','student','hod','registrar','librarian','accounts','placement','parent','staff')),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        department TEXT,
        profile_photo TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        last_login TEXT
      );
      INSERT INTO users_v2 SELECT * FROM users;
      DROP TABLE users;
      ALTER TABLE users_v2 RENAME TO users;
    `);
    db.exec(`PRAGMA foreign_keys = ON`);
    console.log('Migrated users table: added parent/staff roles.');
  }

  db.exec(`
    -- Admissions
    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      applicant_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      dob TEXT,
      gender TEXT,
      category TEXT DEFAULT 'General',
      program_id INTEGER REFERENCES programs(id),
      batch_year INTEGER,
      form_number TEXT UNIQUE,
      application_date TEXT DEFAULT (date('now')),
      status TEXT DEFAULT 'applied' CHECK(status IN ('applied','documents_pending','documents_verified','form_approved','admitted','rejected','waitlisted')),
      documents_verified INTEGER DEFAULT 0,
      form_approved INTEGER DEFAULT 0,
      entrance_score REAL,
      interview_score REAL,
      remarks TEXT,
      converted_student_id INTEGER REFERENCES students(id),
      reviewed_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS admission_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_id INTEGER REFERENCES admissions(id),
      doc_type TEXT NOT NULL,
      doc_name TEXT,
      file_path TEXT,
      verified INTEGER DEFAULT 0,
      verified_by INTEGER REFERENCES users(id),
      uploaded_at TEXT DEFAULT (datetime('now'))
    );

    -- LMS
    CREATE TABLE IF NOT EXISTS lms_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      course_id INTEGER REFERENCES courses(id),
      faculty_id INTEGER REFERENCES faculty(id),
      due_date TEXT,
      total_marks INTEGER DEFAULT 100,
      type TEXT DEFAULT 'assignment' CHECK(type IN ('assignment','project','case_study','presentation')),
      academic_year_id INTEGER REFERENCES academic_years(id),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','closed','draft')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lms_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER REFERENCES lms_assignments(id),
      student_id INTEGER REFERENCES students(id),
      submitted_at TEXT DEFAULT (datetime('now')),
      file_path TEXT,
      notes TEXT,
      marks_obtained REAL,
      feedback TEXT,
      status TEXT DEFAULT 'submitted' CHECK(status IN ('submitted','graded','late','missing')),
      graded_by INTEGER REFERENCES faculty(id),
      UNIQUE(assignment_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS lms_resources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      course_id INTEGER REFERENCES courses(id),
      faculty_id INTEGER REFERENCES faculty(id),
      resource_type TEXT DEFAULT 'document' CHECK(resource_type IN ('document','video','link','presentation','other')),
      file_path TEXT,
      url TEXT,
      academic_year_id INTEGER REFERENCES academic_years(id),
      is_published INTEGER DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lms_quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      course_id INTEGER REFERENCES courses(id),
      faculty_id INTEGER REFERENCES faculty(id),
      total_marks INTEGER DEFAULT 10,
      duration_minutes INTEGER DEFAULT 30,
      start_time TEXT,
      end_time TEXT,
      academic_year_id INTEGER REFERENCES academic_years(id),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS lms_quiz_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER REFERENCES lms_quizzes(id),
      student_id INTEGER REFERENCES students(id),
      started_at TEXT,
      submitted_at TEXT,
      score REAL,
      status TEXT DEFAULT 'in_progress' CHECK(status IN ('in_progress','submitted','auto_submitted')),
      UNIQUE(quiz_id, student_id)
    );

    -- IQAC / Feedback Management
    CREATE TABLE IF NOT EXISTS feedback_forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'course' CHECK(type IN ('course','faculty','infrastructure','event','general','exit')),
      target_role TEXT DEFAULT 'student',
      course_id INTEGER REFERENCES courses(id),
      faculty_id INTEGER REFERENCES faculty(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      start_date TEXT,
      end_date TEXT,
      is_anonymous INTEGER DEFAULT 1,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','active','closed')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER REFERENCES feedback_forms(id),
      question_text TEXT NOT NULL,
      question_type TEXT DEFAULT 'rating' CHECK(question_type IN ('rating','text','mcq','yes_no')),
      options TEXT,
      is_required INTEGER DEFAULT 1,
      order_num INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS feedback_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER REFERENCES feedback_forms(id),
      respondent_id INTEGER REFERENCES users(id),
      response_data TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      UNIQUE(form_id, respondent_id)
    );

    -- Infrastructure
    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      floors INTEGER DEFAULT 1,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS infra_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      building_id INTEGER REFERENCES buildings(id),
      room_number TEXT NOT NULL,
      floor INTEGER DEFAULT 1,
      room_type TEXT DEFAULT 'classroom' CHECK(room_type IN ('classroom','lab','seminar','auditorium','office','restroom','cafeteria','library','other')),
      capacity INTEGER DEFAULT 60,
      has_projector INTEGER DEFAULT 0,
      has_ac INTEGER DEFAULT 0,
      has_wifi INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(building_id, room_number)
    );

    CREATE TABLE IF NOT EXISTS venue_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER REFERENCES infra_rooms(id),
      booked_by INTEGER REFERENCES users(id),
      purpose TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      attendees_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('pending','confirmed','cancelled','completed')),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- HR Management
    CREATE TABLE IF NOT EXISTS staff_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT DEFAULT 'present' CHECK(status IN ('present','absent','half_day','late','on_leave','holiday')),
      marked_by INTEGER REFERENCES users(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS staff_portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      category TEXT NOT NULL CHECK(category IN ('publication','conference','award','certification','project','patent','other')),
      title TEXT NOT NULL,
      description TEXT,
      institution TEXT,
      date TEXT,
      url TEXT,
      verified INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Campus Help Center
    CREATE TABLE IF NOT EXISTS help_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      sla_hours INTEGER DEFAULT 24,
      assigned_department TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS help_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES help_services(id),
      raised_by INTEGER REFERENCES users(id),
      subject TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      status TEXT DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved','closed','rejected')),
      assigned_to INTEGER REFERENCES users(id),
      resolved_at TEXT,
      resolution_notes TEXT,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Feed & Booth
    CREATE TABLE IF NOT EXISTS feed_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      post_type TEXT DEFAULT 'general' CHECK(post_type IN ('general','announcement','event','achievement','poll')),
      image_url TEXT,
      target_audience TEXT DEFAULT 'all',
      booth_id INTEGER,
      is_pinned INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES feed_posts(id),
      user_id INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER REFERENCES feed_posts(id),
      author_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS booths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'club' CHECK(type IN ('club','department','event','committee','other')),
      created_by INTEGER REFERENCES users(id),
      banner_url TEXT,
      is_active INTEGER DEFAULT 1,
      member_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Mentor-Mentee
    CREATE TABLE IF NOT EXISTS mentor_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mentor_id INTEGER REFERENCES faculty(id),
      mentee_id INTEGER REFERENCES students(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      assigned_date TEXT DEFAULT (date('now')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive','completed')),
      meeting_count INTEGER DEFAULT 0,
      last_meeting_date TEXT,
      notes TEXT,
      UNIQUE(mentor_id, mentee_id, academic_year_id)
    );

    CREATE TABLE IF NOT EXISTS mentor_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      assignment_id INTEGER REFERENCES mentor_assignments(id),
      meeting_date TEXT NOT NULL,
      duration_minutes INTEGER DEFAULT 30,
      topics_discussed TEXT,
      action_points TEXT,
      next_meeting_date TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Parent Management
    CREATE TABLE IF NOT EXISTS parent_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE REFERENCES users(id),
      student_id INTEGER REFERENCES students(id),
      relation TEXT DEFAULT 'Parent',
      occupation TEXT,
      annual_income TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Examinations Enhanced
    CREATE TABLE IF NOT EXISTS grading_schemas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      program_id INTEGER REFERENCES programs(id),
      description TEXT,
      schema_data TEXT,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hall_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER REFERENCES students(id),
      examination_id INTEGER REFERENCES examinations(id),
      hall_ticket_number TEXT UNIQUE,
      seat_number TEXT,
      generated_at TEXT DEFAULT (datetime('now')),
      generated_by INTEGER REFERENCES users(id),
      is_valid INTEGER DEFAULT 1,
      UNIQUE(student_id, examination_id)
    );

    CREATE TABLE IF NOT EXISTS seating_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examination_id INTEGER REFERENCES examinations(id),
      room_id INTEGER REFERENCES infra_rooms(id),
      student_id INTEGER REFERENCES students(id),
      seat_number TEXT,
      row_num INTEGER,
      col_num INTEGER,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(examination_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS question_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examination_id INTEGER REFERENCES examinations(id),
      version TEXT DEFAULT 'A',
      total_questions INTEGER DEFAULT 0,
      sections_data TEXT,
      prepared_by INTEGER REFERENCES faculty(id),
      reviewed_by INTEGER REFERENCES faculty(id),
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','review','approved','printed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS masking_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examination_id INTEGER REFERENCES examinations(id),
      student_id INTEGER REFERENCES students(id),
      masked_number TEXT UNIQUE,
      generated_at TEXT DEFAULT (datetime('now')),
      generated_by INTEGER REFERENCES users(id),
      UNIQUE(examination_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS invigilators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examination_id INTEGER REFERENCES examinations(id),
      faculty_id INTEGER REFERENCES faculty(id),
      room_id INTEGER REFERENCES infra_rooms(id),
      session TEXT DEFAULT 'morning' CHECK(session IN ('morning','afternoon','evening')),
      assigned_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(examination_id, faculty_id, room_id)
    );

    CREATE TABLE IF NOT EXISTS certificate_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'degree' CHECK(type IN ('degree','diploma','merit','participation','completion')),
      program_id INTEGER REFERENCES programs(id),
      template_data TEXT,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Hostel (enhance existing)
    CREATE TABLE IF NOT EXISTS hostel_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER UNIQUE REFERENCES students(id),
      room_id INTEGER REFERENCES hostel_rooms(id),
      allotment_date TEXT DEFAULT (date('now')),
      vacating_date TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','vacated','pending')),
      fee_per_month REAL DEFAULT 0,
      remarks TEXT
    );

    -- Placement Organisations
    CREATE TABLE IF NOT EXISTS placement_organisations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sector TEXT,
      website TEXT,
      hr_contact_name TEXT,
      hr_contact_email TEXT,
      hr_contact_phone TEXT,
      address TEXT,
      mou_signed INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Class Groups (AMS)
    CREATE TABLE IF NOT EXISTS class_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      course_id INTEGER REFERENCES courses(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      created_at TEXT DEFAULT (datetime('now')),
      schedule_date TEXT
    );

    CREATE TABLE IF NOT EXISTS class_group_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER REFERENCES class_groups(id),
      student_id INTEGER REFERENCES students(id),
      UNIQUE(group_id, student_id)
    );

    -- Lesson Plans (AMS)
    CREATE TABLE IF NOT EXISTS lesson_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER REFERENCES courses(id),
      faculty_id INTEGER REFERENCES faculty(id),
      topic TEXT NOT NULL,
      subtopics TEXT,
      planned_date TEXT,
      scheduled_date TEXT,
      actual_date TEXT,
      duration_minutes INTEGER DEFAULT 60,
      status TEXT DEFAULT 'planned' CHECK(status IN ('planned','scheduled','completed','cancelled','postponed')),
      lesson_type TEXT DEFAULT 'lecture' CHECK(lesson_type IN ('lecture','lab','tutorial','seminar','guest_lecture','field_visit')),
      room_id INTEGER REFERENCES infra_rooms(id),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- AI Agent Intelligence Store
    CREATE TABLE IF NOT EXISTS agent_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      severity TEXT DEFAULT 'info' CHECK(severity IN ('info','warning','critical','success')),
      title TEXT NOT NULL,
      description TEXT,
      entity_type TEXT,
      entity_id INTEGER,
      action_url TEXT,
      is_resolved INTEGER DEFAULT 0,
      generated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      resolved_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS agent_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      insights_generated INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      ran_at TEXT DEFAULT (datetime('now'))
    );

    -- Attendance Policies (AMS)
    CREATE TABLE IF NOT EXISTS attendance_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      program_id INTEGER REFERENCES programs(id),
      min_percentage REAL DEFAULT 75,
      warning_percentage REAL DEFAULT 80,
      condonation_percentage REAL DEFAULT 65,
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Future-proof SAP-equivalent modules
  db.exec(`
    -- Workflow / Process Hub (SAP Workflow equivalent)
    CREATE TABLE IF NOT EXISTS workflow_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      steps_config TEXT DEFAULT '[]',
      created_by INTEGER REFERENCES users(id),
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workflow_instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_id INTEGER REFERENCES workflow_definitions(id),
      title TEXT NOT NULL,
      initiated_by INTEGER REFERENCES users(id),
      current_step INTEGER DEFAULT 1,
      total_steps INTEGER DEFAULT 1,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','approved','rejected','cancelled')),
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS workflow_approvals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id INTEGER REFERENCES workflow_instances(id),
      step_number INTEGER DEFAULT 1,
      approver_id INTEGER REFERENCES users(id),
      action TEXT DEFAULT 'pending' CHECK(action IN ('pending','approved','rejected','forwarded')),
      remarks TEXT,
      acted_at TEXT
    );

    -- Finance Management (SAP FI equivalent)
    CREATE TABLE IF NOT EXISTS budget_heads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      category TEXT DEFAULT 'expenditure' CHECK(category IN ('income','expenditure','capital')),
      parent_id INTEGER REFERENCES budget_heads(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budget_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      head_id INTEGER REFERENCES budget_heads(id),
      academic_year_id INTEGER REFERENCES academic_years(id),
      department TEXT,
      allocated_amount REAL DEFAULT 0,
      utilized_amount REAL DEFAULT 0,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS expense_vouchers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_number TEXT UNIQUE NOT NULL,
      budget_head_id INTEGER REFERENCES budget_heads(id),
      department TEXT,
      amount REAL NOT NULL,
      description TEXT,
      vendor_name TEXT,
      payment_mode TEXT DEFAULT 'bank_transfer',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','paid','rejected')),
      requested_by INTEGER REFERENCES users(id),
      approved_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      approved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS income_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_number TEXT UNIQUE NOT NULL,
      budget_head_id INTEGER REFERENCES budget_heads(id),
      amount REAL NOT NULL,
      description TEXT,
      source TEXT,
      receipt_date TEXT DEFAULT (date('now')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Procurement / Materials Management (SAP MM equivalent)
    CREATE TABLE IF NOT EXISTS vendors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      category TEXT,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      gstin TEXT,
      bank_account TEXT,
      is_active INTEGER DEFAULT 1,
      rating REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchase_requisitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pr_number TEXT UNIQUE NOT NULL,
      department TEXT NOT NULL,
      requested_by INTEGER REFERENCES users(id),
      item_description TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT DEFAULT 'nos',
      estimated_cost REAL,
      priority TEXT DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
      required_by TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','po_raised','received','rejected')),
      approved_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT UNIQUE NOT NULL,
      pr_id INTEGER REFERENCES purchase_requisitions(id),
      vendor_id INTEGER REFERENCES vendors(id),
      items_detail TEXT DEFAULT '[]',
      total_amount REAL NOT NULL,
      tax_amount REAL DEFAULT 0,
      delivery_date TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','partial_received','received','cancelled')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS inventory_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      category TEXT,
      unit TEXT DEFAULT 'nos',
      current_stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 0,
      location TEXT,
      last_updated TEXT DEFAULT (datetime('now'))
    );

    -- Alumni Relations (SAP CRM equivalent)
    CREATE TABLE IF NOT EXISTS alumni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      student_id INTEGER REFERENCES students(id),
      name TEXT,
      graduation_year INTEGER,
      program TEXT,
      current_company TEXT,
      current_designation TEXT,
      current_location TEXT,
      linkedin_url TEXT,
      industry TEXT,
      salary_range TEXT,
      skills TEXT,
      is_mentor INTEGER DEFAULT 0,
      is_donor INTEGER DEFAULT 0,
      profile_visible INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS alumni_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      posted_by INTEGER REFERENCES alumni(id),
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT,
      job_type TEXT DEFAULT 'full_time',
      experience_required TEXT,
      salary_range TEXT,
      description TEXT,
      apply_link TEXT,
      last_date TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS alumni_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT DEFAULT 'meetup',
      description TEXT,
      date TEXT,
      venue TEXT,
      organizer_id INTEGER REFERENCES alumni(id),
      max_attendees INTEGER,
      registration_link TEXT,
      status TEXT DEFAULT 'upcoming',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Accreditation & Quality Management (NAAC / SAP QM equivalent)
    CREATE TABLE IF NOT EXISTS accreditation_cycles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      body TEXT DEFAULT 'NAAC' CHECK(body IN ('NAAC','NBA','AICTE','ISO','Internal')),
      start_date TEXT,
      end_date TEXT,
      target_grade TEXT,
      status TEXT DEFAULT 'planning' CHECK(status IN ('planning','in_progress','submitted','completed')),
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS quality_criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cycle_id INTEGER REFERENCES accreditation_cycles(id),
      criterion_number TEXT NOT NULL,
      criterion_name TEXT NOT NULL,
      max_score REAL DEFAULT 100,
      current_score REAL DEFAULT 0,
      weightage REAL DEFAULT 1,
      responsible_person INTEGER REFERENCES users(id),
      status TEXT DEFAULT 'not_started' CHECK(status IN ('not_started','in_progress','completed','verified')),
      notes TEXT,
      evidence_files TEXT DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS quality_indicators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      criteria_id INTEGER REFERENCES quality_criteria(id),
      indicator_code TEXT NOT NULL,
      indicator_name TEXT NOT NULL,
      target_value REAL,
      achieved_value REAL,
      unit TEXT,
      data_source TEXT,
      verified INTEGER DEFAULT 0,
      last_updated TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS iqac_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meeting_number TEXT,
      date TEXT,
      venue TEXT,
      agenda TEXT DEFAULT '[]',
      minutes TEXT,
      action_items TEXT DEFAULT '[]',
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled')),
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  seedExtendedData();
  console.log('Extended database schema created.');
}

function seedExtendedData() {
  const adminId = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')?.id || 1;

  // Help Services
  const svcExists = db.prepare('SELECT id FROM help_services LIMIT 1').get();
  if (!svcExists) {
    const svc = db.prepare('INSERT INTO help_services (name, category, description, sla_hours, assigned_department) VALUES (?, ?, ?, ?, ?)');
    svc.run('IT Support', 'IT', 'Technical support for hardware, software and network issues', 4, 'IT Department');
    svc.run('Library Card Request', 'Library', 'Request for new or replacement library card', 24, 'Library');
    svc.run('Fee Receipt', 'Accounts', 'Request duplicate fee receipt', 24, 'Accounts');
    svc.run('Bonafide Certificate', 'Admin', 'Request bonafide certificate for various purposes', 48, 'Administration');
    svc.run('Transcript Request', 'Academics', 'Request official academic transcripts', 72, 'Academics');
    svc.run('NOC Certificate', 'Admin', 'No Objection Certificate for various purposes', 48, 'Administration');
    svc.run('Hostel Related', 'Hostel', 'Hostel room issues, maintenance, complaints', 8, 'Hostel Office');
    svc.run('Classroom Maintenance', 'Infrastructure', 'Report classroom infrastructure issues', 12, 'Facilities');
  }

  // Buildings
  const bldExists = db.prepare('SELECT id FROM buildings LIMIT 1').get();
  if (!bldExists) {
    const bld = db.prepare('INSERT INTO buildings (name, code, floors, description) VALUES (?, ?, ?, ?)');
    bld.run('Main Academic Block', 'MAB', 4, 'Main academic building with classrooms and faculty offices');
    bld.run('Administrative Block', 'ADM', 3, 'Administrative offices, accounts and registrar');
    bld.run('Library Block', 'LIB', 2, 'Central library and reading halls');
    bld.run('Hostel Block A', 'HSA', 5, 'Boys hostel block');
    bld.run('Hostel Block B', 'HSB', 5, 'Girls hostel block');

    const rooms = db.prepare('INSERT INTO infra_rooms (building_id, room_number, floor, room_type, capacity, has_projector, has_ac, has_wifi) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    rooms.run(1, '101', 1, 'classroom', 60, 1, 1, 1);
    rooms.run(1, '102', 1, 'classroom', 60, 1, 1, 1);
    rooms.run(1, '103', 1, 'seminar', 80, 1, 1, 1);
    rooms.run(1, '201', 2, 'classroom', 60, 1, 1, 1);
    rooms.run(1, '202', 2, 'lab', 40, 1, 1, 1);
    rooms.run(1, '301', 3, 'auditorium', 300, 1, 1, 1);
    rooms.run(3, 'Reading Hall', 1, 'library', 100, 0, 1, 1);
  }

  // Feedback Forms
  const fbExists = db.prepare('SELECT id FROM feedback_forms LIMIT 1').get();
  if (!fbExists) {
    const fbInsert = db.prepare('INSERT INTO feedback_forms (title, description, type, target_role, academic_year_id, start_date, end_date, is_anonymous, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    fbInsert.run('Course Feedback - Financial Management', 'End of semester feedback for Financial Management course', 'course', 'student', 1, '2024-11-01', '2024-11-30', 1, 'active', adminId);
    fbInsert.run('Faculty Feedback - Dr. Meera Iyer', 'Student feedback on faculty teaching effectiveness', 'faculty', 'student', 1, '2024-11-01', '2024-11-30', 1, 'active', adminId);
    fbInsert.run('Infrastructure Feedback', 'Feedback on campus infrastructure and facilities', 'infrastructure', 'student', 1, '2024-11-01', '2024-12-31', 1, 'active', adminId);

    const qs = db.prepare('INSERT INTO feedback_questions (form_id, question_text, question_type, is_required, order_num) VALUES (?, ?, ?, ?, ?)');
    qs.run(1, 'How would you rate the course content coverage?', 'rating', 1, 1);
    qs.run(1, 'How effective was the teaching methodology?', 'rating', 1, 2);
    qs.run(1, 'Were course materials adequate?', 'yes_no', 1, 3);
    qs.run(1, 'Overall feedback on the course', 'text', 0, 4);
    qs.run(2, 'Rate the faculty\'s subject knowledge', 'rating', 1, 1);
    qs.run(2, 'Rate teaching effectiveness', 'rating', 1, 2);
    qs.run(2, 'Rate accessibility and communication', 'rating', 1, 3);
  }

  // Grading Schema
  const gsExists = db.prepare('SELECT id FROM grading_schemas LIMIT 1').get();
  if (!gsExists) {
    db.prepare('INSERT INTO grading_schemas (name, program_id, description, schema_data, created_by) VALUES (?, ?, ?, ?, ?)')
      .run('PGDM Grading Schema 2024', 1, 'Standard grading schema for PGDM program',
        JSON.stringify({grades:[{grade:'O',min:90},{grade:'A+',min:80},{grade:'A',min:70},{grade:'B+',min:60},{grade:'B',min:50},{grade:'C',min:40},{grade:'F',min:0}]}), adminId);
  }

  // Attendance Policy
  const polExists = db.prepare('SELECT id FROM attendance_policies LIMIT 1').get();
  if (!polExists) {
    db.prepare('INSERT INTO attendance_policies (name, program_id, min_percentage, warning_percentage, condonation_percentage, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run('PGDM Attendance Policy', 1, 75, 80, 65, adminId);
  }

  // Booths
  const boothExists = db.prepare('SELECT id FROM booths LIMIT 1').get();
  if (!boothExists) {
    const booth = db.prepare('INSERT INTO booths (name, description, type, created_by, is_active) VALUES (?, ?, ?, ?, ?)');
    booth.run('Finance Club', 'Student club focused on finance and investment', 'club', adminId, 1);
    booth.run('Marketing Club', 'Student club for marketing and branding enthusiasts', 'club', adminId, 1);
    booth.run('HR Club', 'Student club for HR and organizational behavior', 'club', adminId, 1);
    booth.run('Student Council', 'Official student governing body', 'committee', adminId, 1);
    booth.run('Sports Committee', 'Sports and recreation activities coordination', 'committee', adminId, 1);
  }

  // Certificate Templates
  const ctExists = db.prepare('SELECT id FROM certificate_templates LIMIT 1').get();
  if (!ctExists) {
    const ct = db.prepare('INSERT INTO certificate_templates (name, type, program_id, is_active, created_by) VALUES (?, ?, ?, ?, ?)');
    ct.run('PGDM Degree Certificate', 'degree', 1, 1, adminId);
    ct.run('PGDM Merit Certificate', 'merit', 1, 1, adminId);
    ct.run('Course Completion Certificate', 'completion', 1, 1, adminId);
  }

  // Mentor Assignments
  const mExists = db.prepare('SELECT id FROM mentor_assignments LIMIT 1').get();
  if (!mExists) {
    const stus = db.prepare('SELECT id FROM students').all();
    const facs = db.prepare('SELECT id FROM faculty').all();
    const ma = db.prepare('INSERT OR IGNORE INTO mentor_assignments (mentor_id, mentee_id, academic_year_id, status) VALUES (?, ?, ?, ?)');
    stus.forEach((s, i) => { ma.run(facs[i % facs.length].id, s.id, 1, 'active'); });
  }

  // Hostel Rooms
  const hrExists = db.prepare('SELECT id FROM hostel_rooms LIMIT 1').get();
  if (!hrExists) {
    const hr = db.prepare('INSERT INTO hostel_rooms (room_number, block, floor, capacity, type, monthly_rent) VALUES (?, ?, ?, ?, ?, ?)');
    for (let i = 1; i <= 10; i++) { hr.run(`A-${101+i}`, 'A', 1, 2, 'double', 5000); }
    for (let i = 1; i <= 10; i++) { hr.run(`B-${101+i}`, 'B', 1, 2, 'double', 5000); }
  }

  // Feed posts
  const postExists = db.prepare('SELECT id FROM feed_posts LIMIT 1').get();
  if (!postExists) {
    const post = db.prepare('INSERT INTO feed_posts (author_id, content, post_type, target_audience, is_pinned) VALUES (?, ?, ?, ?, ?)');
    post.run(adminId, 'Welcome to MSRIM Digital Campus! This is your campus social feed. Stay updated with the latest news, events, and achievements.', 'announcement', 'all', 1);
    post.run(adminId, 'Congratulations to our students for exceptional performance in the recent industry simulation exercise!', 'achievement', 'all', 0);
    post.run(adminId, 'Leadership Conclave 2024 was a grand success! Thank you to all speakers, participants and organizers.', 'event', 'all', 0);
  }

  // Organisations
  const orgExists = db.prepare('SELECT id FROM placement_organisations LIMIT 1').get();
  if (!orgExists) {
    const org = db.prepare('INSERT INTO placement_organisations (name, sector, hr_contact_email, mou_signed, is_active) VALUES (?, ?, ?, ?, ?)');
    org.run('Deloitte India', 'Consulting', 'hr@deloitte.in', 1, 1);
    org.run('KPMG India', 'Consulting', 'careers@kpmg.in', 1, 1);
    org.run('Amazon India', 'E-Commerce', 'amazon.hiring@amazon.in', 0, 1);
    org.run('Infosys BPM', 'IT Services', 'careers@infosysbpm.com', 1, 1);
    org.run('Wipro Technologies', 'IT Services', 'hr@wipro.com', 1, 1);
    org.run('HDFC Bank', 'Banking/Finance', 'hr@hdfcbank.com', 1, 1);
    org.run('Axis Bank', 'Banking/Finance', 'hr@axisbank.com', 1, 1);
  }

  // Admissions
  const admExists = db.prepare('SELECT id FROM admissions LIMIT 1').get();
  if (!admExists) {
    const adm = db.prepare('INSERT INTO admissions (applicant_name, email, phone, dob, gender, program_id, batch_year, form_number, status, documents_verified, form_approved, entrance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    adm.run('Akash Mehta', 'akash.mehta@gmail.com', '9876543210', '2001-05-15', 'Male', 1, 2025, 'MSRIM-2025-001', 'form_approved', 1, 1, 87.5);
    adm.run('Divya Sharma', 'divya.sharma@gmail.com', '9876543211', '2001-08-22', 'Female', 1, 2025, 'MSRIM-2025-002', 'documents_verified', 1, 0, 82.0);
    adm.run('Suresh Nambiar', 'suresh.n@gmail.com', '9876543212', '2000-12-10', 'Male', 1, 2025, 'MSRIM-2025-003', 'applied', 0, 0, 79.5);
    adm.run('Preethi Rao', 'preethi.rao@gmail.com', '9876543213', '2001-03-28', 'Female', 1, 2025, 'MSRIM-2025-004', 'documents_pending', 0, 0, 91.0);
    adm.run('Arjun Patel', 'arjun.patel@gmail.com', '9876543214', '2001-07-19', 'Male', 1, 2025, 'MSRIM-2025-005', 'admitted', 1, 1, 88.5);
  }

  // LMS data
  const lmsExists = db.prepare('SELECT id FROM lms_assignments LIMIT 1').get();
  if (!lmsExists) {
    const fac1 = db.prepare("SELECT id FROM faculty WHERE employee_id = 'MSR-FAC-001'").get();
    const fac2 = db.prepare("SELECT id FROM faculty WHERE employee_id = 'MSR-FAC-002'").get();
    if (fac1 && fac2) {
      const asgn = db.prepare('INSERT INTO lms_assignments (title, description, course_id, faculty_id, due_date, total_marks, type, academic_year_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      asgn.run('Financial Statement Analysis', 'Analyze the annual report of any listed company and prepare a comprehensive financial analysis', 1, fac1.id, '2024-08-31', 50, 'assignment', 1, 'active');
      asgn.run('Marketing Plan for a Startup', 'Prepare a detailed marketing plan for an imaginary startup of your choice', 2, fac2.id, '2024-09-15', 50, 'project', 1, 'active');

      const res = db.prepare('INSERT INTO lms_resources (title, description, course_id, faculty_id, resource_type, academic_year_id) VALUES (?, ?, ?, ?, ?, ?)');
      res.run('Financial Management - Module 1 Notes', 'Comprehensive notes for FM Module 1', 1, fac1.id, 'document', 1);
      res.run('Marketing Case Studies Collection', 'Collection of Harvard Business Review cases', 2, fac2.id, 'document', 1);
      res.run('Excel for Financial Analysis', 'Tutorial videos for Excel-based financial modeling', 1, fac1.id, 'video', 1);

      const quiz = db.prepare('INSERT INTO lms_quizzes (title, course_id, faculty_id, total_marks, duration_minutes, status, academic_year_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
      quiz.run('FM Quiz 1 - Financial Ratios', 1, fac1.id, 20, 30, 'closed', 1);
      quiz.run('MM Quiz 1 - Marketing Concepts', 2, fac2.id, 20, 30, 'active', 1);
    }
  }

  // Staff portfolios
  const portExists = db.prepare('SELECT id FROM staff_portfolios LIMIT 1').get();
  if (!portExists) {
    const fac1User = db.prepare("SELECT u.id FROM users u JOIN faculty f ON f.user_id = u.id WHERE f.employee_id = 'MSR-FAC-001'").get();
    const fac2User = db.prepare("SELECT u.id FROM users u JOIN faculty f ON f.user_id = u.id WHERE f.employee_id = 'MSR-FAC-002'").get();
    if (fac1User) {
      const port = db.prepare('INSERT INTO staff_portfolios (user_id, category, title, description, institution, date) VALUES (?, ?, ?, ?, ?, ?)');
      port.run(fac1User.id, 'publication', 'Impact of Digital Finance on SMEs', 'Published in International Journal of Finance', 'IIM Bangalore', '2023-06-15');
      port.run(fac1User.id, 'certification', 'CFA Level 1', 'Chartered Financial Analyst Level 1 certification', 'CFA Institute', '2022-12-01');
      if (fac2User) port.run(fac2User.id, 'conference', 'Marketing in the Digital Age', 'Paper presented at National Marketing Conference', 'IIM Ahmedabad', '2024-02-20');
    }
  }

  // Add name column to alumni if missing
  try {
    const alCols = db.prepare("PRAGMA table_info(alumni)").all();
    if (!alCols.find(c => c.name === 'name')) {
      db.exec("ALTER TABLE alumni ADD COLUMN name TEXT");
      console.log('Added name column to alumni.');
    }
  } catch (_) {}

  // Budget Heads (Finance module)
  const bhExists = db.prepare('SELECT id FROM budget_heads LIMIT 1').get();
  if (!bhExists) {
    const bh = db.prepare('INSERT INTO budget_heads (name, code, category) VALUES (?, ?, ?)');
    bh.run('Tuition Fee Income', 'INC-TUI', 'income');
    bh.run('Grant & Funding Income', 'INC-GRN', 'income');
    bh.run('Exam Fee Income', 'INC-EXM', 'income');
    bh.run('Academic Operations', 'EXP-ACA', 'expenditure');
    bh.run('Faculty & Staff Salaries', 'EXP-SAL', 'expenditure');
    bh.run('Infrastructure & Maintenance', 'EXP-INF', 'expenditure');
    bh.run('Library & Resources', 'EXP-LIB', 'expenditure');
    bh.run('IT & Technology', 'EXP-IT', 'expenditure');
    bh.run('Marketing & Events', 'EXP-MKT', 'expenditure');
    bh.run('Capital Expenditure', 'CAP-GEN', 'capital');

    const alloc = db.prepare('INSERT INTO budget_allocations (head_id, academic_year_id, department, allocated_amount, utilized_amount, created_by) VALUES (?, 1, ?, ?, ?, ?)');
    alloc.run(4, 'All', 5000000, 2100000, adminId);
    alloc.run(5, 'All', 12000000, 8500000, adminId);
    alloc.run(6, 'All', 3000000, 1200000, adminId);
    alloc.run(7, 'Library', 800000, 450000, adminId);
    alloc.run(8, 'IT', 2000000, 1100000, adminId);
    alloc.run(9, 'Admin', 1500000, 700000, adminId);
    alloc.run(10, 'All', 5000000, 1800000, adminId);

    const inc = db.prepare('INSERT INTO income_entries (entry_number, budget_head_id, amount, description, source, receipt_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)');
    inc.run('INC-2024-000001', 1, 18000000, 'MBA Batch 2024-26 tuition fee collection', 'Student Fees', '2024-07-15', adminId);
    inc.run('INC-2024-000002', 2, 2500000, 'AICTE Research Grant 2024', 'AICTE', '2024-09-01', adminId);
    inc.run('INC-2024-000003', 3, 500000, 'Semester examination fees', 'Students', '2024-11-01', adminId);
  }

  // Vendors (Procurement module)
  const vendExists = db.prepare('SELECT id FROM vendors LIMIT 1').get();
  if (!vendExists) {
    const vnd = db.prepare('INSERT INTO vendors (name, code, category, contact_person, email, phone, gstin, is_active, rating) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)');
    vnd.run('Infosys BPM Ltd', 'VND-001', 'IT Services', 'Ravi Shankar', 'ravi.s@infosys.com', '9876543001', '29AABCI1681F1ZY', 4.8);
    vnd.run('Tata Business Hub', 'VND-002', 'Office Supplies', 'Meera Pillai', 'meera@tatahub.com', '9876543002', '27AAACT2727Q1ZV', 4.5);
    vnd.run('Wipro Tech Solutions', 'VND-003', 'IT Hardware', 'Arun Kumar', 'arun@wipro.com', '9876543003', '29AAACW0855L1ZF', 4.3);
    vnd.run('Amazon Business', 'VND-004', 'General Supplies', 'Support Team', 'business@amazon.in', '1800-555-0000', '29AABCA2803L1ZC', 4.7);
    vnd.run('Reliance Digital', 'VND-005', 'Electronics', 'Sales Team', 'b2b@jio.com', '9876543005', '27AAACR5055K1Z5', 4.2);

    const inv = db.prepare('INSERT INTO inventory_items (name, code, category, unit, current_stock, min_stock, location) VALUES (?, ?, ?, ?, ?, ?, ?)');
    inv.run('A4 Paper Ream', 'INV-001', 'Stationery', 'ream', 120, 50, 'Store Room A');
    inv.run('Whiteboard Marker', 'INV-002', 'Stationery', 'box', 30, 20, 'Store Room A');
    inv.run('Projector Bulb', 'INV-003', 'AV Equipment', 'nos', 8, 10, 'AV Store');
    inv.run('Printer Cartridge - Black', 'INV-004', 'IT Supplies', 'nos', 15, 10, 'IT Store');
    inv.run('Laptop Charger', 'INV-005', 'IT Supplies', 'nos', 5, 8, 'IT Store');
  }

  // Workflow Definitions
  const wfExists = db.prepare('SELECT id FROM workflow_definitions LIMIT 1').get();
  if (!wfExists) {
    const wf = db.prepare('INSERT INTO workflow_definitions (name, type, description, steps_config, created_by, is_active) VALUES (?, ?, ?, ?, ?, 1)');
    wf.run('Faculty Leave Approval', 'leave', 'Leave request workflow — Faculty to HOD to Registrar', '[]', adminId);
    wf.run('Purchase Requisition Approval', 'purchase', 'PR approval — Department to Accounts to Admin', '[]', adminId);
    wf.run('Budget Reallocation Request', 'budget', 'Budget change requires Finance and Management approval', '[]', adminId);
    wf.run('New Course Approval', 'admission', 'Course proposal — HOD to Academic Council', '[]', adminId);
  }

  // Accreditation (NAAC cycle)
  const accExists = db.prepare('SELECT id FROM accreditation_cycles LIMIT 1').get();
  if (!accExists) {
    const acc = db.prepare('INSERT INTO accreditation_cycles (name, body, start_date, end_date, target_grade, status) VALUES (?, ?, ?, ?, ?, ?)');
    acc.run('NAAC 2026 Assessment', 'NAAC', '2025-01-01', '2026-06-30', 'A++', 'in_progress');
    acc.run('NBA Accreditation 2025', 'NBA', '2025-04-01', '2025-12-31', '', 'planning');

    const crit = db.prepare('INSERT INTO quality_criteria (cycle_id, criterion_number, criterion_name, max_score, current_score, weightage, status, responsible_person) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    crit.run(1, 'I', 'Curricular Aspects', 150, 128, 1, 'in_progress', adminId);
    crit.run(1, 'II', 'Teaching-Learning & Evaluation', 200, 175, 1, 'in_progress', adminId);
    crit.run(1, 'III', 'Research, Innovations & Extension', 150, 95, 1, 'in_progress', adminId);
    crit.run(1, 'IV', 'Infrastructure & Learning Resources', 100, 88, 1, 'completed', adminId);
    crit.run(1, 'V', 'Student Support & Progression', 100, 82, 1, 'in_progress', adminId);
    crit.run(1, 'VI', 'Governance, Leadership & Management', 100, 79, 1, 'not_started', adminId);
    crit.run(1, 'VII', 'Institutional Values & Best Practices', 100, 67, 1, 'not_started', adminId);

    const mtg = db.prepare('INSERT INTO iqac_meetings (meeting_number, date, venue, status, created_by) VALUES (?, ?, ?, ?, ?)');
    mtg.run('IQAC-2024-01', '2024-07-15', 'Board Room, Admin Block', 'completed', adminId);
    mtg.run('IQAC-2024-02', '2024-10-10', 'Conference Hall, MAB', 'completed', adminId);
    mtg.run('IQAC-2025-01', '2025-01-20', 'Board Room, Admin Block', 'scheduled', adminId);
  }

  // Alumni seed data with real names
  const alExists = db.prepare('SELECT id FROM alumni LIMIT 1').get();
  if (!alExists) {
    const al = db.prepare('INSERT INTO alumni (name, graduation_year, program, current_company, current_designation, current_location, linkedin_url, industry, salary_range, skills, is_mentor, is_donor) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    al.run('Arjun Krishnaswamy', 2022, 'MBA', 'Deloitte India', 'Business Analyst', 'Bengaluru', 'https://linkedin.com/in/arjun-k', 'Consulting', '12-18 LPA', 'Strategy, Finance, Excel, PowerBI', 1, 0);
    al.run('Priya Venkataraman', 2022, 'MBA', 'HDFC Bank', 'Deputy Manager – Retail Banking', 'Mumbai', 'https://linkedin.com/in/priya-v', 'BFSI', '14-16 LPA', 'Banking, CRM, Relationship Management', 0, 1);
    al.run('Rohit Shenoy', 2021, 'MBA', 'Amazon India', 'Senior Program Manager', 'Hyderabad', 'https://linkedin.com/in/rohit-s', 'E-Commerce', '22-28 LPA', 'Operations, Supply Chain, Agile, PMP', 1, 0);
    al.run('Deepa Nagarajan', 2021, 'MBA', 'Infosys BPM', 'Senior Consultant', 'Pune', 'https://linkedin.com/in/deepa-n', 'IT Services', '16-22 LPA', 'SAP, Project Management, ITIL, Six Sigma', 0, 0);
    al.run('Kiran Patil', 2023, 'MBA', 'Flipkart', 'Category Manager – Electronics', 'Bengaluru', 'https://linkedin.com/in/kiran-p', 'E-Commerce', '10-15 LPA', 'Marketing, Analytics, Pricing, Negotiations', 1, 0);
    al.run('Ananya Menon', 2020, 'MBA', 'McKinsey & Company', 'Associate', 'Delhi', 'https://linkedin.com/in/ananya-m', 'Consulting', '28-38 LPA', 'Strategy, M&A, Digital Transformation, ESG', 1, 1);
    al.run('Vivek Rajagopalan', 2020, 'MBA', 'Tata Capital', 'Vice President – Corporate Finance', 'Mumbai', 'https://linkedin.com/in/vivek-r', 'BFSI', '32-40 LPA', 'Corporate Finance, PE, Credit, Structuring', 1, 1);
    al.run('Meera Subramaniam', 2023, 'MBA', 'HUL', 'Brand Manager', 'Mumbai', 'https://linkedin.com/in/meera-s', 'FMCG', '12-16 LPA', 'Brand Management, GTM, Consumer Insights, P&L', 0, 0);
    al.run('Aditya Kulkarni', 2019, 'MBA', 'Google India', 'Industry Manager', 'Bengaluru', 'https://linkedin.com/in/aditya-k', 'Technology', '40-55 LPA', 'Digital Marketing, AdTech, Sales, Partnerships', 1, 0);
    al.run('Sneha Iyer', 2022, 'MBA', 'Axis Bank', 'Relationship Manager – HNI', 'Chennai', 'https://linkedin.com/in/sneha-i', 'BFSI', '10-13 LPA', 'Wealth Management, Investments, Portfolio Advisory', 0, 0);
    al.run('Rajesh Nambiar', 2021, 'MBA', 'ITC Limited', 'Area Sales Manager', 'Kolkata', 'https://linkedin.com/in/rajesh-n', 'FMCG', '14-18 LPA', 'Sales, Distribution, Rural Marketing, Team Leadership', 0, 0);
    al.run('Pooja Hebbar', 2023, 'MBA', 'PhonePe', 'Product Analyst', 'Bengaluru', 'https://linkedin.com/in/pooja-h', 'Fintech', '11-15 LPA', 'Product Management, SQL, A/B Testing, UX Research', 1, 0);
    al.run('Suresh Ramamurthy', 2020, 'MBA', 'Accenture Strategy', 'Manager', 'Bengaluru', 'https://linkedin.com/in/suresh-r', 'Consulting', '24-30 LPA', 'Digital Strategy, Change Management, AI/ML, Cloud', 1, 0);
    al.run('Lakshmi Chandrasekhar', 2019, 'MBA', 'Bajaj Finserv', 'Chief Manager – Treasury', 'Pune', 'https://linkedin.com/in/lakshmi-c', 'BFSI', '35-45 LPA', 'Treasury, FX, Derivatives, Risk Management', 1, 1);
    al.run('Nikhil Sharma', 2022, 'MBA', 'Swiggy', 'City Head – Bengaluru South', 'Bengaluru', 'https://linkedin.com/in/nikhil-s', 'Food Tech', '18-24 LPA', 'P&L Management, Operations, Growth, Partner Success', 0, 0);

    const jobs = db.prepare('INSERT INTO alumni_jobs (posted_by, title, company, location, job_type, experience_required, salary_range, description, apply_link, last_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)');
    jobs.run(1, 'Business Analyst – Strategy', 'Deloitte India', 'Bengaluru / Mumbai / Hyderabad', 'full_time', '0-2 years', '9-14 LPA', 'Join Deloitte\'s consulting practice. Work with Fortune 500 clients on transformation projects. Strong analytical mindset, MBA preferred. MSRIM alumni in team.', 'https://careers.deloitte.com', '2025-03-31');
    jobs.run(3, 'Senior Program Manager', 'Amazon India', 'Hyderabad', 'full_time', '3-6 years', '20-30 LPA', 'Drive large-scale operations and logistics programs. PMP certified preferred. Experience in supply chain or e-commerce. Excellent leadership skills required.', 'https://amazon.jobs', '2025-04-15');
    jobs.run(6, 'Associate Consultant', 'McKinsey & Company', 'Delhi / Mumbai', 'full_time', '2-4 years', '25-40 LPA', 'McKinsey is hiring Associates for its India offices. MBA from top B-school essential. Strong problem-solving, structured thinking, and presentation skills.', 'https://mckinsey.com/careers', '2025-02-28');
    jobs.run(7, 'Assistant Vice President – Corporate Finance', 'Tata Capital', 'Mumbai', 'full_time', '4-7 years', '28-38 LPA', 'Lead debt structuring and syndication for mid-market corporates. CA or MBA Finance. Strong credit assessment and client relationship skills.', 'https://tatacapital.com/careers', '2025-03-20');
    jobs.run(12, 'Product Analyst Intern', 'PhonePe', 'Bengaluru', 'internship', 'Fresher / MBA 1st year', '40-50K/month', '6-month paid internship in Product team. Work on real UPI and financial products. SQL, Excel, and passion for Fintech required.', 'https://phonepe.com/careers', '2025-02-15');
    jobs.run(8, 'Brand Manager – Home Care', 'HUL', 'Mumbai', 'full_time', '1-3 years', '14-20 LPA', 'Manage brand P&L for HUL\'s home care portfolio. MBA Marketing from top institute. Experience in consumer goods preferred. Creative and analytical mindset.', 'https://hul.co.in/careers', '2025-04-01');
    jobs.run(9, 'Industry Manager – EdTech', 'Google India', 'Bengaluru', 'full_time', '5-8 years', '45-65 LPA', 'Drive Google Ads revenue for EdTech vertical. MBA with 5+ years in digital sales. Track record of exceeding revenue targets and stakeholder management.', 'https://careers.google.com', '2025-03-10');

    const evts = db.prepare('INSERT INTO alumni_events (title, type, description, date, venue, max_attendees, status) VALUES (?, ?, ?, ?, ?, ?, ?)');
    evts.run('MSRIM Alumni Grand Reunion 2025', 'reunion', 'Annual grand alumni gathering celebrating 30 years of MSRIM excellence. Keynote by Aditya Kulkarni (Google). Panel: "Future of Management in AI Era". Gala dinner and awards night.', '2025-03-22', 'The Leela Palace, Bengaluru', 300, 'upcoming');
    evts.run('Career Mentorship Masterclass', 'webinar', 'Senior alumni mentors share career guidance for current students and recent graduates. Topics: Breaking into consulting, BFSI careers, startup ecosystem.', '2025-02-15', 'Online (Zoom – Link shared post-registration)', 500, 'upcoming');
    evts.run('MSRIM Startup Pitch Day 2025', 'networking', 'Alumni entrepreneurs and investors meet current students with startup ideas. 10 startups pitch for ₹5L seed funding. Vivek Rajagopalan (Tata Capital) leading the investor panel.', '2025-04-05', 'MSRIM Campus – Innovation Hub', 150, 'upcoming');
    evts.run('Finance Leaders Conclave', 'conference', 'Alumni working in BFSI, fintech, and corporate finance discuss the evolving landscape. Guest: Lakshmi Chandrasekhar (Bajaj Finserv). Topics: Treasury, Fintech disruption, RBI regulations.', '2025-05-10', 'ITC Gardenia, Bengaluru', 200, 'upcoming');
    evts.run('MSRIM Alumni Cricket Tournament 2024', 'meetup', 'Annual alumni cricket tournament. Batch-wise teams compete. Trophy and medals for top 3 teams. Evening bonfire and BBQ.', '2024-12-14', 'MSRIM Sports Ground', 100, 'upcoming');
  }

  // ── Rich Student Data ──────────────────────────────────────────────────────
  try {
    const stuCount = db.prepare('SELECT COUNT(*) as c FROM students').get().c;
    if (stuCount < 15) {
      const bcrypt = require('bcryptjs');
      const pw = bcrypt.hashSync('Student@123', 10);
      const addUser = db.prepare(`INSERT OR IGNORE INTO users (username,password,role,name,email,phone,department,is_active) VALUES (?,?,?,?,?,?,?,?)`);
      const addStu = db.prepare(`INSERT OR IGNORE INTO students (user_id,enrollment_number,program_id,semester,batch_year,section,roll_number,dob,gender,blood_group,city,state,guardian_name,guardian_phone,admission_date,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

      const students = [
        ['Aarav Mehta','aarav.mehta','aarav@msrim.edu','9900001101','MSR2024001',1,2,2024,'A','01','2002-03-12','Male','B+','Bengaluru','Karnataka','Suresh Mehta','9900001100'],
        ['Diya Sharma','diya.sharma','diya@msrim.edu','9900001102','MSR2024002',1,2,2024,'A','02','2002-07-25','Female','O+','Mysuru','Karnataka','Priya Sharma','9900001200'],
        ['Rohan Patel','rohan.patel','rohan@msrim.edu','9900001103','MSR2024003',1,2,2024,'B','03','2001-11-08','Male','A+','Ahmedabad','Gujarat','Nilesh Patel','9900001300'],
        ['Sneha Reddy','sneha.reddy','sneha@msrim.edu','9900001104','MSR2024004',1,2,2024,'B','04','2002-01-30','Female','AB+','Hyderabad','Telangana','Ravi Reddy','9900001400'],
        ['Kabir Singh','kabir.singh','kabir@msrim.edu','9900001105','MSR2024005',1,2,2024,'A','05','2001-09-15','Male','O-','Delhi','Delhi','Harpreet Singh','9900001500'],
        ['Ananya Iyer','ananya.iyer','ananya@msrim.edu','9900001106','MSR2024006',1,2,2024,'A','06','2002-04-22','Female','B-','Chennai','Tamil Nadu','Meena Iyer','9900001600'],
        ['Vikram Nair','vikram.nair','vikram@msrim.edu','9900001107','MSR2024007',1,2,2024,'B','07','2001-12-05','Male','A-','Kochi','Kerala','Rajan Nair','9900001700'],
        ['Pooja Joshi','pooja.joshi','pooja@msrim.edu','9900001108','MSR2024008',1,2,2024,'B','08','2002-06-18','Female','O+','Pune','Maharashtra','Anil Joshi','9900001800'],
        ['Arjun Kumar','arjun.kumar','arjun@msrim.edu','9900001109','MSR2024009',1,2,2024,'A','09','2001-08-27','Male','B+','Bengaluru','Karnataka','Suresh Kumar','9900001900'],
        ['Priya Menon','priya.menon','priya@msrim.edu','9900001110','MSR2024010',1,2,2024,'A','10','2002-02-14','Female','AB-','Thiruvananthapuram','Kerala','Krishnan Menon','9900002000'],
        ['Rahul Verma','rahul.verma','rahul@msrim.edu','9900001111','MSR2024011',1,2,2024,'B','11','2001-10-03','Male','O+','Lucknow','Uttar Pradesh','Arun Verma','9900002100'],
        ['Kavya Rao','kavya.rao','kavya@msrim.edu','9900001112','MSR2024012',1,2,2024,'B','12','2002-05-09','Female','A+','Bengaluru','Karnataka','Mohan Rao','9900002200'],
        ['Siddharth Gupta','sid.gupta','sid@msrim.edu','9900001113','MSR2024013',1,2,2024,'A','13','2001-07-20','Male','B+','Jaipur','Rajasthan','Rakesh Gupta','9900002300'],
        ['Nandita Pillai','nandita.pillai','nandita@msrim.edu','9900001114','MSR2024014',1,2,2024,'A','14','2002-09-11','Female','O-','Kochi','Kerala','George Pillai','9900002400'],
        ['Aakash Tiwari','aakash.tiwari','aakash@msrim.edu','9900001115','MSR2024015',1,2,2024,'B','15','2001-06-28','Male','AB+','Bhopal','Madhya Pradesh','Sunil Tiwari','9900002500'],
        ['Riya Bose','riya.bose','riya@msrim.edu','9900001116','MSR2024016',1,2,2024,'B','16','2002-08-03','Female','A-','Kolkata','West Bengal','Debashish Bose','9900002600'],
        ['Harish Naidu','harish.naidu','harish@msrim.edu','9900001117','MSR2024017',1,2,2024,'A','17','2001-05-17','Male','O+','Vijayawada','Andhra Pradesh','Ramesh Naidu','9900002700'],
        ['Tanvi Shah','tanvi.shah','tanvi@msrim.edu','9900001118','MSR2024018',1,2,2024,'A','18','2002-12-01','Female','B+','Surat','Gujarat','Jayesh Shah','9900002800'],
        ['Manish Dubey','manish.dubey','manish@msrim.edu','9900001119','MSR2024019',1,2,2024,'B','19','2001-04-14','Male','A+','Varanasi','Uttar Pradesh','Rajesh Dubey','9900002900'],
        ['Shruti Kulkarni','shruti.kulkarni','shruti@msrim.edu','9900001120','MSR2024020',1,2,2024,'B','20','2002-11-25','Female','O+','Pune','Maharashtra','Vijay Kulkarni','9900003000'],
      ];

      students.forEach(([name, uname, email, phone, enroll, prog, sem, batch, sec, roll, dob, gender, blood, city, state, gname, gphone]) => {
        try {
          const ur = addUser.run(uname, pw, 'student', name, email, phone, 'Management', 1);
          if (ur.lastInsertRowid) {
            addStu.run(ur.lastInsertRowid, enroll, prog, sem, batch, sec, roll, dob, gender, blood, city, state, gname, gphone, '2024-07-15', 'active');
          }
        } catch (_) {}
      });
      console.log('Rich student data seeded.');
    }
  } catch (e) { console.log('Student seed skipped:', e.message); }

  // ── Attendance Records ─────────────────────────────────────────────────────
  try {
  const attCount = db.prepare('SELECT COUNT(*) as c FROM attendance').get().c;
  if (attCount < 50) {
    const students = db.prepare('SELECT id FROM students LIMIT 20').all();
    const courses = db.prepare('SELECT id FROM courses LIMIT 4').all();
    const markerId = adminId;
    const att = db.prepare(`INSERT OR IGNORE INTO attendance (student_id,course_id,date,status,marked_by) VALUES (?,?,?,?,?)`);
    const dates = [];
    for (let d = 1; d <= 60; d++) {
      const dt = new Date('2024-07-15'); dt.setDate(dt.getDate() + d);
      if (dt.getDay() !== 0 && dt.getDay() !== 6) dates.push(dt.toISOString().split('T')[0]);
    }
    const statuses = ['present','present','present','present','present','present','present','present','late','absent'];
    students.forEach(s => {
      courses.forEach(c => {
        dates.slice(0, 40).forEach((date, i) => {
          const roll = Math.random();
          const status = roll < 0.05 ? 'absent' : roll < 0.08 ? 'late' : 'present';
          att.run(s.id, c.id, date, status, markerId);
        });
      });
    });
    // Make 2 students have low attendance
    const lowStudents = students.slice(0, 2);
    lowStudents.forEach(s => {
      courses.forEach(c => {
        dates.slice(0, 20).forEach(date => {
          try { db.prepare(`UPDATE attendance SET status='absent' WHERE student_id=? AND course_id=? AND date=?`).run(s.id, c.id, date); } catch (_) {}
        });
      });
    });
    console.log('Attendance records seeded.');
  }
  } catch (e) { console.log('Attendance seed skipped:', e.message); }

  // ── Fee Structures & Payments ──────────────────────────────────────────────
  try {
  const feeStrCount = db.prepare('SELECT COUNT(*) as c FROM fee_structures').get().c;
  if (feeStrCount < 2) {
    const fs = db.prepare(`INSERT INTO fee_structures (program_id,academic_year_id,fee_type,amount,due_date,semester) VALUES (1,1,?,?,?,?)`);
    fs.run('Tuition Fee', 125000, '2024-08-15', 1);
    fs.run('Hostel Fee', 45000, '2024-08-15', 1);
    fs.run('Library Fee', 5000, '2024-08-15', 1);
    fs.run('Exam Fee', 8000, '2024-11-15', 1);
    fs.run('Tuition Fee', 125000, '2025-01-15', 2);
    fs.run('Hostel Fee', 45000, '2025-01-15', 2);
  }

  const feePayCount = db.prepare('SELECT COUNT(*) as c FROM fee_payments').get().c;
  if (feePayCount < 5) {
    const students = db.prepare('SELECT id FROM students').all();
    const feeStructures = db.prepare('SELECT id FROM fee_structures WHERE semester=1').all();
    const pay = db.prepare(`INSERT OR IGNORE INTO fee_payments (student_id,fee_structure_id,amount_paid,payment_date,payment_mode,transaction_id,receipt_number,status,collected_by) VALUES (?,?,?,?,?,?,?,?,?)`);
    let rnum = 1;
    students.forEach((s, si) => {
      feeStructures.forEach((fs, fi) => {
        // 75% of students have paid sem 1 fees
        if (Math.random() > 0.25 || si < 15) {
          const mode = ['online','online','online','dd','cheque'][Math.floor(Math.random()*5)];
          const txn = `TXN${Date.now()}${si}${fi}`.slice(0,16);
          const rcpt = `MSRIM-RCPT-2024-${String(rnum++).padStart(4,'0')}`;
          const days = Math.floor(Math.random()*20);
          const dt = new Date('2024-08-01'); dt.setDate(dt.getDate()+days);
          pay.run(s.id, fs.id, db.prepare('SELECT amount FROM fee_structures WHERE id=?').get(fs.id)?.amount||0, dt.toISOString().split('T')[0], mode, txn, rcpt, 'paid', adminId);
        }
      });
    });
    console.log('Fee payments seeded.');
  }
  } catch (e) { console.log('Fee seed skipped:', e.message); }

  // ── Library Transactions ───────────────────────────────────────────────────
  try {
  const libTxnCount = db.prepare('SELECT COUNT(*) as c FROM library_transactions').get().c;
  if (libTxnCount < 5) {
    const books = db.prepare('SELECT id FROM library_books LIMIT 10').all();
    const students = db.prepare('SELECT user_id FROM students LIMIT 15').all();
    if (books.length > 0 && students.length > 0) {
      const lib = db.prepare(`INSERT OR IGNORE INTO library_transactions (book_id,user_id,issue_date,due_date,return_date,status,issued_by) VALUES (?,?,?,?,?,?,?)`);
      const statuses2 = ['returned','returned','returned','issued','issued','overdue'];
      students.forEach((s, i) => {
        const bk = books[i % books.length];
        const issDate = new Date('2024-08-01'); issDate.setDate(issDate.getDate() + i * 3);
        const dueDate = new Date(issDate); dueDate.setDate(dueDate.getDate() + 14);
        const st = statuses2[i % statuses2.length];
        const retDate = st === 'returned' ? new Date(issDate.getTime() + 10*86400000).toISOString().split('T')[0] : null;
        lib.run(bk.id, s.user_id, issDate.toISOString().split('T')[0], dueDate.toISOString().split('T')[0], retDate, st, adminId);
      });
    }
  }

  } catch (e) { console.log('Library seed skipped:', e.message); }

  // ── Placements: Drives & Applications ─────────────────────────────────────
  try {
  const placDriveCount = db.prepare('SELECT COUNT(*) as c FROM placements').get().c;
  if (placDriveCount < 3) {
    const plac = db.prepare(`INSERT INTO placements (company_name,job_role,package_lpa,drive_date,last_apply_date,description,requirements,location,type,status,hr_contact,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
    plac.run('Deloitte USI', 'Analyst – Management Consulting', 14.5, '2024-10-15', '2024-10-05', 'Deloitte is hiring MBA graduates for its consulting practice. Work with global clients on strategy and transformation.', 'MBA Finance/Strategy, Strong analytical skills, 60%+ academics', 'Bengaluru / Mumbai', 'campus', 'completed', 'hr@deloitte.com', adminId);
    plac.run('HDFC Bank', 'Relationship Manager – Priority Banking', 9.5, '2024-11-02', '2024-10-25', 'HDFC Bank Priority Banking division hiring RMs to manage HNI clients. Training provided.', 'MBA Finance/Marketing, Good communication, Banking interest', 'Pan India', 'campus', 'completed', 'campus@hdfcbank.com', adminId);
    plac.run('ITC Limited', 'Area Sales Manager', 12.0, '2024-11-20', '2024-11-10', 'ITC FMCG division hiring ASMs for South India territory management. Strong leadership and sales aptitude required.', 'MBA Marketing/Sales, Willing to relocate, 2-wheeler licence', 'South India', 'campus', 'completed', 'campus@itc.in', adminId);
    plac.run('Amazon India', 'Operations Manager Trainee', 18.5, '2024-12-05', '2024-11-28', 'Amazon India hiring MTs for Operations. Fast-paced environment, high-growth role. Rotational program across fulfilment centres.', 'MBA Operations/General, Strong analytical ability, Flexibility', 'Hyderabad / Bengaluru', 'campus', 'completed', 'uni-campus@amazon.com', adminId);
    plac.run('Accenture Strategy', 'Strategy Analyst', 16.0, '2025-01-10', '2025-01-03', 'Accenture Strategy India hiring analysts for consulting projects in digital, cloud, and AI strategy.', 'MBA from Tier-1 institute, CGPA 7.5+, Strong PPT & Excel', 'Bengaluru / Gurgaon', 'campus', 'upcoming', 'campus@accenture.com', adminId);
    plac.run('Swiggy', 'City Business Manager', 15.5, '2025-02-01', '2025-01-25', 'Swiggy is looking for MBAs to manage city-level P&L. Work with restaurant partners, delivery fleet, and marketing.', 'MBA, Entrepreneurial mindset, 60%+ academics, No backlogs', 'Multiple Cities', 'campus', 'upcoming', 'talent@swiggy.in', adminId);

    // Applications & selections for completed drives
    const students = db.prepare('SELECT id FROM students LIMIT 20').all();
    const drives = db.prepare(`SELECT id FROM placements WHERE status='completed'`).all();
    const app = db.prepare(`INSERT OR IGNORE INTO placement_applications (placement_id,student_id,applied_date,status,remarks) VALUES (?,?,?,?,?)`);
    const statusOptions = ['selected','shortlisted','shortlisted','rejected','applied'];
    drives.forEach(d => {
      students.forEach((s, i) => {
        if (Math.random() > 0.3) {
          const st = statusOptions[i % statusOptions.length];
          app.run(d.id, s.id, '2024-10-01', st, st === 'selected' ? 'Offer letter issued' : null);
        }
      });
    });
    console.log('Placement data seeded.');
  }
  } catch (e) { console.log('Placement seed skipped:', e.message); }

  // ── Workflow Instances ─────────────────────────────────────────────────────
  try {
  const wfiCount = db.prepare('SELECT COUNT(*) as c FROM workflow_instances').get().c;
  if (wfiCount < 3) {
    const wfDefs = db.prepare('SELECT id FROM workflow_definitions LIMIT 4').all();
    if (wfDefs.length > 0) {
      const users = db.prepare(`SELECT id FROM users WHERE role IN ('faculty','hod') LIMIT 5`).all();
      const wi = db.prepare(`INSERT INTO workflow_instances (workflow_id,title,initiated_by,current_step,total_steps,status,data) VALUES (?,?,?,?,?,?,?)`);
      const initId = users[0]?.id || adminId;
      wi.run(wfDefs[0].id, 'Leave Request – 3 Days (Personal)', initId, 1, 2, 'pending', '{"reason":"Family function","from":"2025-01-20","to":"2025-01-22"}');
      wi.run(wfDefs[0].id, 'Leave Request – Conference Attendance IIM-B', initId, 2, 2, 'approved', '{"reason":"Research conference","from":"2025-02-05","to":"2025-02-07"}');
      if (wfDefs[1]) wi.run(wfDefs[1].id, 'Purchase Requisition – 5 Projectors for MBA Hall', adminId, 1, 2, 'pending', '{"items":"BenQ MW809ST Projectors x5","amount":175000}');
      if (wfDefs[1]) wi.run(wfDefs[1].id, 'PR – Furniture Replacement for Faculty Lounge', adminId, 2, 2, 'approved', '{"items":"Office chairs x20, Tables x5","amount":85000}');
      if (wfDefs[2]) wi.run(wfDefs[2].id, 'Budget Reallocation – IT to Infrastructure Q3', adminId, 1, 2, 'in_progress', '{"from":"IT Budget","to":"Infrastructure","amount":200000}');
      if (wfDefs[3]) wi.run(wfDefs[3].id, 'New Elective: Business Analytics with Python', adminId, 1, 2, 'pending', '{"course":"Business Analytics with Python","credits":3,"semester":3}');
    }
  }

  } catch (e) { console.log('Workflow instances seed skipped:', e.message); }

  // ── Expense Vouchers ───────────────────────────────────────────────────────
  try {
  const expCount = db.prepare('SELECT COUNT(*) as c FROM expense_vouchers').get().c;
  if (expCount < 3) {
    const heads = db.prepare('SELECT id, code FROM budget_heads WHERE category=\'expenditure\'').all();
    const getHead = (code) => heads.find(h => h.code === code)?.id || heads[0]?.id;
    const exp = db.prepare(`INSERT INTO expense_vouchers (voucher_number,budget_head_id,department,amount,description,vendor_name,payment_mode,status,requested_by,approved_by,approved_at) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`);
    exp.run('EXP-2024-000001', getHead('EXP-IT'), 'IT Department', 285000, 'Annual Microsoft 365 subscription renewal for 95 user licences', 'Microsoft India Pvt Ltd', 'bank_transfer', 'paid', adminId, adminId);
    exp.run('EXP-2024-000002', getHead('EXP-LIB'), 'Library', 182500, 'EBSCO Business Source Complete – Annual database subscription 2024-25', 'EBSCO Information Services', 'bank_transfer', 'paid', adminId, adminId);
    exp.run('EXP-2024-000003', getHead('EXP-INF'), 'Facilities', 95000, 'HVAC servicing and maintenance for main academic block Q3', 'Blue Star Ltd', 'cheque', 'approved', adminId, adminId);
    exp.run('EXP-2024-000004', getHead('EXP-MKT'), 'Marketing', 48000, 'MSRIM admissions brochure print – 5000 copies, 4-colour offset', 'PrintMaster Solutions', 'bank_transfer', 'paid', adminId, adminId);
    exp.run('EXP-2024-000005', getHead('EXP-ACA'), 'Academics', 125000, 'Guest faculty honorarium – Executive Development Programme Oct 2024', 'Sundaram & Associates', 'bank_transfer', 'approved', adminId, adminId);
    exp.run('EXP-2024-000006', getHead('EXP-IT'), 'IT Department', 340000, 'Cisco catalyst switches x4 and structured cabling – Block B', 'Wipro Tech Solutions', 'bank_transfer', 'pending', adminId, null);
    exp.run('EXP-2024-000007', getHead('EXP-INF'), 'Facilities', 215000, 'Solar panel installation on rooftop – Phase 1 of green campus initiative', 'Tata Power Solar', 'bank_transfer', 'pending', adminId, null);

    // Update budget utilization
    heads.forEach(h => {
      const total = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM expense_vouchers WHERE budget_head_id=? AND status IN ('approved','paid')`).get(h.id)?.t || 0;
      db.prepare(`UPDATE budget_allocations SET utilized_amount=? WHERE head_id=?`).run(total, h.id);
    });
    console.log('Expense vouchers seeded.');
  }
  } catch (e) { console.log('Expense seed skipped:', e.message); }

  // ── NAAC Indicators ────────────────────────────────────────────────────────
  try {
  const indCount = db.prepare('SELECT COUNT(*) as c FROM quality_indicators').get().c;
  if (indCount < 3) {
    const criteria = db.prepare('SELECT id, criterion_number FROM quality_criteria LIMIT 7').all();
    const ind = db.prepare(`INSERT INTO quality_indicators (criteria_id,indicator_code,indicator_name,target_value,achieved_value,unit,data_source,verified) VALUES (?,?,?,?,?,?,?,?)`);
    criteria.forEach(c => {
      const cn = c.criterion_number;
      if (cn === 'I') {
        ind.run(c.id, 'I.1.1', 'Programmes offered as per UGC norms', 100, 100, '%', 'Academic Council Minutes', 1);
        ind.run(c.id, 'I.1.2', 'Certificate / Diploma programmes', 5, 4, 'count', 'Programme Calendar', 1);
        ind.run(c.id, 'I.2.1', 'Add-on programmes offered', 8, 7, 'count', 'Activity Reports', 0);
        ind.run(c.id, 'I.3.1', 'Courses with explicit COs', 100, 95, '%', 'Curriculum Documents', 1);
      } else if (cn === 'II') {
        ind.run(c.id, 'II.1.1', 'Average enrolment % against sanctioned intake', 90, 87, '%', 'Admission Data', 1);
        ind.run(c.id, 'II.4.1', 'Full-time teachers against sanctioned posts', 100, 93, '%', 'HR Records', 1);
        ind.run(c.id, 'II.6.1', 'Average pass percentage', 85, 82, '%', 'Examination Results', 1);
      } else if (cn === 'III') {
        ind.run(c.id, 'III.1.1', 'Grants received for research (₹ Lakhs)', 20, 8.5, 'Lakhs', 'Finance Records', 0);
        ind.run(c.id, 'III.2.1', 'Research papers published (Scopus/WoS)', 25, 18, 'count', 'Faculty CVs', 1);
        ind.run(c.id, 'III.3.1', 'Extension activities through NSS/NCC', 10, 6, 'count', 'Activity Reports', 0);
      } else if (cn === 'IV') {
        ind.run(c.id, 'IV.1.1', 'Campus facilities (sq.ft per student)', 30, 35, 'sq.ft', 'Infrastructure Audit', 1);
        ind.run(c.id, 'IV.2.1', 'E-resources subscriptions', 5, 4, 'databases', 'Library Records', 1);
        ind.run(c.id, 'IV.3.1', 'Computer : Student ratio', 1, 0.8, ':1', 'IT Inventory', 0);
      } else if (cn === 'V') {
        ind.run(c.id, 'V.1.1', 'Students receiving scholarships', 20, 18, '%', 'Scholarship Records', 1);
        ind.run(c.id, 'V.2.1', 'Placement % of outgoing batch', 90, 87, '%', 'Placement Cell', 1);
        ind.run(c.id, 'V.3.1', 'Awards / recognitions won', 10, 6, 'count', 'Student Affairs', 0);
      }
    });
    console.log('NAAC indicators seeded.');
  }
  } catch (e) { console.log('NAAC indicator seed skipped:', e.message); }

  console.log('Extended seed data created.');

  // ── Phases 3-7: All remaining module tables ─────────────────────────────────
  const allTbls = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

  if (!allTbls.includes('curriculum_map')) {
    db.exec(`CREATE TABLE curriculum_map (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL REFERENCES programs(id),
      course_id  INTEGER NOT NULL REFERENCES courses(id),
      semester   INTEGER NOT NULL,
      is_mandatory INTEGER DEFAULT 1,
      credits    INTEGER DEFAULT 3,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(program_id, course_id, semester)
    )`);
    console.log('Created curriculum_map table.');
  }

  if (!allTbls.includes('cms_content')) {
    db.exec(`CREATE TABLE cms_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title   TEXT NOT NULL,
      slug    TEXT UNIQUE,
      content TEXT,
      category TEXT DEFAULT 'general' CHECK(category IN ('general','announcement','policy','banner','faq','other')),
      status  TEXT DEFAULT 'draft' CHECK(status IN ('draft','published','archived')),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      published_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created cms_content table.');
  }

  if (!allTbls.includes('notification_templates')) {
    db.exec(`CREATE TABLE notification_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name      TEXT NOT NULL,
      type      TEXT DEFAULT 'email' CHECK(type IN ('email','sms','push','in-app')),
      event_key TEXT,
      subject   TEXT,
      body      TEXT NOT NULL,
      variables TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created notification_templates table.');
  }

  if (!allTbls.includes('venues')) {
    db.exec(`CREATE TABLE venues (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL,
      type     TEXT DEFAULT 'hall' CHECK(type IN ('hall','seminar-room','lab','auditorium','conference-room','sports','other')),
      capacity INTEGER DEFAULT 50,
      location TEXT,
      features TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created venues table.');
  }

  if (!allTbls.includes('campus_bookings')) {
    db.exec(`CREATE TABLE campus_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      venue_id    INTEGER NOT NULL REFERENCES venues(id),
      booked_by   INTEGER REFERENCES users(id),
      title       TEXT NOT NULL,
      date        TEXT NOT NULL,
      start_time  TEXT NOT NULL,
      end_time    TEXT NOT NULL,
      purpose     TEXT,
      status      TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','cancelled')),
      approved_by INTEGER REFERENCES users(id),
      created_at  TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created campus_bookings table.');
  }

  if (!allTbls.includes('audience_groups')) {
    db.exec(`CREATE TABLE audience_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      type        TEXT DEFAULT 'custom' CHECK(type IN ('custom','role-based','program-based','department-based')),
      criteria    TEXT DEFAULT '{}',
      member_count INTEGER DEFAULT 0,
      is_active   INTEGER DEFAULT 1,
      created_by  INTEGER REFERENCES users(id),
      created_at  TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created audience_groups table.');
  }

  if (!allTbls.includes('hostel_fee_structure')) {
    db.exec(`CREATE TABLE hostel_fee_structure (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_type       TEXT NOT NULL,
      academic_year_id INTEGER REFERENCES academic_years(id),
      amount          REAL NOT NULL DEFAULT 0,
      frequency       TEXT DEFAULT 'annual' CHECK(frequency IN ('monthly','quarterly','annual','one-time')),
      description     TEXT,
      is_active       INTEGER DEFAULT 1,
      created_by      INTEGER REFERENCES users(id),
      created_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(room_type, academic_year_id)
    )`);
    console.log('Created hostel_fee_structure table.');
  }

  if (!allTbls.includes('system_settings')) {
    db.exec(`CREATE TABLE system_settings (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      key      TEXT NOT NULL,
      value    TEXT,
      label    TEXT,
      type     TEXT DEFAULT 'text',
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(category, key)
    )`);
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','name','MS Ramaiah Institute of Management','Institution Name');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','short_name','MSRIM','Short Name');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','address','Gnanagangothri Campus, MSR Nagar, MSRIT Post, Bengaluru - 560054','Address');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','phone','+91-80-23600822','Phone');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','email','info@msrim.in','Email');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','website','https://msrim.in','Website');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','affiliation','Bangalore University','Affiliation');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('institution','accreditation','AICTE Approved, NAAC Accredited','Accreditation');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('sso','enabled','0','SSO Enabled');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('sso','provider','','Provider (google/microsoft/ldap)');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('sso','client_id','','Client ID');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('sso','tenant_id','','Tenant ID');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','zoom_api_key','','Zoom API Key');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','zoom_secret','','Zoom API Secret');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','extraaedge_key','','Extraaedge API Key');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','leadsquared_host','','LeadSquared Host');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','leadsquared_key','','LeadSquared Access Key');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','salesforce_instance','','Salesforce Instance URL');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','npf_api_key','','No Paper Forms API Key');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('integrations','seb_config','','SEB Configuration Hash');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('biometric','device_ip','','Biometric Device IP');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('biometric','device_port','4370','Biometric Device Port');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('biometric','enabled','0','Biometric Sync Enabled');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('feed','max_posts_per_day','10','Max Posts Per Day');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('feed','moderation_enabled','1','Post Moderation Enabled');
    db.prepare("INSERT OR IGNORE INTO system_settings (category,key,value,label) VALUES (?,?,?,?)").run('feed','allow_student_posts','1','Allow Student Posts');
    console.log('Created system_settings table with defaults.');
  }

  if (!allTbls.includes('biometric_records')) {
    db.exec(`CREATE TABLE biometric_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      date       TEXT NOT NULL,
      punch_in   TEXT,
      punch_out  TEXT,
      source     TEXT DEFAULT 'biometric' CHECK(source IN ('biometric','manual','mobile')),
      device_id  TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, date)
    )`);
    console.log('Created biometric_records table.');
  }

  if (!allTbls.includes('hr_pay_scales')) {
    db.exec(`CREATE TABLE hr_pay_scales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      designation  TEXT NOT NULL,
      level        TEXT,
      basic_min    REAL DEFAULT 0,
      basic_max    REAL DEFAULT 0,
      grade_pay    REAL DEFAULT 0,
      da_percent   REAL DEFAULT 0,
      hra_percent  REAL DEFAULT 0,
      is_active    INTEGER DEFAULT 1,
      created_by   INTEGER REFERENCES users(id),
      created_at   TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created hr_pay_scales table.');
  }

  // ── Phase 2: Admissions new tables ──────────────────────────────────────────
  const allTables2 = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

  if (!allTables2.includes('admission_enquiries')) {
    db.exec(`CREATE TABLE admission_enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      source TEXT DEFAULT 'walk-in' CHECK(source IN ('walk-in','website','referral','agent','social-media','email','phone','fair','other')),
      program_id INTEGER REFERENCES programs(id),
      batch_year INTEGER,
      status TEXT DEFAULT 'new' CHECK(status IN ('new','contacted','interested','not-interested','converted','lost')),
      assigned_to INTEGER REFERENCES users(id),
      follow_up_date TEXT,
      notes TEXT,
      converted_to_id INTEGER REFERENCES admissions(id),
      converted_at TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created admission_enquiries table.');
  }

  if (!allTables2.includes('admission_settings')) {
    db.exec(`CREATE TABLE admission_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year_id INTEGER REFERENCES academic_years(id),
      program_id INTEGER REFERENCES programs(id),
      intake_target INTEGER DEFAULT 60,
      last_date TEXT,
      fee_amount REAL DEFAULT 0,
      settings_json TEXT DEFAULT '{}',
      updated_by INTEGER REFERENCES users(id),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(academic_year_id, program_id)
    )`);
    console.log('Created admission_settings table.');
  }

  if (!allTables2.includes('offer_letters')) {
    db.exec(`CREATE TABLE offer_letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admission_id INTEGER NOT NULL REFERENCES admissions(id),
      issued_by INTEGER REFERENCES users(id),
      issued_at TEXT DEFAULT (datetime('now')),
      accepted INTEGER DEFAULT 0,
      accepted_at TEXT,
      remarks TEXT
    )`);
    console.log('Created offer_letters table.');
  }

  // add source + notes columns to admissions if missing
  try {
    const admCols = db.prepare("PRAGMA table_info(admissions)").all().map(c => c.name);
    if (!admCols.includes('source'))       { db.exec("ALTER TABLE admissions ADD COLUMN source TEXT DEFAULT 'direct'"); }
    if (!admCols.includes('enquiry_id'))   { db.exec("ALTER TABLE admissions ADD COLUMN enquiry_id INTEGER REFERENCES admission_enquiries(id)"); }
    if (!admCols.includes('offer_issued')) { db.exec("ALTER TABLE admissions ADD COLUMN offer_issued INTEGER DEFAULT 0"); }
    if (!admCols.includes('fee_initiated')){ db.exec("ALTER TABLE admissions ADD COLUMN fee_initiated INTEGER DEFAULT 0"); }
  } catch(e) { console.log('Admissions column migration skipped:', e.message); }

  // ── Phase 1: question_papers column additions ───────────────────────────────
  try {
    const qpCols = db.prepare("PRAGMA table_info(question_papers)").all().map(c => c.name);
    if (!qpCols.includes('review_remarks')) {
      db.exec("ALTER TABLE question_papers ADD COLUMN review_remarks TEXT");
      console.log('Migrated question_papers: added review_remarks.');
    }
  } catch(e) { console.log('QP migration skipped:', e.message); }

  // ── Phase 1: Examination new tables ─────────────────────────────────────────
  const examTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);

  if (!examTables.includes('answer_sheets')) {
    db.exec(`CREATE TABLE answer_sheets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examination_id INTEGER NOT NULL REFERENCES examinations(id),
      student_id INTEGER NOT NULL REFERENCES students(id),
      answer_sheet_number TEXT UNIQUE,
      masked_number TEXT,
      evaluator_id INTEGER REFERENCES faculty(id),
      marks_awarded REAL,
      remarks TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','assigned','evaluated','moderated','finalized')),
      submitted_at TEXT DEFAULT (datetime('now')),
      evaluated_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created answer_sheets table.');
  }

  if (!examTables.includes('backlog_registrations')) {
    db.exec(`CREATE TABLE backlog_registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL REFERENCES students(id),
      examination_id INTEGER NOT NULL REFERENCES examinations(id),
      attempt_number INTEGER DEFAULT 1,
      registration_date TEXT DEFAULT (datetime('now')),
      fee_paid REAL DEFAULT 0,
      status TEXT DEFAULT 'registered' CHECK(status IN ('registered','appeared','passed','failed','cancelled')),
      remarks TEXT,
      registered_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(student_id, examination_id, attempt_number)
    )`);
    console.log('Created backlog_registrations table.');
  }

  if (!examTables.includes('result_declarations')) {
    db.exec(`CREATE TABLE result_declarations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      academic_year_id INTEGER REFERENCES academic_years(id),
      program_id INTEGER REFERENCES programs(id),
      semester INTEGER,
      exam_type TEXT,
      title TEXT NOT NULL,
      declared_by INTEGER REFERENCES users(id),
      declared_at TEXT,
      published_at TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','declared','published','withheld')),
      remarks TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`);
    console.log('Created result_declarations table.');
  }
}

module.exports = { extendDatabase };
