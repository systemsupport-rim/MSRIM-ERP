const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/overview', authorize('admin','registrar','hod'), (req, res) => {
  const students = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get();
  const faculty = db.prepare('SELECT COUNT(*) as c FROM faculty').get();
  const courses = db.prepare('SELECT COUNT(*) as c FROM courses').get();
  const placed = db.prepare("SELECT COUNT(*) as c FROM placement_applications WHERE status='selected'").get();
  const avgAttendance = db.prepare("SELECT ROUND(100.0*SUM(CASE WHEN status='present' OR status='late' THEN 1 ELSE 0 END)/COUNT(*),1) as avg FROM attendance").get();
  const feeCollected = db.prepare("SELECT SUM(amount_paid) as total FROM fee_payments WHERE status='paid'").get();
  const libraryIssued = db.prepare("SELECT COUNT(*) as c FROM library_transactions WHERE status='issued'").get();
  const helpOpen = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status='open'").get();
  const feedPosts = db.prepare('SELECT COUNT(*) as c FROM feed_posts').get();
  const lmsResources = db.prepare('SELECT COUNT(*) as c FROM lms_resources').get();
  res.json({ students: students.c, faculty: faculty.c, courses: courses.c, placed: placed.c, avgAttendance: avgAttendance?.avg||0, feeCollected: feeCollected?.total||0, libraryIssued: libraryIssued.c, helpOpen: helpOpen.c, feedPosts: feedPosts.c, lmsResources: lmsResources.c });
});

router.get('/attendance-trends', authorize('admin','registrar','hod','faculty'), (req, res) => {
  const byDate = db.prepare(`SELECT date, ROUND(100.0*SUM(CASE WHEN status='present' OR status='late' THEN 1 ELSE 0 END)/COUNT(*),1) as percentage, COUNT(*) as total FROM attendance GROUP BY date ORDER BY date DESC LIMIT 30`).all();
  const byCourse = db.prepare(`SELECT c.name as course, c.code, ROUND(100.0*SUM(CASE WHEN a.status='present' OR a.status='late' THEN 1 ELSE 0 END)/COUNT(*),1) as percentage FROM attendance a JOIN courses c ON a.course_id=c.id GROUP BY a.course_id ORDER BY percentage DESC`).all();
  const lowAttendance = db.prepare(`SELECT s.enrollment_number, u.name, ROUND(100.0*SUM(CASE WHEN a.status='present' OR a.status='late' THEN 1 ELSE 0 END)/COUNT(*),1) as percentage FROM attendance a JOIN students s ON a.student_id=s.id JOIN users u ON s.user_id=u.id GROUP BY a.student_id HAVING percentage < 75 ORDER BY percentage`).all();
  res.json({ byDate, byCourse, lowAttendance });
});

router.get('/exam-analytics', authorize('admin','registrar','hod','faculty'), (req, res) => {
  const gradeDistribution = db.prepare("SELECT grade, COUNT(*) as count FROM results GROUP BY grade ORDER BY CASE grade WHEN 'O' THEN 1 WHEN 'A+' THEN 2 WHEN 'A' THEN 3 WHEN 'B+' THEN 4 WHEN 'B' THEN 5 WHEN 'C' THEN 6 ELSE 7 END").all();
  const avgByCourse = db.prepare(`SELECT c.name, c.code, ROUND(AVG(r.marks_obtained),1) as avg_marks, COUNT(*) as students FROM results r JOIN examinations e ON r.examination_id=e.id JOIN courses c ON e.course_id=c.id GROUP BY e.course_id ORDER BY avg_marks DESC`).all();
  const passRate = db.prepare(`SELECT ROUND(100.0*SUM(CASE WHEN r.grade != 'F' THEN 1 ELSE 0 END)/COUNT(*),1) as pass_rate, COUNT(*) as total FROM results r`).get();
  res.json({ gradeDistribution, avgByCourse, passRate });
});

router.get('/placement-analytics', (req, res) => {
  const byStatus = db.prepare("SELECT status, COUNT(*) as count FROM placement_applications GROUP BY status").all();
  const byCompany = db.prepare("SELECT p.company_name, COUNT(*) as applications, SUM(CASE WHEN pa.status='selected' THEN 1 ELSE 0 END) as selected FROM placement_applications pa JOIN placements p ON pa.placement_id=p.id GROUP BY p.company_name ORDER BY selected DESC LIMIT 10").all();
  const avgPkg = db.prepare("SELECT AVG(package_lpa) as avg, MAX(package_lpa) as max, MIN(package_lpa) as min FROM placements WHERE package_lpa > 0").get();
  res.json({ byStatus, byCompany, avgPkg });
});

router.get('/fee-analytics', authorize('admin','registrar','accounts'), (req, res) => {
  const monthly = db.prepare("SELECT strftime('%Y-%m', payment_date) as month, SUM(amount_paid) as collected, COUNT(*) as transactions FROM fee_payments WHERE status='paid' GROUP BY month ORDER BY month").all();
  const byMode = db.prepare("SELECT payment_mode, SUM(amount_paid) as amount, COUNT(*) as count FROM fee_payments WHERE status='paid' GROUP BY payment_mode").all();
  const defaulters = db.prepare("SELECT u.name, s.enrollment_number FROM students s JOIN users u ON s.user_id=u.id WHERE s.id NOT IN (SELECT DISTINCT student_id FROM fee_payments WHERE status='paid') AND s.status='active'").all();
  res.json({ monthly, byMode, defaulters });
});

router.get('/audit-logs', authorize('admin','registrar'), (req, res) => {
  // Synthetic audit log from multiple tables
  const logs = [];
  const recentPayments = db.prepare("SELECT 'Fee Payment' as action, u.name as user, fp.created_at as timestamp, 'Accounts' as module FROM fee_payments fp JOIN students s ON fp.student_id=s.id JOIN users u ON s.user_id=u.id ORDER BY fp.created_at DESC LIMIT 10").all();
  const recentNotices = db.prepare("SELECT 'Notice Posted' as action, u.name as user, n.created_at as timestamp, 'Notice Board' as module FROM notices n JOIN users u ON n.published_by=u.id ORDER BY n.created_at DESC LIMIT 10").all();
  const recentHelpReqs = db.prepare("SELECT 'Help Request Raised' as action, u.name as user, hr.created_at as timestamp, 'Help Center' as module FROM help_requests hr JOIN users u ON hr.raised_by=u.id ORDER BY hr.created_at DESC LIMIT 10").all();
  logs.push(...recentPayments, ...recentNotices, ...recentHelpReqs);
  logs.sort((a,b) => (b.timestamp||'').localeCompare(a.timestamp||''));
  res.json(logs.slice(0,30));
});

module.exports = router;
