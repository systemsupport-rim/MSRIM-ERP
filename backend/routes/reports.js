const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);
router.use(authorize('admin', 'registrar', 'hod', 'accounts', 'placement'));

router.get('/students', (req, res) => {
  const { program_id, semester, batch_year, status } = req.query;
  let q = `SELECT s.enrollment_number, u.name, u.email, u.phone, s.gender, s.category,
    s.semester, s.section, s.batch_year, s.status, p.name as program_name, p.code as program_code
    FROM students s JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id WHERE 1=1`;
  const params = [];
  if (program_id) { q += ' AND s.program_id = ?'; params.push(program_id); }
  if (semester) { q += ' AND s.semester = ?'; params.push(semester); }
  if (batch_year) { q += ' AND s.batch_year = ?'; params.push(batch_year); }
  q += ` AND s.status = ?`; params.push(status || 'active');
  q += ' ORDER BY p.name, s.semester, s.enrollment_number';
  const students = db.prepare(q).all(...params);
  const byProgram = {}, bySemester = {}, byGender = {}, byCategory = {};
  students.forEach(s => {
    byProgram[s.program_name] = (byProgram[s.program_name] || 0) + 1;
    bySemester[s.semester] = (bySemester[s.semester] || 0) + 1;
    byGender[s.gender || 'Unknown'] = (byGender[s.gender || 'Unknown'] || 0) + 1;
    byCategory[s.category || 'General'] = (byCategory[s.category || 'General'] || 0) + 1;
  });
  res.json({ students, summary: { total: students.length, byProgram, bySemester, byGender, byCategory } });
});

router.get('/attendance', (req, res) => {
  const { course_id, program_id, from_date, to_date, below } = req.query;
  let q = `SELECT s.id, s.enrollment_number, u.name, p.name as program_name, s.semester, s.section,
    COUNT(*) as total_classes,
    SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended,
    ROUND(100.0 * SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(*), 1) as percentage
    FROM attendance a
    JOIN students s ON a.student_id = s.id JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id
    WHERE s.status = 'active'`;
  const params = [];
  if (course_id) { q += ' AND a.course_id = ?'; params.push(course_id); }
  if (program_id) { q += ' AND s.program_id = ?'; params.push(program_id); }
  if (from_date) { q += ' AND a.date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND a.date <= ?'; params.push(to_date); }
  q += ' GROUP BY a.student_id';
  if (below) { q += ' HAVING percentage < ?'; params.push(below); }
  q += ' ORDER BY percentage';
  const records = db.prepare(q).all(...params);
  const below75 = records.filter(r => r.percentage < 75).length;
  const below80 = records.filter(r => r.percentage < 80).length;
  const avg = records.length ? (records.reduce((s, r) => s + r.percentage, 0) / records.length).toFixed(1) : 0;
  res.json({ records, summary: { total: records.length, below75, below80, avgPercentage: avg } });
});

router.get('/results', (req, res) => {
  const { program_id, semester, exam_type, academic_year_id } = req.query;
  let q = `SELECT r.marks_obtained, r.grade, r.remarks,
    u.name as student_name, s.enrollment_number, s.semester, p.name as program_name,
    e.name as exam_name, e.exam_type, e.total_marks, c.name as course_name, c.code as course_code
    FROM results r
    JOIN students s ON r.student_id = s.id JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id
    JOIN examinations e ON r.examination_id = e.id JOIN courses c ON e.course_id = c.id
    WHERE 1=1`;
  const params = [];
  if (program_id) { q += ' AND s.program_id = ?'; params.push(program_id); }
  if (semester) { q += ' AND s.semester = ?'; params.push(semester); }
  if (exam_type) { q += ' AND e.exam_type = ?'; params.push(exam_type); }
  if (academic_year_id) { q += ' AND e.academic_year_id = ?'; params.push(academic_year_id); }
  q += ' ORDER BY s.enrollment_number, c.code';
  const records = db.prepare(q).all(...params);
  const passed = records.filter(r => r.grade !== 'F').length;
  const gradeDistribution = {};
  records.forEach(r => { gradeDistribution[r.grade] = (gradeDistribution[r.grade] || 0) + 1; });
  res.json({ records, summary: { total: records.length, passed, failed: records.length - passed, passRate: records.length ? ((passed / records.length) * 100).toFixed(1) : 0, gradeDistribution } });
});

router.get('/fees', (req, res) => {
  const { program_id, academic_year_id, from_date, to_date } = req.query;
  let q = `SELECT fp.receipt_number, fp.amount_paid, fp.payment_date, fp.payment_mode, fp.transaction_id,
    u.name as student_name, s.enrollment_number, p.name as program_name, fs.fee_type
    FROM fee_payments fp
    JOIN students s ON fp.student_id = s.id JOIN users u ON s.user_id = u.id
    JOIN programs p ON s.program_id = p.id JOIN fee_structures fs ON fp.fee_structure_id = fs.id
    WHERE fp.status = 'paid'`;
  const params = [];
  if (program_id) { q += ' AND s.program_id = ?'; params.push(program_id); }
  if (academic_year_id) { q += ' AND fs.academic_year_id = ?'; params.push(academic_year_id); }
  if (from_date) { q += ' AND fp.payment_date >= ?'; params.push(from_date); }
  if (to_date) { q += ' AND fp.payment_date <= ?'; params.push(to_date); }
  q += ' ORDER BY fp.payment_date DESC';
  const records = db.prepare(q).all(...params);
  const totalCollected = records.reduce((s, r) => s + r.amount_paid, 0);
  const byMode = {};
  records.forEach(r => { byMode[r.payment_mode] = (byMode[r.payment_mode] || 0) + r.amount_paid; });
  const defaulters = db.prepare(`SELECT u.name, s.enrollment_number, p.name as program_name
    FROM students s JOIN users u ON s.user_id = u.id JOIN programs p ON s.program_id = p.id
    WHERE s.status = 'active' AND s.id NOT IN (SELECT DISTINCT student_id FROM fee_payments WHERE status = 'paid')`).all();
  res.json({ records, summary: { totalCollected, transactionCount: records.length, byMode, defaulterCount: defaulters.length }, defaulters });
});

router.get('/placements', (req, res) => {
  const { batch_year, program_id } = req.query;
  let q = `SELECT pa.status, pl.company_name, pl.job_role, pl.package_lpa, pl.drive_date, pl.type,
    u.name as student_name, s.enrollment_number, s.batch_year, p.name as program_name
    FROM placement_applications pa
    JOIN students s ON pa.student_id = s.id JOIN users u ON s.user_id = u.id
    JOIN programs p ON s.program_id = p.id JOIN placements pl ON pa.placement_id = pl.id
    WHERE pa.status = 'selected'`;
  const params = [];
  if (batch_year) { q += ' AND s.batch_year = ?'; params.push(batch_year); }
  if (program_id) { q += ' AND s.program_id = ?'; params.push(program_id); }
  q += ' ORDER BY pl.drive_date DESC';
  const records = db.prepare(q).all(...params);
  const avgPkg = records.length ? (records.reduce((s, r) => s + (r.package_lpa || 0), 0) / records.length).toFixed(2) : 0;
  const maxPkg = records.length ? Math.max(...records.map(r => r.package_lpa || 0)) : 0;
  const byCompany = {};
  records.forEach(r => { byCompany[r.company_name] = (byCompany[r.company_name] || 0) + 1; });
  const stuQ = 'SELECT COUNT(*) as c FROM students WHERE status = \'active\'' + (batch_year ? ' AND batch_year = ?' : '');
  const totalStudents = db.prepare(stuQ).get(...(batch_year ? [batch_year] : []));
  res.json({ records, summary: { totalPlaced: records.length, totalStudents: totalStudents.c, placementPercentage: totalStudents.c ? ((records.length / totalStudents.c) * 100).toFixed(1) : 0, avgPackage: avgPkg, maxPackage: maxPkg, byCompany } });
});

router.get('/faculty', (req, res) => {
  const records = db.prepare(`SELECT f.employee_id, f.designation, f.qualification, f.experience_years, f.employment_type, f.joining_date,
    u.name, u.email, u.phone, d.name as dept_name,
    (SELECT COUNT(*) FROM courses WHERE faculty_id = f.id) as course_count,
    (SELECT COUNT(*) FROM mentor_assignments WHERE mentor_id = f.id AND status = 'active') as mentee_count,
    (SELECT COUNT(*) FROM staff_portfolios WHERE user_id = f.user_id) as portfolio_count
    FROM faculty f JOIN users u ON f.user_id = u.id LEFT JOIN departments d ON f.department_id = d.id
    WHERE u.is_active = 1 ORDER BY d.name, u.name`).all();
  const byDesignation = {}, byDept = {};
  records.forEach(r => {
    byDesignation[r.designation || 'Other'] = (byDesignation[r.designation || 'Other'] || 0) + 1;
    byDept[r.dept_name || 'Unassigned'] = (byDept[r.dept_name || 'Unassigned'] || 0) + 1;
  });
  res.json({ records, summary: { total: records.length, byDesignation, byDept } });
});

router.get('/library', (req, res) => {
  const overdue = db.prepare(`SELECT lt.id, lt.issue_date, lt.due_date, b.title, b.isbn,
    u.name as borrower_name, u.role, CAST(julianday('now') - julianday(lt.due_date) AS INTEGER) as days_overdue
    FROM library_transactions lt JOIN library_books b ON lt.book_id = b.id JOIN users u ON lt.user_id = u.id
    WHERE lt.status = 'issued' AND lt.due_date < date('now') ORDER BY lt.due_date`).all();
  const topBorrowed = db.prepare(`SELECT b.title, b.author, COUNT(*) as borrow_count
    FROM library_transactions lt JOIN library_books b ON lt.book_id = b.id
    GROUP BY lt.book_id ORDER BY borrow_count DESC LIMIT 10`).all();
  const stats = db.prepare('SELECT COUNT(*) as total_books, SUM(total_copies) as total_copies, SUM(available_copies) as available FROM library_books').get();
  res.json({ overdue, topBorrowed, stats });
});

module.exports = router;
