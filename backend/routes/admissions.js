const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { status, program_id, search, batch_year } = req.query;
  let q = `SELECT a.*, p.name as program_name FROM admissions a LEFT JOIN programs p ON a.program_id = p.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND a.status = ?'; params.push(status); }
  if (program_id) { q += ' AND a.program_id = ?'; params.push(program_id); }
  if (batch_year) { q += ' AND a.batch_year = ?'; params.push(batch_year); }
  if (search) { q += ' AND (a.applicant_name LIKE ? OR a.email LIKE ? OR a.form_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  q += ' ORDER BY a.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM admissions').get();
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM admissions GROUP BY status').all();
  const admitted = db.prepare("SELECT COUNT(*) as c FROM admissions WHERE status = 'admitted'").get();
  const docVerified = db.prepare('SELECT COUNT(*) as c FROM admissions WHERE documents_verified = 1').get();
  const formApproved = db.prepare('SELECT COUNT(*) as c FROM admissions WHERE form_approved = 1').get();
  res.json({ total: total.c, byStatus, admitted: admitted.c, docVerified: docVerified.c, formApproved: formApproved.c });
});

// ── Admission Enquiries (must be before /:id) ──────────────────────────────────
router.get('/enquiries', (req, res) => {
  const { status, program_id, search, assigned_to } = req.query;
  let q = `SELECT ae.*, p.name as program_name, u.name as assigned_name
    FROM admission_enquiries ae
    LEFT JOIN programs p ON ae.program_id = p.id
    LEFT JOIN users u ON ae.assigned_to = u.id
    WHERE 1=1`;
  const params = [];
  if (status)      { q += ' AND ae.status=?';      params.push(status); }
  if (program_id)  { q += ' AND ae.program_id=?';  params.push(program_id); }
  if (assigned_to) { q += ' AND ae.assigned_to=?'; params.push(assigned_to); }
  if (search)      { q += ' AND (ae.name LIKE ? OR ae.email LIKE ? OR ae.phone LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  q += ' ORDER BY ae.created_at DESC';
  res.json(db.prepare(q).all(...params));
});

router.get('/enquiries/stats', (req, res) => {
  const total      = db.prepare('SELECT COUNT(*) as c FROM admission_enquiries').get();
  const byStatus   = db.prepare('SELECT status, COUNT(*) as count FROM admission_enquiries GROUP BY status').all();
  const converted  = db.prepare("SELECT COUNT(*) as c FROM admission_enquiries WHERE status='converted'").get();
  const followDue  = db.prepare("SELECT COUNT(*) as c FROM admission_enquiries WHERE follow_up_date <= date('now') AND status NOT IN ('converted','lost')").get();
  res.json({ total: total.c, byStatus, converted: converted.c, followDue: followDue.c });
});

router.post('/enquiries', authorize('admin','registrar','hod'), (req, res) => {
  const { name, email, phone, source, program_id, batch_year, assigned_to, follow_up_date, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });
  const result = db.prepare(`INSERT INTO admission_enquiries (name,email,phone,source,program_id,batch_year,assigned_to,follow_up_date,notes,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`).run(name,email||null,phone||null,source||'walk-in',program_id||null,batch_year||null,assigned_to||null,follow_up_date||null,notes||null,req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/enquiries/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { status, notes, follow_up_date, assigned_to } = req.body;
  const sets = []; const vals = [];
  if (status !== undefined)        { sets.push('status=?');        vals.push(status); }
  if (notes !== undefined)         { sets.push('notes=?');         vals.push(notes); }
  if (follow_up_date !== undefined){ sets.push('follow_up_date=?');vals.push(follow_up_date); }
  if (assigned_to !== undefined)   { sets.push('assigned_to=?');   vals.push(assigned_to); }
  sets.push("updated_at=datetime('now')");
  vals.push(req.params.id);
  db.prepare(`UPDATE admission_enquiries SET ${sets.join(',')} WHERE id=?`).run(...vals);
  res.json({ message: 'Enquiry updated.' });
});

router.post('/enquiries/:id/convert', authorize('admin','registrar'), (req, res) => {
  const enq = db.prepare('SELECT * FROM admission_enquiries WHERE id=?').get(req.params.id);
  if (!enq) return res.status(404).json({ error: 'Enquiry not found.' });
  const { batch_year } = req.body;
  const formNum = `MSRIM-${batch_year || enq.batch_year || 2026}-${String(Date.now()).slice(-5)}`;
  const result = db.prepare(`INSERT INTO admissions (applicant_name,email,phone,program_id,batch_year,form_number,source,enquiry_id)
    VALUES (?,?,?,?,?,?,?,?)`).run(enq.name,enq.email,enq.phone,enq.program_id,batch_year||enq.batch_year||2026,formNum,'enquiry',enq.id);
  db.prepare("UPDATE admission_enquiries SET status='converted', converted_to_id=?, converted_at=datetime('now') WHERE id=?").run(result.lastInsertRowid, enq.id);
  res.status(201).json({ admission_id: result.lastInsertRowid, form_number: formNum, message: 'Enquiry converted to application.' });
});

// ── Admission Settings (must be before /:id) ──────────────────────────────────
router.get('/settings', authorize('admin','registrar'), (req, res) => {
  const settings = db.prepare(`SELECT s.*, p.name as program_name, ay.name as academic_year_name
    FROM admission_settings s
    LEFT JOIN programs p ON s.program_id = p.id
    LEFT JOIN academic_years ay ON s.academic_year_id = ay.id
    ORDER BY ay.name, p.name`).all();
  res.json(settings);
});

router.post('/settings', authorize('admin','registrar'), (req, res) => {
  const { academic_year_id, program_id, intake_target, last_date, fee_amount } = req.body;
  try {
    db.prepare(`INSERT INTO admission_settings (academic_year_id,program_id,intake_target,last_date,fee_amount,updated_by)
      VALUES (?,?,?,?,?,?)
      ON CONFLICT(academic_year_id,program_id) DO UPDATE SET
      intake_target=excluded.intake_target, last_date=excluded.last_date,
      fee_amount=excluded.fee_amount, updated_by=excluded.updated_by, updated_at=datetime('now')`)
      .run(academic_year_id,program_id,intake_target||60,last_date||null,fee_amount||0,req.user.id);
    res.json({ message: 'Settings saved.' });
  } catch(e) { res.status(400).json({ error: e.message }); }
});

router.get('/:id', (req, res) => {
  const app = db.prepare(`SELECT a.*, p.name as program_name, u.name as reviewed_by_name
    FROM admissions a LEFT JOIN programs p ON a.program_id = p.id LEFT JOIN users u ON a.reviewed_by = u.id
    WHERE a.id = ?`).get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found.' });
  const docs = db.prepare('SELECT * FROM admission_documents WHERE admission_id = ? ORDER BY uploaded_at DESC').all(app.id);
  res.json({ ...app, documents: docs });
});

router.post('/', authorize('admin', 'registrar'), (req, res) => {
  const { applicant_name, email, phone, dob, gender, program_id, batch_year, entrance_score, category } = req.body;
  const formNum = `MSRIM-${batch_year || 2025}-${String(Date.now()).slice(-5)}`;
  const result = db.prepare(`INSERT INTO admissions (applicant_name,email,phone,dob,gender,category,program_id,batch_year,form_number,entrance_score) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(applicant_name, email, phone, dob, gender, category || 'General', program_id, batch_year, formNum, entrance_score || null);
  res.status(201).json({ id: result.lastInsertRowid, form_number: formNum });
});

router.put('/:id/status', authorize('admin', 'registrar'), (req, res) => {
  const { status, remarks, documents_verified, form_approved } = req.body;
  db.prepare('UPDATE admissions SET status=?,remarks=?,documents_verified=?,form_approved=?,reviewed_by=? WHERE id=?')
    .run(status, remarks || '', documents_verified ? 1 : 0, form_approved ? 1 : 0, req.user.id, req.params.id);
  res.json({ message: 'Status updated.' });
});

router.put('/:id/verify-documents', authorize('admin', 'registrar'), (req, res) => {
  db.prepare("UPDATE admissions SET documents_verified = 1, status = 'documents_verified', reviewed_by = ? WHERE id = ?").run(req.user.id, req.params.id);
  res.json({ message: 'Documents verified.' });
});

router.put('/:id/approve', authorize('admin', 'registrar'), (req, res) => {
  db.prepare("UPDATE admissions SET form_approved = 1, status = 'form_approved', reviewed_by = ? WHERE id = ?").run(req.user.id, req.params.id);
  res.json({ message: 'Form approved.' });
});

router.post('/:id/admit', authorize('admin', 'registrar'), (req, res) => {
  const bcrypt = require('bcryptjs');
  const admission = db.prepare('SELECT * FROM admissions WHERE id = ?').get(req.params.id);
  if (!admission) return res.status(404).json({ error: 'Application not found.' });
  if (admission.status === 'admitted') return res.status(400).json({ error: 'Applicant already admitted.' });
  if (!admission.documents_verified || !admission.form_approved) return res.status(400).json({ error: 'Documents must be verified and form must be approved before admission.' });

  const { enrollment_number, semester, batch_year, section, roll_number } = req.body;
  if (!enrollment_number) return res.status(400).json({ error: 'enrollment_number is required.' });

  const existing = db.prepare('SELECT id FROM students WHERE enrollment_number = ?').get(enrollment_number);
  if (existing) return res.status(400).json({ error: 'Enrollment number already exists.' });

  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(admission.email);
  if (existingEmail) return res.status(400).json({ error: 'A user with this email already exists.' });

  const username = enrollment_number.toLowerCase().replace(/[^a-z0-9]/g, '');
  const defaultPassword = 'Msrim@123';

  try {
    const userResult = db.prepare('INSERT INTO users (username,password,role,name,email,phone,department) VALUES (?,?,?,?,?,?,?)')
      .run(username, bcrypt.hashSync(defaultPassword, 10), 'student', admission.applicant_name, admission.email, admission.phone || '', 'Management Studies');

    const stuResult = db.prepare(`INSERT INTO students (user_id,enrollment_number,program_id,semester,batch_year,section,roll_number,dob,gender,category,admission_date)
      VALUES (?,?,?,?,?,?,?,?,?,?,date('now'))`)
      .run(userResult.lastInsertRowid, enrollment_number, admission.program_id, semester || 1, batch_year || admission.batch_year, section || 'A', roll_number || null, admission.dob || null, admission.gender || null, admission.category || 'General');

    db.prepare("UPDATE admissions SET status='admitted', converted_student_id=?, reviewed_by=? WHERE id=?")
      .run(stuResult.lastInsertRowid, req.user.id, admission.id);

    res.status(201).json({ message: 'Applicant admitted successfully.', student_id: stuResult.lastInsertRowid, username, defaultPassword });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/:id/documents', authorize('admin', 'registrar'), (req, res) => {
  const { doc_type, doc_name, file_path } = req.body;
  const result = db.prepare('INSERT INTO admission_documents (admission_id,doc_type,doc_name,file_path) VALUES (?,?,?,?)').run(req.params.id, doc_type, doc_name || '', file_path || '');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/:id/documents/:docId/verify', authorize('admin', 'registrar'), (req, res) => {
  db.prepare('UPDATE admission_documents SET verified=1, verified_by=? WHERE id=? AND admission_id=?').run(req.user.id, req.params.docId, req.params.id);
  res.json({ message: 'Document verified.' });
});

// ── Offer Letters ──────────────────────────────────────────────────────────────
router.post('/:id/offer-letter', authorize('admin','registrar'), (req, res) => {
  const admission = db.prepare('SELECT * FROM admissions WHERE id=?').get(req.params.id);
  if (!admission) return res.status(404).json({ error: 'Application not found.' });
  if (!['form_approved','documents_verified'].includes(admission.status)) return res.status(400).json({ error: 'Form must be approved before issuing offer letter.' });
  const existing = db.prepare('SELECT id FROM offer_letters WHERE admission_id=?').get(admission.id);
  if (existing) return res.status(400).json({ error: 'Offer letter already issued.' });
  const result = db.prepare('INSERT INTO offer_letters (admission_id,issued_by,remarks) VALUES (?,?,?)').run(admission.id, req.user.id, req.body.remarks||'');
  db.prepare('UPDATE admissions SET offer_issued=1 WHERE id=?').run(admission.id);
  res.status(201).json({ id: result.lastInsertRowid, message: 'Offer letter issued.' });
});

router.put('/:id/offer-letter/accept', authorize('admin','registrar'), (req, res) => {
  const ol = db.prepare('SELECT id FROM offer_letters WHERE admission_id=?').get(req.params.id);
  if (!ol) return res.status(404).json({ error: 'No offer letter found.' });
  db.prepare("UPDATE offer_letters SET accepted=1, accepted_at=datetime('now') WHERE id=?").run(ol.id);
  res.json({ message: 'Offer accepted.' });
});

router.put('/:id/initiate-fee', authorize('admin','registrar','accounts'), (req, res) => {
  const admission = db.prepare('SELECT * FROM admissions WHERE id=?').get(req.params.id);
  if (!admission) return res.status(404).json({ error: 'Not found.' });
  db.prepare('UPDATE admissions SET fee_initiated=1 WHERE id=?').run(req.params.id);
  res.json({ message: 'Fee initiation recorded.' });
});

router.delete('/:id', authorize('admin', 'registrar'), (req, res) => {
  const admission = db.prepare('SELECT status FROM admissions WHERE id = ?').get(req.params.id);
  if (!admission) return res.status(404).json({ error: 'Application not found.' });
  if (admission.status === 'admitted') return res.status(400).json({ error: 'Cannot delete an admitted applicant.' });
  db.prepare('DELETE FROM admission_documents WHERE admission_id = ?').run(req.params.id);
  db.prepare('DELETE FROM admissions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Application deleted.' });
});

module.exports = router;
