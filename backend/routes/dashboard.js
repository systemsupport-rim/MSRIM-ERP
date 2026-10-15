const express = require('express');
const { db } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { role, id: userId } = req.user;

  if (role === 'admin' || role === 'registrar' || role === 'hod') {
    // ── Core ────────────────────────────────────────────────────────────────
    const students    = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get().c;
    const faculty     = db.prepare('SELECT COUNT(*) as c FROM faculty').get().c;
    const courses     = db.prepare('SELECT COUNT(*) as c FROM courses').get().c;
    const newNotices  = db.prepare("SELECT COUNT(*) as c FROM notices WHERE created_at >= datetime('now','-7 days')").get().c;
    const avgAtt      = db.prepare(`SELECT ROUND(100.0*SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as v FROM attendance WHERE date >= date('now','-30 days')`).get().v || 0;

    // ── Finance ─────────────────────────────────────────────────────────────
    const totalBudget    = db.prepare('SELECT COALESCE(SUM(allocated_amount),0) as v FROM budget_allocations').get().v;
    const totalUtilized  = db.prepare('SELECT COALESCE(SUM(utilized_amount),0) as v FROM budget_allocations').get().v;
    const totalIncome    = db.prepare('SELECT COALESCE(SUM(amount),0) as v FROM income_entries').get().v;
    const feeCollected   = db.prepare("SELECT COALESCE(SUM(amount_paid),0) as v FROM fee_payments WHERE status='paid'").get().v;
    const pendingVouchers= db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM expense_vouchers WHERE status='pending'").get();
    const monthlyFees    = db.prepare(`SELECT strftime('%m',payment_date) as month, SUM(amount_paid) as amount FROM fee_payments WHERE status='paid' AND strftime('%Y',payment_date)=strftime('%Y','now') GROUP BY month ORDER BY month`).all();

    // ── Attendance ───────────────────────────────────────────────────────────
    const criticalStudents = db.prepare(`
      SELECT u.name, s.enrollment_number, s.section,
        ROUND(100.0*SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as pct,
        COUNT(*) as total
      FROM attendance a JOIN students s ON a.student_id=s.id JOIN users u ON s.user_id=u.id
      GROUP BY s.id HAVING pct < 75 ORDER BY pct ASC LIMIT 6
    `).all();
    const attStats = db.prepare(`
      SELECT
        SUM(CASE WHEN pct < 65 THEN 1 ELSE 0 END) as critical,
        SUM(CASE WHEN pct >= 65 AND pct < 75 THEN 1 ELSE 0 END) as low,
        SUM(CASE WHEN pct >= 75 THEN 1 ELSE 0 END) as good
      FROM (
        SELECT ROUND(100.0*SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as pct
        FROM attendance GROUP BY student_id
      )
    `).get();

    // ── Placements ───────────────────────────────────────────────────────────
    const placements     = db.prepare("SELECT COUNT(*) as c FROM placements WHERE status='upcoming'").get().c;
    const placed         = db.prepare("SELECT COUNT(*) as c FROM placement_applications WHERE status='selected'").get().c;
    const companies      = db.prepare('SELECT COUNT(DISTINCT company_name) as c FROM placements').get().c;
    const avgPackage     = db.prepare("SELECT ROUND(AVG(package_lpa),1) as v FROM placements WHERE package_lpa IS NOT NULL AND status='completed'").get().v || 0;
    const maxPackage     = db.prepare("SELECT MAX(package_lpa) as v FROM placements WHERE package_lpa IS NOT NULL").get().v || 0;
    const recentDrives   = db.prepare("SELECT company_name, job_role, package_lpa, status, drive_date FROM placements ORDER BY created_at DESC LIMIT 5").all();

    // ── Procurement ──────────────────────────────────────────────────────────
    const lowStock       = db.prepare('SELECT COUNT(*) as c FROM inventory_items WHERE current_stock <= min_stock AND min_stock > 0').get().c;
    const pendingPRs     = db.prepare("SELECT COUNT(*) as c FROM purchase_requisitions WHERE status='pending'").get().c;
    const urgentPRs      = db.prepare("SELECT COUNT(*) as c FROM purchase_requisitions WHERE status='pending' AND priority='urgent'").get().c;
    const lowStockItems  = db.prepare('SELECT name, current_stock, min_stock, unit FROM inventory_items WHERE current_stock <= min_stock AND min_stock > 0 ORDER BY current_stock ASC LIMIT 4').all();

    // ── Workflow ─────────────────────────────────────────────────────────────
    const wfPending      = db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status='pending'").get().c;
    const wfInProgress   = db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status='in_progress'").get().c;
    const myApprovals    = db.prepare("SELECT COUNT(*) as c FROM workflow_approvals WHERE approver_id=? AND action='pending'").get(userId).c;
    const recentWorkflows= db.prepare(`SELECT wi.title, wi.status, wd.type, u.name as initiated_by, wi.created_at
      FROM workflow_instances wi JOIN workflow_definitions wd ON wi.workflow_id=wd.id JOIN users u ON wi.initiated_by=u.id
      ORDER BY wi.created_at DESC LIMIT 5`).all();

    // ── Alumni ───────────────────────────────────────────────────────────────
    const totalAlumni    = db.prepare('SELECT COUNT(*) as c FROM alumni').get().c;
    const mentors        = db.prepare('SELECT COUNT(*) as c FROM alumni WHERE is_mentor=1').get().c;
    const activeJobs     = db.prepare('SELECT COUNT(*) as c FROM alumni_jobs WHERE is_active=1').get().c;
    const upcomingEvents = db.prepare("SELECT COUNT(*) as c FROM alumni_events WHERE status='upcoming'").get().c;
    const recentJobs     = db.prepare(`SELECT aj.title, aj.company, aj.salary_range, aj.job_type, COALESCE(u.name,al.name) as poster
      FROM alumni_jobs aj LEFT JOIN alumni al ON aj.posted_by=al.id LEFT JOIN users u ON al.user_id=u.id
      WHERE aj.is_active=1 ORDER BY aj.created_at DESC LIMIT 4`).all();

    // ── Accreditation ────────────────────────────────────────────────────────
    const naacCycle      = db.prepare("SELECT * FROM accreditation_cycles WHERE status='in_progress' ORDER BY created_at DESC LIMIT 1").get();
    const naacAvgScore   = db.prepare(`SELECT AVG(CASE WHEN max_score>0 THEN (current_score*100.0/max_score) ELSE 0 END) as v FROM quality_criteria WHERE max_score>0`).get().v || 0;
    const naacCriteria   = db.prepare('SELECT criterion_number, criterion_name, current_score, max_score, status FROM quality_criteria ORDER BY criterion_number LIMIT 7').all();
    const completedCrit  = db.prepare("SELECT COUNT(*) as c FROM quality_criteria WHERE status IN ('completed','verified')").get().c;
    const totalCrit      = db.prepare('SELECT COUNT(*) as c FROM quality_criteria').get().c;
    const iqacMeetings   = db.prepare("SELECT COUNT(*) as c FROM iqac_meetings WHERE status='scheduled' AND date >= date('now')").get().c;

    // ── AI Agents ────────────────────────────────────────────────────────────
    const aiCritical     = db.prepare("SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved=0 AND severity='critical'").get().c;
    const aiWarning      = db.prepare("SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved=0 AND severity='warning'").get().c;
    const aiTotal        = db.prepare('SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved=0').get().c;
    const topAlerts      = db.prepare(`SELECT title, description, agent_type, severity FROM agent_insights WHERE is_resolved=0
      ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, generated_at DESC LIMIT 4`).all();
    let healthScore = 100;
    healthScore -= Math.min(aiCritical * 8, 40);
    healthScore -= Math.min(aiWarning * 3, 25);
    healthScore = Math.max(healthScore, 0);

    // ── Library ──────────────────────────────────────────────────────────────
    const libIssued      = db.prepare("SELECT COUNT(*) as c FROM library_transactions WHERE status='issued'").get().c;
    const libOverdue     = db.prepare("SELECT COUNT(*) as c FROM library_transactions WHERE status='issued' AND due_date < date('now')").get().c;

    // ── Helpdesk ─────────────────────────────────────────────────────────────
    const openTickets    = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status='open'").get().c;

    // ── Recent Notices ────────────────────────────────────────────────────────
    const recentNotices  = db.prepare("SELECT n.*, u.name as published_by_name FROM notices n JOIN users u ON n.published_by=u.id ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 6").all();

    return res.json({
      stats: {
        students, faculty, courses, newNotices, avgAttendance: avgAtt,
        feeCollected, totalBudget, totalUtilized, totalIncome,
        utilizationRate: totalBudget > 0 ? parseFloat(((totalUtilized/totalBudget)*100).toFixed(1)) : 0,
        placements, placed, companies, avgPackage, maxPackage,
        lowStock, pendingPRs, urgentPRs, wfPending, wfInProgress, myApprovals,
        totalAlumni, mentors, activeJobs, upcomingEvents,
        naacScore: parseFloat(naacAvgScore.toFixed(1)), completedCrit, totalCrit, iqacMeetings,
        aiCritical, aiWarning, aiTotal, healthScore,
        libIssued, libOverdue, openTickets,
        pendingVouchers: pendingVouchers.c, pendingVouchersAmt: pendingVouchers.v,
        attCritical: attStats?.critical || 0, attLow: attStats?.low || 0, attGood: attStats?.good || 0,
      },
      monthlyFees, recentNotices, recentDrives, recentWorkflows, recentJobs,
      criticalStudents, lowStockItems, naacCriteria, topAlerts,
      naacCycle: naacCycle || null,
    });
  }

  if (role === 'student') {
    const stu = db.prepare('SELECT s.*, p.name as program_name FROM students s JOIN programs p ON s.program_id=p.id WHERE s.user_id=?').get(userId);
    if (!stu) return res.json({ stats: {} });
    const attSummary = db.prepare(`SELECT COUNT(*) as total, SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) as attended FROM attendance WHERE student_id=? AND date >= date('now','-30 days')`).get(stu.id);
    const attPct = attSummary.total > 0 ? ((attSummary.attended/attSummary.total)*100).toFixed(1) : 0;
    const attOverall = db.prepare(`SELECT ROUND(100.0*SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as v FROM attendance WHERE student_id=?`).get(stu.id).v || 0;
    const courseCount = db.prepare('SELECT COUNT(*) as c FROM courses WHERE program_id=? AND semester=?').get(stu.program_id, stu.semester).c;
    const results = db.prepare('SELECT COUNT(*) as c FROM results WHERE student_id=?').get(stu.id).c;
    const fees = db.prepare("SELECT COALESCE(SUM(amount_paid),0) as v FROM fee_payments WHERE student_id=? AND status='paid'").get(stu.id).v;
    const feesPending = db.prepare("SELECT COUNT(*) as c FROM fee_payments WHERE student_id=? AND status='pending'").get(stu.id).c;
    const notices = db.prepare("SELECT n.*, u.name as published_by_name FROM notices n JOIN users u ON n.published_by=u.id WHERE (n.target_role='all' OR n.target_role='student') AND (n.expires_at IS NULL OR n.expires_at>=date('now')) ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 5").all();
    const recentResults = db.prepare(`SELECT r.*, e.name as exam_name, e.exam_type, e.total_marks, c.name as course_name FROM results r JOIN examinations e ON r.examination_id=e.id JOIN courses c ON e.course_id=c.id WHERE r.student_id=? ORDER BY r.created_at DESC LIMIT 5`).all(stu.id);
    const upcomingExams = db.prepare(`SELECT e.*, c.name as course_name, c.code FROM examinations e JOIN courses c ON e.course_id=c.id WHERE c.program_id=? AND c.semester=? AND e.exam_date>=date('now') ORDER BY e.exam_date LIMIT 5`).all(stu.program_id, stu.semester);
    const placements = db.prepare("SELECT * FROM placements WHERE status='upcoming' ORDER BY drive_date LIMIT 5").all();
    const attByCourse = db.prepare(`SELECT c.name as course_name, c.code, COUNT(*) as total, SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as attended, ROUND(100.0*SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as pct FROM attendance a JOIN courses c ON a.course_id=c.id WHERE a.student_id=? GROUP BY a.course_id ORDER BY pct ASC`).all(stu.id);
    const activeJobs = db.prepare("SELECT title, company, salary_range, job_type, last_date FROM alumni_jobs WHERE is_active=1 ORDER BY created_at DESC LIMIT 4").all();
    return res.json({ studentInfo: stu, stats: { attendance: attPct, attOverall, courses: courseCount, examsGiven: results, feesPaid: fees, feesPending }, notices, recentResults, upcomingExams, placements, attByCourse, activeJobs });
  }

  if (role === 'faculty') {
    const fac = db.prepare('SELECT f.*, d.name as dept_name FROM faculty f LEFT JOIN departments d ON f.department_id=d.id WHERE f.user_id=?').get(userId);
    const myCourses = db.prepare('SELECT c.*, p.name as program_name FROM courses c JOIN programs p ON c.program_id=p.id WHERE c.faculty_id=?').all(fac?.id);
    const totalStudents = myCourses.reduce((s, c) => s + (db.prepare("SELECT COUNT(*) as c FROM students WHERE program_id=? AND semester=? AND status='active'").get(c.program_id, c.semester)?.c || 0), 0);
    const pendingResults = db.prepare(`SELECT COUNT(*) as c FROM examinations e WHERE e.course_id IN (SELECT id FROM courses WHERE faculty_id=?) AND e.exam_date<=date('now') AND e.id NOT IN (SELECT DISTINCT examination_id FROM results)`).get(fac?.id).c;
    const myPendingApprovals = db.prepare("SELECT COUNT(*) as c FROM workflow_approvals WHERE approver_id=? AND action='pending'").get(userId).c;
    const avgAttMyStudents = db.prepare(`SELECT ROUND(100.0*SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as v FROM attendance a WHERE a.course_id IN (SELECT id FROM courses WHERE faculty_id=?) AND a.date>=date('now','-30 days')`).get(fac?.id).v || 0;
    const notices = db.prepare("SELECT n.*, u.name as published_by_name FROM notices n JOIN users u ON n.published_by=u.id WHERE (n.target_role='all' OR n.target_role='faculty') AND (n.expires_at IS NULL OR n.expires_at>=date('now')) ORDER BY n.is_pinned DESC, n.created_at DESC LIMIT 5").all();
    const lowAttStudents = db.prepare(`SELECT u.name, s.enrollment_number, ROUND(100.0*SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),1) as pct FROM attendance a JOIN students s ON a.student_id=s.id JOIN users u ON s.user_id=u.id WHERE a.course_id IN (SELECT id FROM courses WHERE faculty_id=?) GROUP BY s.id HAVING pct < 75 ORDER BY pct ASC LIMIT 5`).all(fac?.id);
    return res.json({ facultyInfo: fac, courses: myCourses, stats: { totalCourses: myCourses.length, totalStudents, pendingResults, myPendingApprovals, avgAttMyStudents }, notices, lowAttStudents });
  }

  if (role === 'librarian') {
    const books = db.prepare('SELECT COUNT(*) as total, COALESCE(SUM(available_copies),0) as available FROM library_books').get();
    const issued = db.prepare("SELECT COUNT(*) as c FROM library_transactions WHERE status='issued'").get().c;
    const overdue = db.prepare("SELECT COUNT(*) as c FROM library_transactions WHERE status='issued' AND due_date < date('now')").get().c;
    const recent = db.prepare(`SELECT lt.*, b.title, u.name FROM library_transactions lt JOIN library_books b ON lt.book_id=b.id JOIN users u ON lt.user_id=u.id ORDER BY lt.issue_date DESC LIMIT 10`).all();
    return res.json({ stats: { totalBooks: books.total, availableCopies: books.available, currentlyIssued: issued, overdue }, recentTransactions: recent });
  }

  if (role === 'accounts') {
    const total = db.prepare("SELECT COALESCE(SUM(amount_paid),0) as v FROM fee_payments WHERE status='paid'").get().v;
    const budget = db.prepare('SELECT COALESCE(SUM(allocated_amount),0) as v FROM budget_allocations').get().v;
    const utilized = db.prepare('SELECT COALESCE(SUM(utilized_amount),0) as v FROM budget_allocations').get().v;
    const pendingExp = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM expense_vouchers WHERE status='pending'").get();
    const recent = db.prepare(`SELECT fp.*, u.name as student_name, s.enrollment_number FROM fee_payments fp JOIN students st ON fp.student_id=st.id JOIN users u ON st.user_id=u.id LEFT JOIN students s ON fp.student_id=s.id ORDER BY fp.created_at DESC LIMIT 10`).all();
    return res.json({ stats: { totalCollected: total, totalBudget: budget, totalUtilized: utilized, utilizationRate: budget > 0 ? parseFloat(((utilized/budget)*100).toFixed(1)) : 0, pendingVouchers: pendingExp.c, pendingAmt: pendingExp.v }, recentPayments: recent });
  }

  if (role === 'placement') {
    const drives = db.prepare("SELECT COUNT(*) as c FROM placements WHERE status='upcoming'").get().c;
    const placed = db.prepare("SELECT COUNT(*) as c FROM placement_applications WHERE status='selected'").get().c;
    const comps = db.prepare('SELECT COUNT(DISTINCT company_name) as c FROM placements').get().c;
    const avgPkg = db.prepare("SELECT ROUND(AVG(package_lpa),1) as v FROM placements WHERE package_lpa IS NOT NULL").get().v || 0;
    const recent = db.prepare(`SELECT pa.*, u.name as student_name, s.enrollment_number, p.company_name, p.job_role, p.package_lpa FROM placement_applications pa JOIN students st ON pa.student_id=st.id JOIN users u ON st.user_id=u.id LEFT JOIN students s ON pa.student_id=s.id JOIN placements p ON pa.placement_id=p.id ORDER BY pa.applied_date DESC LIMIT 10`).all();
    return res.json({ stats: { upcomingDrives: drives, studentsPlaced: placed, companies: comps, avgPackage: avgPkg }, recentApplications: recent });
  }

  res.json({ stats: {} });
});

module.exports = router;
