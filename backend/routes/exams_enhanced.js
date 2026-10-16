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

// Question Paper Review (submit / reject)
router.put('/question-papers/:id/submit-review', authorize('faculty','hod'), (req, res) => {
  const { remarks } = req.body;
  db.prepare("UPDATE question_papers SET status='under_review', review_remarks=? WHERE id=?").run(remarks||'', req.params.id);
  res.json({ message: 'Submitted for review.' });
});

router.put('/question-papers/:id/reject', authorize('admin','registrar','hod'), (req, res) => {
  const { remarks } = req.body;
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id=?').get(req.user.id);
  db.prepare("UPDATE question_papers SET status='rejected', reviewed_by=?, review_remarks=? WHERE id=?").run(fac?.id||null, remarks||'', req.params.id);
  res.json({ message: 'Question paper rejected.' });
});

// Answer Sheets
router.get('/answer-sheets', (req, res) => {
  const { examination_id, status, evaluator_id } = req.query;
  let q = `SELECT ans.*, u.name as student_name, s.enrollment_number, e.name as exam_name,
    fu.name as evaluator_name
    FROM answer_sheets ans
    JOIN students s ON ans.student_id = s.id JOIN users u ON s.user_id = u.id
    JOIN examinations e ON ans.examination_id = e.id
    LEFT JOIN faculty f ON ans.evaluator_id = f.id LEFT JOIN users fu ON f.user_id = fu.id
    WHERE 1=1`;
  const params = [];
  if (examination_id) { q += ' AND ans.examination_id=?'; params.push(examination_id); }
  if (status)         { q += ' AND ans.status=?';         params.push(status); }
  if (evaluator_id)   { q += ' AND ans.evaluator_id=?';   params.push(evaluator_id); }
  q += ' ORDER BY ans.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/answer-sheets/collect', authorize('admin','registrar'), (req, res) => {
  const { examination_id } = req.body;
  const exam = db.prepare('SELECT e.*, c.program_id, c.semester FROM examinations e JOIN courses c ON e.course_id=c.id WHERE e.id=?').get(examination_id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  const students = db.prepare("SELECT id FROM students WHERE program_id=? AND semester=? AND status='active'").all(exam.program_id, exam.semester);
  const stmt = db.prepare('INSERT OR IGNORE INTO answer_sheets (examination_id,student_id,answer_sheet_number,status) VALUES (?,?,?,?)');
  const insert = db.transaction(stus => stus.forEach((s,i) => stmt.run(examination_id, s.id, `AS-${examination_id}-${String(s.id).padStart(4,'0')}`, 'pending')));
  insert(students);
  res.json({ message: `${students.length} answer sheets collected.`, count: students.length });
});

router.put('/answer-sheets/:id/assign', authorize('admin','registrar','hod'), (req, res) => {
  const { evaluator_id } = req.body;
  db.prepare("UPDATE answer_sheets SET evaluator_id=?, status='assigned' WHERE id=?").run(evaluator_id, req.params.id);
  res.json({ message: 'Evaluator assigned.' });
});

router.put('/answer-sheets/:id/evaluate', authorize('faculty','admin','registrar'), (req, res) => {
  const { marks_awarded, remarks } = req.body;
  db.prepare("UPDATE answer_sheets SET marks_awarded=?, remarks=?, status='evaluated', evaluated_at=datetime('now') WHERE id=?").run(marks_awarded, remarks||'', req.params.id);
  res.json({ message: 'Answer sheet evaluated.' });
});

router.put('/answer-sheets/:id/finalize', authorize('admin','registrar','hod'), (req, res) => {
  db.prepare("UPDATE answer_sheets SET status='finalized' WHERE id=?").run(req.params.id);
  res.json({ message: 'Answer sheet finalized.' });
});

// Marks Entry (bulk)
router.get('/marks', (req, res) => {
  const { examination_id } = req.query;
  if (!examination_id) return res.status(400).json({ error: 'examination_id required.' });
  const exam = db.prepare('SELECT e.*, c.program_id, c.semester, c.name as course_name FROM examinations e JOIN courses c ON e.course_id=c.id WHERE e.id=?').get(examination_id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  const students = db.prepare(`SELECT s.id, s.enrollment_number, u.name, s.semester,
    r.marks_obtained, r.grade, r.remarks as result_remarks
    FROM students s JOIN users u ON s.user_id=u.id
    LEFT JOIN results r ON r.student_id=s.id AND r.examination_id=?
    WHERE s.program_id=? AND s.semester=? AND s.status='active'
    ORDER BY u.name`).all(examination_id, exam.program_id, exam.semester);
  res.json({ exam, students });
});

router.post('/marks/bulk', authorize('faculty','admin','registrar'), (req, res) => {
  const { results } = req.body;
  if (!Array.isArray(results) || !results.length) return res.status(400).json({ error: 'results array required.' });
  const stmt = db.prepare(`INSERT INTO results (student_id,examination_id,marks_obtained,grade,remarks,entered_by)
    VALUES (?,?,?,?,?,?) ON CONFLICT(student_id,examination_id) DO UPDATE SET marks_obtained=excluded.marks_obtained,grade=excluded.grade,remarks=excluded.remarks`);
  const insert = db.transaction(recs => recs.forEach(r => {
    const exam = db.prepare('SELECT total_marks, passing_marks FROM examinations WHERE id=?').get(r.examination_id);
    let grade = 'F';
    if (exam && r.marks_obtained !== null && r.marks_obtained !== undefined) {
      const pct = (r.marks_obtained / exam.total_marks) * 100;
      if (pct >= 90) grade = 'O'; else if (pct >= 80) grade = 'A+'; else if (pct >= 70) grade = 'A';
      else if (pct >= 60) grade = 'B+'; else if (pct >= 50) grade = 'B'; else if (pct >= 40) grade = 'C'; else grade = 'F';
    }
    stmt.run(r.student_id, r.examination_id, r.marks_obtained, r.grade || grade, r.remarks || '', req.user.id);
  }));
  insert(results);
  res.json({ message: `${results.length} marks saved.` });
});

// Backlog Management
router.get('/backlogs', (req, res) => {
  const { student_id, status } = req.query;
  let q = `SELECT br.*, u.name as student_name, s.enrollment_number, e.name as exam_name,
    c.name as course_name, c.code as course_code
    FROM backlog_registrations br
    JOIN students s ON br.student_id=s.id JOIN users u ON s.user_id=u.id
    JOIN examinations e ON br.examination_id=e.id JOIN courses c ON e.course_id=c.id
    WHERE 1=1`;
  const params = [];
  if (student_id) { q += ' AND br.student_id=?'; params.push(student_id); }
  if (status)     { q += ' AND br.status=?';     params.push(status); }
  q += ' ORDER BY br.registration_date DESC';
  res.json(db.prepare(q).all(...params));
});

router.post('/backlogs', authorize('admin','registrar','faculty','hod'), (req, res) => {
  const { student_id, examination_id, attempt_number, fee_paid } = req.body;
  try {
    const result = db.prepare('INSERT INTO backlog_registrations (student_id,examination_id,attempt_number,fee_paid,registered_by) VALUES (?,?,?,?,?)').run(student_id, examination_id, attempt_number||1, fee_paid||0, req.user.id);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Backlog registered.' });
  } catch { res.status(400).json({ error: 'Already registered for this attempt.' }); }
});

router.put('/backlogs/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { status, remarks } = req.body;
  db.prepare('UPDATE backlog_registrations SET status=?, remarks=? WHERE id=?').run(status, remarks||'', req.params.id);
  res.json({ message: 'Backlog updated.' });
});

router.get('/backlogs/summary', (req, res) => {
  const summary = db.prepare(`SELECT s.id, s.enrollment_number, u.name,
    COUNT(DISTINCT br.id) as total_backlogs,
    COUNT(DISTINCT CASE WHEN br.status IN ('registered','appeared') THEN br.id END) as active_backlogs,
    COUNT(DISTINCT CASE WHEN br.status='passed' THEN br.id END) as cleared
    FROM backlog_registrations br
    JOIN students s ON br.student_id=s.id JOIN users u ON s.user_id=u.id
    GROUP BY s.id ORDER BY active_backlogs DESC`).all();
  res.json(summary);
});

// Year Results
router.get('/year-results', (req, res) => {
  const { academic_year_id, program_id, semester } = req.query;
  let q = `SELECT s.id as student_id, s.enrollment_number, u.name as student_name,
    s.semester, p.name as program_name, p.code as program_code,
    COUNT(DISTINCT r.id) as exams_appeared,
    SUM(r.marks_obtained) as total_marks_obtained,
    SUM(e.total_marks) as total_max_marks,
    ROUND(SUM(r.marks_obtained)*100.0/NULLIF(SUM(e.total_marks),0),2) as percentage,
    COUNT(DISTINCT CASE WHEN r.grade='F' THEN r.id END) as failures,
    COUNT(DISTINCT CASE WHEN r.grade!='F' THEN r.id END) as passes
    FROM students s JOIN users u ON s.user_id=u.id JOIN programs p ON s.program_id=p.id
    LEFT JOIN results r ON r.student_id=s.id
    LEFT JOIN examinations e ON r.examination_id=e.id
    WHERE s.status='active'`;
  const params = [];
  if (program_id) { q += ' AND s.program_id=?'; params.push(program_id); }
  if (semester)   { q += ' AND s.semester=?';   params.push(semester); }
  if (academic_year_id) { q += ' AND e.academic_year_id=?'; params.push(academic_year_id); }
  q += ' GROUP BY s.id ORDER BY percentage DESC NULLS LAST';
  res.json(db.prepare(q).all(...params));
});

// Result Declaration
router.get('/declarations', (req, res) => {
  const decls = db.prepare(`SELECT rd.*, ay.name as academic_year, p.name as program_name, u.name as declared_by_name
    FROM result_declarations rd
    LEFT JOIN academic_years ay ON rd.academic_year_id=ay.id
    LEFT JOIN programs p ON rd.program_id=p.id
    LEFT JOIN users u ON rd.declared_by=u.id
    ORDER BY rd.created_at DESC`).all();
  res.json(decls);
});

router.post('/declarations', authorize('admin','registrar','hod'), (req, res) => {
  const { academic_year_id, program_id, semester, exam_type, title, remarks } = req.body;
  const result = db.prepare('INSERT INTO result_declarations (academic_year_id,program_id,semester,exam_type,title,declared_by,remarks) VALUES (?,?,?,?,?,?,?)').run(academic_year_id||null, program_id||null, semester||null, exam_type||null, title, req.user.id, remarks||'');
  res.status(201).json({ id: result.lastInsertRowid, message: 'Result declaration created.' });
});

router.put('/declarations/:id/publish', authorize('admin','registrar'), (req, res) => {
  db.prepare("UPDATE result_declarations SET status='published', published_at=datetime('now') WHERE id=?").run(req.params.id);
  res.json({ message: 'Results published.' });
});

router.put('/declarations/:id/withhold', authorize('admin','registrar'), (req, res) => {
  db.prepare("UPDATE result_declarations SET status='withheld' WHERE id=?").run(req.params.id);
  res.json({ message: 'Results withheld.' });
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
  const hallTickets    = db.prepare('SELECT COUNT(*) as c FROM hall_tickets').get();
  const seatingPlans   = db.prepare('SELECT COUNT(*) as c FROM seating_plans').get();
  const questionPapers = db.prepare('SELECT COUNT(*) as c FROM question_papers').get();
  const maskingSheets  = db.prepare('SELECT COUNT(*) as c FROM masking_sheets').get();
  const gradingSchemas = db.prepare('SELECT COUNT(*) as c FROM grading_schemas WHERE is_active = 1').get();
  const certTemplates  = db.prepare('SELECT COUNT(*) as c FROM certificate_templates WHERE is_active = 1').get();
  const invigilators   = db.prepare('SELECT COUNT(*) as c FROM invigilators').get();
  const answerSheets   = db.prepare('SELECT COUNT(*) as c FROM answer_sheets').get();
  const backlogs       = db.prepare("SELECT COUNT(*) as c FROM backlog_registrations WHERE status IN ('registered','appeared')").get();
  const declarations   = db.prepare('SELECT COUNT(*) as c FROM result_declarations').get();
  const marksEntered   = db.prepare('SELECT COUNT(*) as c FROM results').get();
  res.json({ hallTickets: hallTickets.c, seatingPlans: seatingPlans.c, questionPapers: questionPapers.c,
    maskingSheets: maskingSheets.c, gradingSchemas: gradingSchemas.c, certTemplates: certTemplates.c,
    invigilators: invigilators.c, answerSheets: answerSheets.c, backlogs: backlogs.c,
    declarations: declarations.c, marksEntered: marksEntered.c });
});

module.exports = router;
