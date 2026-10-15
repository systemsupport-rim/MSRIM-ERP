const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/structures', (req, res) => {
  const { program_id, academic_year_id } = req.query;
  let query = `SELECT fs.*, p.name as program_name, ay.name as academic_year
    FROM fee_structures fs JOIN programs p ON fs.program_id = p.id JOIN academic_years ay ON fs.academic_year_id = ay.id WHERE 1=1`;
  const params = [];
  if (program_id) { query += ' AND fs.program_id = ?'; params.push(program_id); }
  if (academic_year_id) { query += ' AND fs.academic_year_id = ?'; params.push(academic_year_id); }
  res.json(db.prepare(query).all(...params));
});

router.post('/structures', authorize('admin','accounts'), (req, res) => {
  const { program_id, academic_year_id, fee_type, amount, due_date, semester } = req.body;
  const result = db.prepare('INSERT INTO fee_structures (program_id,academic_year_id,fee_type,amount,due_date,semester) VALUES (?,?,?,?,?,?)').run(program_id,academic_year_id,fee_type,amount,due_date,semester);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/payments', (req, res) => {
  const { student_id, status } = req.query;
  let stuId = student_id;
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    stuId = stu?.id;
  }

  let query = `SELECT fp.*, u.name as student_name, s.enrollment_number, fs.fee_type, p.name as program_name
    FROM fee_payments fp
    JOIN students st ON fp.student_id = st.id JOIN users u ON st.user_id = u.id
    LEFT JOIN students s ON fp.student_id = s.id
    JOIN fee_structures fs ON fp.fee_structure_id = fs.id JOIN programs p ON fs.program_id = p.id WHERE 1=1`;
  const params = [];
  if (stuId) { query += ' AND fp.student_id = ?'; params.push(stuId); }
  if (status) { query += ' AND fp.status = ?'; params.push(status); }
  query += ' ORDER BY fp.payment_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/payments', authorize('admin','accounts'), (req, res) => {
  const { student_id, fee_structure_id, amount_paid, payment_mode, transaction_id, remarks } = req.body;
  const receipt = `MSRIM-RCPT-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const result = db.prepare(`INSERT INTO fee_payments (student_id,fee_structure_id,amount_paid,payment_mode,transaction_id,receipt_number,status,collected_by,remarks)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(student_id,fee_structure_id,amount_paid,payment_mode||'cash',transaction_id||'',receipt,'paid',req.user.id,remarks||'');
  res.status(201).json({ id: result.lastInsertRowid, receipt_number: receipt });
});

router.get('/student/:studentId/summary', (req, res) => {
  const { studentId } = req.params;
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (!stu || stu.id !== parseInt(studentId)) return res.status(403).json({ error: 'Access denied.' });
  }

  const student = db.prepare(`SELECT s.*, u.name, p.id as prog_id FROM students s JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id WHERE s.id = ?`).get(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const ay = db.prepare('SELECT id FROM academic_years WHERE is_current = 1').get();
  const structures = db.prepare('SELECT * FROM fee_structures WHERE program_id = ? AND academic_year_id = ?').all(student.prog_id, ay?.id || 1);
  const totalDue = structures.reduce((s, f) => s + f.amount, 0);
  const payments = db.prepare("SELECT SUM(amount_paid) as paid FROM fee_payments WHERE student_id = ? AND status = 'paid'").get(studentId);
  const totalPaid = payments?.paid || 0;

  res.json({ student, structures, totalDue, totalPaid, pending: Math.max(0, totalDue - totalPaid) });
});

router.get('/stats', authorize('admin','accounts','registrar'), (req, res) => {
  const total = db.prepare("SELECT SUM(amount_paid) as total FROM fee_payments WHERE status = 'paid'").get();
  const byMonth = db.prepare("SELECT strftime('%Y-%m', payment_date) as month, SUM(amount_paid) as amount, COUNT(*) as count FROM fee_payments WHERE status = 'paid' GROUP BY month ORDER BY month DESC LIMIT 12").all();
  const pending = db.prepare("SELECT COUNT(*) as count FROM fee_payments WHERE status = 'pending'").get();
  res.json({ totalCollected: total?.total || 0, byMonth, pendingCount: pending?.count || 0 });
});

module.exports = router;
