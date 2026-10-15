const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

db.exec(`
  CREATE TABLE IF NOT EXISTS course_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    bloom_level TEXT DEFAULT 'Understanding' CHECK(bloom_level IN ('Remembering','Understanding','Applying','Analysing','Evaluating','Creating')),
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS program_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER REFERENCES programs(id),
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT DEFAULT 'knowledge',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS co_po_mapping (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    co_id INTEGER REFERENCES course_outcomes(id),
    po_id INTEGER REFERENCES program_outcomes(id),
    strength INTEGER DEFAULT 2 CHECK(strength IN (1,2,3)),
    UNIQUE(co_id, po_id)
  );
  CREATE TABLE IF NOT EXISTS co_attainment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    co_id INTEGER REFERENCES course_outcomes(id),
    academic_year_id INTEGER REFERENCES academic_years(id),
    direct_attainment REAL DEFAULT 0,
    indirect_attainment REAL DEFAULT 0,
    final_attainment REAL DEFAULT 0,
    target REAL DEFAULT 60,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed OBE data
const coExists = db.prepare('SELECT id FROM course_outcomes LIMIT 1').get();
if (!coExists) {
  const co = db.prepare('INSERT INTO course_outcomes (course_id, code, description, bloom_level) VALUES (?, ?, ?, ?)');
  co.run(1, 'CO1', 'Understand fundamental concepts of financial management and their application', 'Understanding');
  co.run(1, 'CO2', 'Apply financial analysis techniques to evaluate business performance', 'Applying');
  co.run(1, 'CO3', 'Analyse financial statements and interpret results', 'Analysing');
  co.run(2, 'CO1', 'Understand core marketing concepts and consumer behaviour', 'Understanding');
  co.run(2, 'CO2', 'Apply marketing mix strategies to real-world scenarios', 'Applying');

  const po = db.prepare('INSERT INTO program_outcomes (program_id, code, description) VALUES (?, ?, ?)');
  po.run(1, 'PO1', 'Apply knowledge of management principles to solve complex business problems');
  po.run(1, 'PO2', 'Analyse business situations using quantitative and qualitative methods');
  po.run(1, 'PO3', 'Demonstrate leadership and teamwork capabilities in diverse environments');
  po.run(1, 'PO4', 'Communicate effectively in both oral and written forms');
  po.run(1, 'PO5', 'Apply ethical standards in professional and business contexts');
}

router.get('/course-outcomes', (req, res) => {
  const { course_id } = req.query;
  let q = `SELECT co.*, c.name as course_name, c.code as course_code FROM course_outcomes co JOIN courses c ON co.course_id = c.id WHERE 1=1`;
  const params = [];
  if (course_id) { q += ' AND co.course_id = ?'; params.push(course_id); }
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT program_id, semester FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND c.program_id = ? AND c.semester = ?'; params.push(stu.program_id, stu.semester); }
  } else if (req.user.role === 'faculty') {
    const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
    if (fac) { q += ' AND c.faculty_id = ?'; params.push(fac.id); }
  }
  q += ' ORDER BY c.name, co.code';
  res.json(db.prepare(q).all(...params));
});

router.post('/course-outcomes', authorize('faculty','admin','hod'), (req, res) => {
  const { course_id, code, description, bloom_level } = req.body;
  const result = db.prepare('INSERT INTO course_outcomes (course_id,code,description,bloom_level) VALUES (?,?,?,?)').run(course_id,code,description,bloom_level||'Understanding');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/program-outcomes', (req, res) => {
  const { program_id } = req.query;
  let q = `SELECT po.*, p.name as program_name FROM program_outcomes po JOIN programs p ON po.program_id = p.id WHERE 1=1`;
  const params = [];
  if (program_id) { q += ' AND po.program_id = ?'; params.push(program_id); }
  q += ' ORDER BY po.code';
  res.json(db.prepare(q).all(...params));
});

router.post('/program-outcomes', authorize('admin','hod','registrar'), (req, res) => {
  const { program_id, code, description, category } = req.body;
  const result = db.prepare('INSERT INTO program_outcomes (program_id,code,description,category) VALUES (?,?,?,?)').run(program_id,code,description,category||'knowledge');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/mapping', (req, res) => {
  const { program_id } = req.query;
  const cos = db.prepare(`SELECT co.*, c.name as course_name FROM course_outcomes co JOIN courses c ON co.course_id = c.id ${program_id ? 'WHERE c.program_id = ?' : ''} ORDER BY c.name, co.code`).all(...(program_id ? [program_id] : []));
  const pos = db.prepare(`SELECT * FROM program_outcomes ${program_id ? 'WHERE program_id = ?' : ''} ORDER BY code`).all(...(program_id ? [program_id] : []));
  const mappings = db.prepare('SELECT * FROM co_po_mapping').all();
  const mapMatrix = {};
  mappings.forEach(m => { if (!mapMatrix[m.co_id]) mapMatrix[m.co_id] = {}; mapMatrix[m.co_id][m.po_id] = m.strength; });
  res.json({ cos, pos, mapMatrix });
});

router.post('/mapping', authorize('faculty','admin','hod'), (req, res) => {
  const { co_id, po_id, strength } = req.body;
  try {
    db.prepare('INSERT INTO co_po_mapping (co_id,po_id,strength) VALUES (?,?,?) ON CONFLICT(co_id,po_id) DO UPDATE SET strength=excluded.strength').run(co_id,po_id,strength||2);
    res.json({ message: 'Mapping saved.' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

router.get('/attainment', (req, res) => {
  const { program_id, academic_year_id } = req.query;
  const attainment = db.prepare(`SELECT ca.*, co.code as co_code, co.description, c.name as course_name, ay.name as academic_year
    FROM co_attainment ca JOIN course_outcomes co ON ca.co_id = co.id JOIN courses c ON co.course_id = c.id
    LEFT JOIN academic_years ay ON ca.academic_year_id = ay.id WHERE 1=1 ${program_id ? 'AND c.program_id = ?' : ''} ${academic_year_id ? 'AND ca.academic_year_id = ?' : ''} ORDER BY c.name, co.code`).all(...[program_id, academic_year_id].filter(Boolean));
  res.json(attainment);
});

module.exports = router;
