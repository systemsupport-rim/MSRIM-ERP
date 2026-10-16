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
  const parts = [];
  const params = [];
  if (program_id)       { parts.push('c.program_id = ?');        params.push(program_id); }
  if (academic_year_id) { parts.push('ca.academic_year_id = ?'); params.push(academic_year_id); }
  const where = parts.length ? 'AND ' + parts.join(' AND ') : '';
  const attainment = db.prepare(`SELECT ca.*, co.code as co_code, co.description, co.bloom_level,
    c.name as course_name, c.code as course_code, ay.name as academic_year
    FROM co_attainment ca JOIN course_outcomes co ON ca.co_id = co.id JOIN courses c ON co.course_id = c.id
    LEFT JOIN academic_years ay ON ca.academic_year_id = ay.id
    WHERE 1=1 ${where} ORDER BY c.name, co.code`).all(...params);
  res.json(attainment);
});

router.post('/attainment', authorize('faculty','admin','hod','registrar'), (req, res) => {
  const { co_id, academic_year_id, direct_attainment, indirect_attainment, target } = req.body;
  const direct  = parseFloat(direct_attainment)   || 0;
  const indirect= parseFloat(indirect_attainment) || 0;
  const final_attainment = parseFloat((direct * 0.8 + indirect * 0.2).toFixed(2));
  try {
    const existing = db.prepare('SELECT id FROM co_attainment WHERE co_id=? AND (academic_year_id=? OR (academic_year_id IS NULL AND ? IS NULL))').get(co_id, academic_year_id||null, academic_year_id||null);
    if (existing) {
      db.prepare('UPDATE co_attainment SET direct_attainment=?,indirect_attainment=?,final_attainment=?,target=? WHERE id=?').run(direct, indirect, final_attainment, target||60, existing.id);
    } else {
      db.prepare('INSERT INTO co_attainment (co_id,academic_year_id,direct_attainment,indirect_attainment,final_attainment,target) VALUES (?,?,?,?,?,?)').run(co_id, academic_year_id||null, direct, indirect, final_attainment, target||60);
    }
    res.json({ message: 'Attainment saved.', final_attainment });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

router.put('/attainment/:id', authorize('faculty','admin','hod','registrar'), (req, res) => {
  const { direct_attainment, indirect_attainment, target } = req.body;
  const direct  = parseFloat(direct_attainment)   || 0;
  const indirect= parseFloat(indirect_attainment) || 0;
  const final_attainment = parseFloat((direct * 0.8 + indirect * 0.2).toFixed(2));
  db.prepare('UPDATE co_attainment SET direct_attainment=?,indirect_attainment=?,final_attainment=?,target=? WHERE id=?')
    .run(direct, indirect, final_attainment, target||60, req.params.id);
  res.json({ message: 'Updated.', final_attainment });
});

// Auto-calculate CO attainment from exam results
router.post('/attainment/auto-calculate', authorize('admin','hod','registrar'), (req, res) => {
  const { program_id, academic_year_id } = req.body;
  const cos = db.prepare(`SELECT co.*, c.program_id FROM course_outcomes co JOIN courses c ON co.course_id=c.id ${program_id ? 'WHERE c.program_id=?' : ''}`).all(...(program_id ? [program_id] : []));
  let calculated = 0;
  cos.forEach(co => {
    const exams = db.prepare(`SELECT e.id, e.total_marks, e.passing_marks FROM examinations e WHERE e.course_id=? ${academic_year_id ? 'AND e.academic_year_id=?' : ''}`).all(...[co.course_id, ...(academic_year_id ? [academic_year_id] : [])]);
    if (!exams.length) return;
    let totalStudents = 0, metThreshold = 0;
    exams.forEach(exam => {
      const results = db.prepare('SELECT marks_obtained FROM results WHERE examination_id=?').all(exam.id);
      const threshold = exam.total_marks * 0.6;
      results.forEach(r => { totalStudents++; if (r.marks_obtained >= threshold) metThreshold++; });
    });
    if (totalStudents === 0) return;
    const direct = parseFloat(((metThreshold / totalStudents) * 100).toFixed(2));
    const final  = parseFloat((direct * 0.8).toFixed(2));
    const ex = db.prepare('SELECT id FROM co_attainment WHERE co_id=? AND (academic_year_id=? OR (academic_year_id IS NULL AND ? IS NULL))').get(co.id, academic_year_id||null, academic_year_id||null);
    if (ex) {
      db.prepare('UPDATE co_attainment SET direct_attainment=?,final_attainment=? WHERE id=?').run(direct, final, ex.id);
    } else {
      db.prepare('INSERT INTO co_attainment (co_id,academic_year_id,direct_attainment,indirect_attainment,final_attainment,target) VALUES (?,?,?,0,?,60)').run(co.id, academic_year_id||null, direct, final);
    }
    calculated++;
  });
  res.json({ message: `Auto-calculated attainment for ${calculated} COs.`, calculated });
});

// PO Attainment — derived from CO attainment × CO-PO mapping
router.get('/po-attainment', (req, res) => {
  const { program_id, academic_year_id } = req.query;
  const pos = db.prepare(`SELECT * FROM program_outcomes ${program_id ? 'WHERE program_id=?' : ''} ORDER BY code`).all(...(program_id ? [program_id] : []));
  const parts = []; const params = [];
  if (program_id)       { parts.push('c.program_id=?');          params.push(program_id); }
  if (academic_year_id) { parts.push('ca.academic_year_id=?');   params.push(academic_year_id); }
  const where = parts.length ? 'AND ' + parts.join(' AND ') : '';
  const mappedCOs = db.prepare(`SELECT m.po_id, m.strength, ca.final_attainment
    FROM co_po_mapping m
    JOIN co_attainment ca ON ca.co_id = m.co_id
    JOIN course_outcomes co ON co.id = m.co_id
    JOIN courses c ON c.id = co.course_id
    WHERE ca.final_attainment > 0 ${where}`).all(...params);

  const poAttainment = pos.map(po => {
    const linked = mappedCOs.filter(m => m.po_id === po.id);
    if (!linked.length) return { ...po, attainment: 0, level: 0, co_count: 0 };
    const weighted = linked.reduce((sum, m) => sum + m.final_attainment * m.strength, 0);
    const totalWeight = linked.reduce((sum, m) => sum + m.strength, 0);
    const attainment = totalWeight > 0 ? parseFloat((weighted / totalWeight).toFixed(2)) : 0;
    const level = attainment >= 70 ? 3 : attainment >= 60 ? 2 : attainment > 0 ? 1 : 0;
    return { ...po, attainment, level, co_count: linked.length };
  });
  res.json(poAttainment);
});

// OBE Dashboard summary
router.get('/dashboard', (req, res) => {
  const { program_id, academic_year_id } = req.query;
  const totalCOs    = db.prepare('SELECT COUNT(*) as c FROM course_outcomes').get();
  const totalPOs    = db.prepare(`SELECT COUNT(*) as c FROM program_outcomes ${program_id?'WHERE program_id=?':''}`).get(...(program_id?[program_id]:[]));
  const mappedCOs   = db.prepare('SELECT COUNT(DISTINCT co_id) as c FROM co_po_mapping').get();
  const attainRows  = db.prepare(`SELECT ca.final_attainment, ca.target FROM co_attainment ca JOIN course_outcomes co ON ca.co_id=co.id JOIN courses c ON co.course_id=c.id WHERE 1=1 ${program_id?'AND c.program_id=?':''} ${academic_year_id?'AND ca.academic_year_id=?':''}`).all(...[program_id,academic_year_id].filter(Boolean));
  const avgAttainment = attainRows.length ? (attainRows.reduce((s,r)=>s+r.final_attainment,0)/attainRows.length).toFixed(1) : 0;
  const metTarget   = attainRows.filter(r => r.final_attainment >= r.target).length;
  const bloomDist   = db.prepare("SELECT bloom_level, COUNT(*) as count FROM course_outcomes GROUP BY bloom_level ORDER BY CASE bloom_level WHEN 'Remembering' THEN 1 WHEN 'Understanding' THEN 2 WHEN 'Applying' THEN 3 WHEN 'Analysing' THEN 4 WHEN 'Evaluating' THEN 5 WHEN 'Creating' THEN 6 END").all();
  const coursesWithCOs = db.prepare('SELECT COUNT(DISTINCT course_id) as c FROM course_outcomes').get();
  res.json({ totalCOs: totalCOs.c, totalPOs: totalPOs.c, mappedCOs: mappedCOs.c, avgAttainment: parseFloat(avgAttainment), metTarget, totalWithAttainment: attainRows.length, bloomDist, coursesWithCOs: coursesWithCOs.c });
});

module.exports = router;
