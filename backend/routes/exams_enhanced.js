const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

// Grading Schemas
router.get('/grading-schemas', (req, res) => {
  res.json(db.prepare('SELECT gs.*, p.name as program_name FROM grading_schemas gs LEFT JOIN programs p ON gs.program_id = p.id ORDER BY gs.created_at DESC').all());
});

router.post('/grading-schemas', authorize('admin','registrar','hod'), (req, res) => {
  const { name, program_id, description, schema_data } = req.body;
  const result = db.prepare('INSERT INTO grading_schemas (name,program_id,description,schema_data,created_by) VALUES (?,?,?,?,?)').run(name,program_id,description||'',JSON.stringify(schema_data),req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

// Hall Tickets
router.get('/hall-tickets', (req, res) => {
  const { examination_id, student_id } = req.query;
  let q = `SELECT ht.*, u.name as student_name, s.enrollment_number, e.name as exam_name, e.exam_date, e.start_time, e.end_time, e.room
    FROM hall_tickets ht JOIN students s ON ht.student_id = s.id JOIN users u ON s.user_id = u.id JOIN examinations e ON ht.examination_id = e.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND ht.student_id = ?'; params.push(stu.id); }
  }
  if (examination_id) { q += ' AND ht.examination_id = ?'; params.push(examination_id); }
  if (student_id) { q += ' AND ht.student_id = ?'; params.push(student_id); }
  q += ' ORDER BY e.exam_date, u.name';
  res.json(db.prepare(q).all(...params));
});

router.post('/hall-tickets/generate', authorize('admin','registrar'), (req, res) => {
  const { examination_id } = req.body;
  const exam = db.prepare('SELECT e.*, c.program_id, c.semester FROM examinations e JOIN courses c ON e.course_id = c.id WHERE e.id = ?').get(examination_id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const students = db.prepare("SELECT id FROM students WHERE program_id = ? AND semester = ? AND status = 'active'").all(exam.program_id, exam.semester);
  const stmt = db.prepare('INSERT OR IGNORE INTO hall_tickets (student_id,examination_id,hall_ticket_number,generated_by) VALUES (?,?,?,?)');
  const insert = db.transaction((stus) => {
    stus.forEach((s, i) => stmt.run(s.id, examination_id, `HT-${examination_id}-${String(s.id).padStart(4,'0')}`, req.user.id));
  });
  insert(students);
  res.json({ message: `${students.length} hall tickets generated.`, count: students.length });
});

// Seating Plans
router.get('/seating/:examinationId', (req, res) => {
  const seating = db.prepare(`SELECT sp.*, u.name as student_name, s.enrollment_number, r.room_number, b.name as building_name
    FROM seating_plans sp JOIN students s ON sp.student_id = s.id JOIN users u ON s.user_id = u.id
    LEFT JOIN infra_rooms r ON sp.room_id = r.id LEFT JOIN buildings b ON r.building_id = b.id
    WHERE sp.examination_id = ? ORDER BY sp.room_id, sp.row_num, sp.col_num`).all(req.params.examinationId);
  res.json(seating);
});

router.post('/seating/generate', authorize('admin','registrar'), (req, res) => {
  const { examination_id, room_ids } = req.body;
  const exam = db.prepare('SELECT e.*, c.program_id, c.semester FROM examinations e JOIN courses c ON e.course_id = c.id WHERE e.id = ?').get(examination_id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });

  const students = db.prepare("SELECT id FROM students WHERE program_id = ? AND semester = ? AND status = 'active' ORDER BY id").all(exam.program_id, exam.semester);
  const rooms = room_ids && room_ids.length > 0 ? room_ids.map(id => db.prepare('SELECT * FROM infra_rooms WHERE id = ?').get(id)).filter(Boolean) : db.prepare("SELECT * FROM infra_rooms WHERE room_type IN ('classroom','lab','seminar','auditorium') AND is_active = 1 ORDER BY capacity DESC").all();

  const stmt = db.prepare('INSERT OR IGNORE INTO seating_plans (examination_id,room_id,student_id,seat_number,row_num,col_num,created_by) VALUES (?,?,?,?,?,?,?)');
  const insert = db.transaction((stus) => {
    let seatNum = 1, roomIdx = 0, row = 1, col = 1, colsPerRow = 6;
    stus.forEach(s => {
      if (roomIdx >= rooms.length) roomIdx = 0;
      const room = rooms[roomIdx];
      stmt.run(examination_id, room.id, s.id, `${room.room_number}-${String(seatNum).padStart(3,'0')}`, row, col, req.user.id);
      col++; seatNum++;
      if (col > colsPerRow) { col = 1; row++; }
      if (seatNum > (room?.capacity || 60)) { seatNum = 1; row = 1; col = 1; roomIdx++; }
    });
  });
  insert(students);
  res.json({ message: `Seating plan generated for ${students.length} students.` });
});

// Question Papers
router.get('/question-papers', (req, res) => {
  const { examination_id } = req.query;
  let q = `SELECT qp.*, e.name as exam_name, u.name as prepared_by_name FROM question_papers qp
    JOIN examinations e ON qp.examination_id = e.id LEFT JOIN faculty f ON qp.prepared_by = f.id LEFT JOIN users u ON f.user_id = u.id WHERE 1=1`;
  const params = [];
  if (examination_id) { q += ' AND qp.examination_id = ?'; params.push(examination_id); }
  q += ' ORDER BY qp.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/question-papers', authorize('faculty','admin','registrar'), (req, res) => {
  const { examination_id, version, total_questions, sections_data } = req.body;
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id);
  const result = db.prepare('INSERT INTO question_papers (examination_id,version,total_questions,sections_data,prepared_by,status) VALUES (?,?,?,?,?,?)').run(examination_id,version||'A',total_questions||0,JSON.stringify(sections_data||{}),fac?.id||null,'draft');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/question-papers/:id/approve', authorize('admin','registrar','hod'), (req, res) => {
  db.prepare("UPDATE question_papers SET status = 'approved', reviewed_by = ? WHERE id = ?").run(
    db.prepare('SELECT id FROM faculty WHERE user_id = ?').get(req.user.id)?.id||null, req.params.id);
  res.json({ message: 'Question paper approved.' });
});

// Masking Sheets
router.get('/masking-sheets', (req, res) => {
  const { examination_id } = req.query;
  let q = `SELECT ms.*, u.name as student_name, s.enrollment_number, e.name as exam_name
    FROM masking_sheets ms JOIN students s ON ms.student_id = s.id JOIN users u ON s.user_id = u.id JOIN examinations e ON ms.examination_id = e.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND ms.student_id = ?'; params.push(stu.id); }
  }
  if (examination_id) { q += ' AND ms.examination_id = ?'; params.push(examination_id); }
  res.json(db.prepare(q).all(...params));
});

router.post('/masking-sheets/generate', authorize('admin','registrar'), (req, res) => {
  const { examination_id } = req.body;
  const exam = db.prepare('SELECT e.*, c.program_id, c.semester FROM examinations e JOIN courses c ON e.course_id = c.id WHERE e.id = ?').get(examination_id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  const students = db.prepare("SELECT id FROM students WHERE program_id = ? AND semester = ? AND status = 'active'").all(exam.program_id, exam.semester);
  const stmt = db.prepare('INSERT OR IGNORE INTO masking_sheets (examination_id,student_id,masked_number,generated_by) VALUES (?,?,?,?)');
  const insert = db.transaction((stus) => {
    stus.forEach((s, i) => stmt.run(examination_id, s.id, `MASK-${examination_id}-${String(1000+i).padStart(4,'0')}`, req.user.id));
  });
  insert(students);
  res.json({ message: `${students.length} masking sheets generated.` });
});

// Invigilators
router.get('/invigilators/:examinationId', (req, res) => {
  const inv = db.prepare(`SELECT iv.*, fu.name as faculty_name, r.room_number FROM invigilators iv
    JOIN faculty f ON iv.faculty_id = f.id JOIN users fu ON f.user_id = fu.id LEFT JOIN infra_rooms r ON iv.room_id = r.id
    WHERE iv.examination_id = ? ORDER BY r.room_number`).all(req.params.examinationId);
  res.json(inv);
});

router.post('/invigilators', authorize('admin','registrar','hod'), (req, res) => {
  const { examination_id, faculty_id, room_id, session } = req.body;
  try {
    db.prepare('INSERT INTO invigilators (examination_id,faculty_id,room_id,session,assigned_by) VALUES (?,?,?,?,?)').run(examination_id,faculty_id,room_id,session||'morning',req.user.id);
    res.status(201).json({ message: 'Invigilator assigned.' });
  } catch { res.status(400).json({ error: 'Already assigned.' }); }
});

// Certificate Templates
router.get('/certificates', (req, res) => {
  const certs = db.prepare('SELECT ct.*, p.name as program_name FROM certificate_templates ct LEFT JOIN programs p ON ct.program_id = p.id ORDER BY ct.name').all();
  res.json(certs);
});

router.post('/certificates', authorize('admin','registrar'), (req, res) => {
  const { name, type, program_id, template_data } = req.body;
  const result = db.prepare('INSERT INTO certificate_templates (name,type,program_id,template_data,created_by) VALUES (?,?,?,?,?)').run(name,type||'degree',program_id||null,template_data||'',req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/stats', (req, res) => {
  const hallTickets = db.prepare('SELECT COUNT(*) as c FROM hall_tickets').get();
  const seatingPlans = db.prepare('SELECT COUNT(*) as c FROM seating_plans').get();
  const questionPapers = db.prepare('SELECT COUNT(*) as c FROM question_papers').get();
  const maskingSheets = db.prepare('SELECT COUNT(*) as c FROM masking_sheets').get();
  const gradingSchemas = db.prepare('SELECT COUNT(*) as c FROM grading_schemas WHERE is_active = 1').get();
  const certTemplates = db.prepare('SELECT COUNT(*) as c FROM certificate_templates WHERE is_active = 1').get();
  const invigilators = db.prepare('SELECT COUNT(*) as c FROM invigilators').get();
  res.json({ hallTickets: hallTickets.c, seatingPlans: seatingPlans.c, questionPapers: questionPapers.c, maskingSheets: maskingSheets.c, gradingSchemas: gradingSchemas.c, certTemplates: certTemplates.c, invigilators: invigilators.c });
});

module.exports = router;
