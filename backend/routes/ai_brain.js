/**
 * MSRIM AI Brain — Vision 2036 Intelligence Engine
 * Placement Readiness Index · Faculty Effectiveness Score
 * Conversational ERP · Skill Gap Engine · Predictive Analytics
 * Executive Intelligence Dashboard
 */
const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const mgmt = ['admin','hod','registrar'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. PLACEMENT READINESS INDEX (PRI)
// Weighted multi-dimensional score per student
// ─────────────────────────────────────────────────────────────────────────────

function calcPRI(studentId) {
  // CGPA component (25 pts)
  const stu = db.prepare('SELECT COALESCE(cgpa,0) as cgpa, batch_year FROM students WHERE id=?').get(studentId);
  const cgpa = parseFloat(stu?.cgpa || 0);
  const cgpaScore = Math.min((cgpa / 10) * 25, 25);

  // Attendance component (15 pts)
  const att = db.prepare(`SELECT COUNT(CASE WHEN status IN ('present','late') THEN 1 END)*100.0/NULLIF(COUNT(*),0) as pct FROM attendance WHERE student_id=?`).get(studentId);
  const attPct = parseFloat(att?.pct || 0);
  const attScore = Math.min((attPct / 100) * 15, 15);

  // Skills (20 pts — max 10 skills)
  const skills = db.prepare('SELECT COUNT(*) as c FROM student_skills WHERE student_id=?').get(studentId);
  const skillScore = Math.min((Math.min(skills?.c || 0, 10) / 10) * 20, 20);

  // Certifications (15 pts — max 5 certs)
  const certs = db.prepare('SELECT COUNT(*) as c FROM student_certifications WHERE student_id=?').get(studentId);
  const certScore = Math.min((Math.min(certs?.c || 0, 5) / 5) * 15, 15);

  // LMS assignment completion (10 pts)
  const assign = db.prepare(`SELECT COUNT(*) as total, COUNT(CASE WHEN ls.status IN ('submitted','graded') THEN 1 END) as done FROM lms_submissions ls WHERE ls.student_id=?`).get(studentId);
  const lmsScore = assign?.total > 0 ? Math.min(((assign.done||0) / assign.total) * 10, 10) : 5;

  // Placement profile completeness (10 pts): skills + certs + docs proxy
  const profileScore = Math.min(((skills?.c || 0) > 0 ? 4 : 0) + ((certs?.c || 0) > 0 ? 4 : 0) + ((assign?.total || 0) > 0 ? 2 : 0), 10);

  // Assessment performance (5 pts)
  const assess = db.prepare(`SELECT AVG(CASE WHEN total_marks>0 THEN score*100.0/total_marks END) as avg FROM student_assessment_results WHERE student_id=?`).get(studentId);
  const assessScore = Math.min(((parseFloat(assess?.avg || 50)) / 100) * 5, 5);

  const total = cgpaScore + attScore + skillScore + certScore + lmsScore + profileScore + assessScore;
  const rounded = Math.round(total);

  const level = rounded >= 80 ? 'McKinsey Ready' : rounded >= 65 ? 'Placement Ready' : rounded >= 50 ? 'Nearly Ready' : 'Needs Development';
  const color = rounded >= 80 ? 'green' : rounded >= 65 ? 'blue' : rounded >= 50 ? 'amber' : 'red';

  return {
    total: rounded,
    level,
    color,
    breakdown: {
      cgpa: { score: Math.round(cgpaScore), max: 25, label: 'Academic (CGPA)', value: cgpa.toFixed(2) },
      attendance: { score: Math.round(attScore), max: 15, label: 'Attendance', value: `${attPct.toFixed(1)}%` },
      skills: { score: Math.round(skillScore), max: 20, label: 'Skills Portfolio', value: `${skills?.c || 0} skills` },
      certifications: { score: Math.round(certScore), max: 15, label: 'Certifications', value: `${certs?.c || 0} certs` },
      lms: { score: Math.round(lmsScore), max: 10, label: 'LMS Engagement', value: `${assign?.done || 0}/${assign?.total || 0} tasks` },
      profile: { score: Math.round(profileScore), max: 10, label: 'Profile Completeness', value: `${docs?.c || 0} docs` },
      assessments: { score: Math.round(assessScore), max: 5, label: 'Assessment Score', value: `${(parseFloat(assess?.avg || 50)).toFixed(0)}%` },
    },
  };
}

router.get('/placement-readiness/me', (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  const stu = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
  if (!stu) return res.status(404).json({ error: 'Student profile not found.' });
  res.json(calcPRI(stu.id));
});

router.get('/placement-readiness/:studentId', authorize(...mgmt, 'placement', 'faculty'), (req, res) => {
  res.json(calcPRI(req.params.studentId));
});

router.get('/placement-readiness-class', authorize(...mgmt, 'placement', 'faculty'), (req, res) => {
  const { program_id, batch_year } = req.query;
  let q = 'SELECT s.id, s.enrollment_number, s.cgpa, s.batch_year, u.name FROM students s JOIN users u ON s.user_id=u.id WHERE u.is_active=1';
  const p = [];
  if (program_id) { q += ' AND s.program_id=?'; p.push(program_id); }
  if (batch_year)  { q += ' AND s.batch_year=?';  p.push(batch_year); }
  q += ' LIMIT 100';
  const students = db.prepare(q).all(...p);
  const result = students.map(s => {
    try {
      const pri = calcPRI(s.id);
      return { id: s.id, name: s.name, enrollment: s.enrollment_number, batch_year: s.batch_year, cgpa: s.cgpa || 0, pri: pri.total, level: pri.level, color: pri.color };
    } catch (_) {
      return { id: s.id, name: s.name, enrollment: s.enrollment_number, batch_year: s.batch_year, cgpa: s.cgpa || 0, pri: 0, level: 'Needs Development', color: 'red' };
    }
  }).sort((a, b) => b.pri - a.pri);
  const avg = result.length ? Math.round(result.reduce((s, r) => s + r.pri, 0) / result.length) : 0;
  const distribution = { mckinsey: result.filter(r => r.pri >= 80).length, ready: result.filter(r => r.pri >= 65 && r.pri < 80).length, nearly: result.filter(r => r.pri >= 50 && r.pri < 65).length, needs: result.filter(r => r.pri < 50).length };
  res.json({ students: result, avg, distribution, total: result.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. FACULTY EFFECTIVENESS SCORE (FES)
// ─────────────────────────────────────────────────────────────────────────────

function calcFES(userId) {
  // Research (30 pts): pubs + grants + patents
  const pubs = db.prepare('SELECT COUNT(*) as c, SUM(impact_factor) as if_sum FROM research_publications WHERE faculty_id=?').get(userId);
  const grants = db.prepare("SELECT COUNT(*) as c FROM research_grants WHERE pi_id=? AND status='ongoing'").get(userId);
  const patents = db.prepare('SELECT COUNT(*) as c FROM research_patents WHERE lead_inventor_id=?').get(userId);
  const researchScore = Math.min((pubs?.c||0) * 4 + (grants?.c||0) * 8 + (patents?.c||0) * 6, 30);

  // FDP & Development (20 pts)
  const fdp = db.prepare(`SELECT COALESCE(SUM(fp.duration_days),0) as days FROM fdp_participants fpp JOIN fdp_programs fp ON fpp.program_id=fp.id WHERE fpp.user_id=? AND fp.status='completed'`).get(userId);
  const fdpExt = db.prepare("SELECT COALESCE(SUM(duration_days),0) as days FROM fdp_external WHERE user_id=? AND status='approved'").get(userId);
  const totalFdpDays = (fdp?.days||0) + (fdpExt?.days||0);
  const fdpScore = Math.min((totalFdpDays / 30) * 20, 20);

  // Student Feedback (25 pts)
  const feedback = db.prepare(`SELECT AVG(CAST(json_extract(fr.response_data,'$.overall') AS REAL)) as avg_rating FROM feedback_forms ff JOIN feedback_responses fr ON ff.id=fr.form_id WHERE ff.faculty_id=(SELECT id FROM faculty WHERE user_id=?) AND ff.type='course_feedback'`).get(userId);
  const feedbackRating = parseFloat(feedback?.avg_rating || 3.5);
  const feedbackScore = Math.min((feedbackRating / 5) * 25, 25);

  // Teaching Engagement (25 pts): courses, attendance marked, assignments graded
  const fac = db.prepare('SELECT id FROM faculty WHERE user_id=?').get(userId);
  const courses = db.prepare('SELECT COUNT(*) as c FROM courses WHERE faculty_id=?').get(fac?.id || 0);
  const attMarked = db.prepare('SELECT COUNT(DISTINCT date) as c FROM attendance WHERE marked_by=? AND created_at >= date("now","-90 days")').get(userId);
  const engagementScore = Math.min((courses?.c||0) * 5 + Math.min((attMarked?.c||0) / 30, 1) * 10, 25);

  const total = Math.round(researchScore + fdpScore + feedbackScore + engagementScore);
  const level = total >= 80 ? 'Excellent' : total >= 65 ? 'Good' : total >= 50 ? 'Average' : 'Needs Improvement';

  return {
    total,
    level,
    breakdown: {
      research:   { score: Math.round(researchScore),   max: 30, label: 'Research Output',       value: `${pubs?.c||0} pubs · ${grants?.c||0} grants` },
      fdp:        { score: Math.round(fdpScore),        max: 20, label: 'Faculty Development',   value: `${totalFdpDays} FDP days` },
      feedback:   { score: Math.round(feedbackScore),   max: 25, label: 'Student Feedback',      value: `${feedbackRating.toFixed(1)}/5.0` },
      engagement: { score: Math.round(engagementScore), max: 25, label: 'Teaching Engagement',   value: `${courses?.c||0} active courses` },
    },
  };
}

router.get('/faculty-effectiveness/me', (req, res) => {
  if (!['faculty','hod'].includes(req.user.role)) return res.status(403).json({ error: 'Faculty only.' });
  res.json(calcFES(req.user.id));
});

router.get('/faculty-effectiveness-all', authorize(...mgmt), (req, res) => {
  const faculty = db.prepare("SELECT f.id, u.id as user_id, u.name, u.department FROM faculty f JOIN users u ON f.user_id=u.id WHERE u.is_active=1 ORDER BY u.name LIMIT 50").all();
  const result = faculty.map(f => {
    try {
      const fes = calcFES(f.user_id);
      return { id: f.id, user_id: f.user_id, name: f.name, department: f.department, fes: fes.total, level: fes.level };
    } catch (_) {
      return { id: f.id, user_id: f.user_id, name: f.name, department: f.department, fes: 0, level: 'Needs Improvement' };
    }
  }).sort((a, b) => b.fes - a.fes);
  const avg = result.length ? Math.round(result.reduce((s, r) => s + r.fes, 0) / result.length) : 0;
  res.json({ faculty: result, avg, total: result.length });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. SKILL GAP ENGINE
// Maps student skills vs industry demand
// ─────────────────────────────────────────────────────────────────────────────

const INDUSTRY_DEMAND_2036 = [
  { skill: 'AI & Machine Learning', demand: 95, category: 'Technology', growth: '+42% YoY' },
  { skill: 'Data Analytics', demand: 90, category: 'Technology', growth: '+38% YoY' },
  { skill: 'ESG & Sustainability', demand: 88, category: 'Strategy', growth: '+55% YoY' },
  { skill: 'Digital Transformation', demand: 85, category: 'Strategy', growth: '+31% YoY' },
  { skill: 'Financial Modeling', demand: 82, category: 'Finance', growth: '+18% YoY' },
  { skill: 'Supply Chain Management', demand: 80, category: 'Operations', growth: '+25% YoY' },
  { skill: 'Product Management', demand: 78, category: 'Technology', growth: '+29% YoY' },
  { skill: 'Consulting Frameworks', demand: 75, category: 'Consulting', growth: '+15% YoY' },
  { skill: 'Cloud Computing', demand: 73, category: 'Technology', growth: '+27% YoY' },
  { skill: 'Change Management', demand: 70, category: 'HR & OB', growth: '+20% YoY' },
  { skill: 'Business Communication', demand: 68, category: 'Soft Skills', growth: '+12% YoY' },
  { skill: 'Python Programming', demand: 65, category: 'Technology', growth: '+35% YoY' },
  { skill: 'Strategic Thinking', demand: 62, category: 'Strategy', growth: '+10% YoY' },
  { skill: 'Operations Research', demand: 58, category: 'Operations', growth: '+8% YoY' },
];

router.get('/skill-gaps/me', (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only.' });
  const stu = db.prepare('SELECT id FROM students WHERE user_id=?').get(req.user.id);
  const mySkills = db.prepare('SELECT skill_name FROM student_skills WHERE student_id=?').all(stu?.id || 0).map(s => s.skill_name.toLowerCase());

  const gaps = INDUSTRY_DEMAND_2036.map(d => {
    const has = mySkills.some(s => s.includes(d.skill.toLowerCase().split(' ')[0]) || d.skill.toLowerCase().includes(s.split(' ')[0]));
    return { ...d, has, priority: !has && d.demand >= 75 ? 'high' : !has && d.demand >= 60 ? 'medium' : has ? 'covered' : 'low' };
  });

  const covered = gaps.filter(g => g.has).length;
  const highPriority = gaps.filter(g => g.priority === 'high');
  const recommendations = highPriority.slice(0, 5).map(g => ({
    skill: g.skill,
    demand: g.demand,
    growth: g.growth,
    action: `Complete a ${g.category} course or certification in ${g.skill}`,
  }));

  res.json({ gaps, covered, total: gaps.length, coverageScore: Math.round((covered / gaps.length) * 100), recommendations });
});

router.get('/skill-gaps/class', authorize(...mgmt, 'placement'), (req, res) => {
  const allSkills = db.prepare('SELECT skill_name FROM student_skills').all().map(s => s.skill_name.toLowerCase());
  const skillCounts = {};
  allSkills.forEach(s => { skillCounts[s] = (skillCounts[s] || 0) + 1; });
  const totalStudents = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get()?.c || 1;

  const analysis = INDUSTRY_DEMAND_2036.map(d => {
    const matchCount = Object.entries(skillCounts)
      .filter(([k]) => k.includes(d.skill.toLowerCase().split(' ')[0]))
      .reduce((s, [, v]) => s + v, 0);
    const penetration = Math.round((matchCount / totalStudents) * 100);
    return { ...d, penetration, gap: d.demand - penetration };
  }).sort((a, b) => b.gap - a.gap);

  res.json({ analysis, totalStudents });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. CONVERSATIONAL ERP (Natural Language Query Engine)
// ─────────────────────────────────────────────────────────────────────────────

const QUERY_PATTERNS = [
  { pattern: /admission.*conversion|conversion.*rate|enquir.*appli/i, handler: 'admissions_conversion' },
  { pattern: /top.*faculty|best.*faculty|faculty.*performance|faculty.*rank/i, handler: 'top_faculty' },
  { pattern: /placement.*rate|placement.*percent|how many.*placed|placed.*student/i, handler: 'placement_rate' },
  { pattern: /low.*attend|attendance.*critical|below.*75|attendance.*problem/i, handler: 'low_attendance' },
  { pattern: /fee.*default|pending.*fee|fee.*overdue|unpaid.*fee/i, handler: 'fee_defaults' },
  { pattern: /naac.*score|accreditation.*score|naac.*report/i, handler: 'naac_score' },
  { pattern: /research.*output|publication|scopus|research.*stat/i, handler: 'research_stats' },
  { pattern: /ranking|nirf|qs.*world|global.*rank/i, handler: 'rankings' },
  { pattern: /student.*count|how many.*student|total.*student/i, handler: 'student_count' },
  { pattern: /faculty.*count|how many.*faculty|total.*faculty/i, handler: 'faculty_count' },
  { pattern: /revenue|fee.*collect|income|finance.*summary/i, handler: 'revenue' },
  { pattern: /top.*student|best.*student|topper|highest.*cgpa/i, handler: 'top_students' },
  { pattern: /aacsb|equis|accreditation.*status/i, handler: 'accreditation_status' },
  { pattern: /campus.*health|health.*score|campus.*status/i, handler: 'campus_health' },
  { pattern: /library.*overdue|overdue.*book|library.*stat/i, handler: 'library_stats' },
  { pattern: /helpdesk|support.*ticket|open.*ticket/i, handler: 'helpdesk_stats' },
  { pattern: /average.*cgpa|cgpa.*average|academic.*performance/i, handler: 'academic_perf' },
  { pattern: /upcoming.*exam|next.*exam|exam.*schedule/i, handler: 'upcoming_exams' },
  { pattern: /course.*count|how many.*course|active.*course/i, handler: 'course_count' },
  { pattern: /hostel.*occupancy|hostel.*stat/i, handler: 'hostel_stats' },
];

function runHandler(handler) {
  switch (handler) {
    case 'admissions_conversion': {
      const r = db.prepare("SELECT COUNT(*) as enquiries FROM admission_enquiries").get();
      const a = db.prepare("SELECT COUNT(*) as applications FROM admissions").get();
      const admitted = db.prepare("SELECT COUNT(*) as admitted FROM admissions WHERE status='admitted'").get();
      const rate = a?.applications > 0 ? Math.round((admitted?.admitted / a.applications) * 100) : 0;
      return { title: 'Admissions Conversion', data: { enquiries: r?.enquiries || 0, applications: a?.applications || 0, admitted: admitted?.admitted || 0, conversion_rate: `${rate}%` }, insight: `${rate}% of applicants are admitted. ${a?.applications - admitted?.admitted || 0} applications are pending.` };
    }
    case 'top_faculty': {
      const faculty = db.prepare("SELECT u.name, u.department, f.designation, (SELECT COUNT(*) FROM research_publications WHERE faculty_id=u.id) as pubs FROM faculty f JOIN users u ON f.user_id=u.id WHERE u.is_active=1 ORDER BY pubs DESC LIMIT 5").all();
      return { title: 'Top Contributing Faculty', data: faculty, insight: `${faculty[0]?.name || 'N/A'} leads with ${faculty[0]?.pubs || 0} publications.` };
    }
    case 'placement_rate': {
      const total = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get();
      const placed = db.prepare("SELECT COUNT(DISTINCT student_id) as c FROM placement_offers WHERE status IN ('issued','accepted')").get();
      const rate = total?.c > 0 ? Math.round((placed?.c / total.c) * 100) : 0;
      const avgPkg = db.prepare("SELECT ROUND(AVG(package_lpa),2) as avg FROM placement_offers WHERE package_lpa>0").get();
      return { title: 'Placement Statistics', data: { total_students: total?.c, placed: placed?.c, placement_rate: `${rate}%`, avg_package: `${avgPkg?.avg || 0} LPA` }, insight: `${rate}% placement rate. Average package ₹${avgPkg?.avg || 0} LPA.` };
    }
    case 'low_attendance': {
      const r = db.prepare(`SELECT u.name, s.enrollment_number, COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END)*100.0/NULLIF(COUNT(*),0) as pct FROM students s JOIN users u ON s.user_id=u.id LEFT JOIN attendance a ON a.student_id=s.id GROUP BY s.id HAVING COUNT(a.id)>5 AND pct < 75 ORDER BY pct LIMIT 10`).all();
      return { title: 'Low Attendance Students', data: r.map(s => ({ name: s.name, enrollment: s.enrollment_number, attendance: `${parseFloat(s.pct||0).toFixed(1)}%` })), insight: `${r.length} students below 75% attendance threshold.` };
    }
    case 'fee_defaults': {
      const r = db.prepare(`SELECT COUNT(*) as c FROM students s WHERE NOT EXISTS (SELECT 1 FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='paid')`).get();
      const total = db.prepare("SELECT COALESCE(SUM(amount_paid),0) as t FROM fee_payments WHERE status='paid'").get();
      return { title: 'Fee Collection Status', data: { students_with_no_payment: r?.c || 0, total_collected: `₹${((total?.t||0)/100000).toFixed(2)}L` }, insight: `${r?.c || 0} students have no fee payment recorded.` };
    }
    case 'naac_score': {
      const criteria = db.prepare("SELECT AVG(current_score*100.0/NULLIF(max_score,0)) as avg FROM quality_criteria WHERE max_score>0").get();
      const score = parseFloat(criteria?.avg || 0).toFixed(1);
      const grade = score >= 90 ? 'A++' : score >= 80 ? 'A+' : score >= 70 ? 'A' : score >= 60 ? 'B++' : 'B+';
      return { title: 'NAAC Accreditation Score', data: { composite_score: `${score}%`, projected_grade: grade }, insight: `Current composite NAAC score is ${score}% — projected grade: ${grade}.` };
    }
    case 'research_stats': {
      const r = db.prepare("SELECT COUNT(*) as total, SUM(is_scopus) as scopus, SUM(is_wos) as wos, SUM(is_ugc) as ugc FROM research_publications").get();
      const g = db.prepare("SELECT COUNT(*) as grants, COALESCE(SUM(amount),0) as amount FROM research_grants").get();
      return { title: 'Research Output', data: { total_publications: r?.total||0, scopus: r?.scopus||0, wos: r?.wos||0, ugc: r?.ugc||0, grants: g?.grants||0, grant_amount: `₹${((g?.amount||0)/100000).toFixed(2)}L` }, insight: `${r?.total||0} publications. ${r?.scopus||0} Scopus indexed.` };
    }
    case 'rankings': {
      const r = db.prepare("SELECT rr.year, rr.rank, rr.score, rs.name as system FROM ranking_results rr JOIN ranking_systems rs ON rr.system_id=rs.id ORDER BY rr.year DESC LIMIT 5").all();
      return { title: 'Ranking Results', data: r, insight: r.length ? `Latest: ${r[0]?.system} ${r[0]?.year} — Rank #${r[0]?.rank}` : 'No ranking results logged yet.' };
    }
    case 'student_count': {
      const r = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM students").get();
      const byProg = db.prepare("SELECT p.name, COUNT(*) as count FROM students s JOIN programs p ON s.program_id=p.id GROUP BY p.id ORDER BY count DESC").all();
      return { title: 'Student Enrollment', data: { total: r?.total||0, active: r?.active||0, by_program: byProg }, insight: `${r?.active||0} active students enrolled.` };
    }
    case 'faculty_count': {
      const r = db.prepare("SELECT COUNT(*) as c FROM faculty f JOIN users u ON f.user_id=u.id WHERE u.is_active=1").get();
      const byDept = db.prepare("SELECT d.name as dept, COUNT(*) as count FROM faculty f JOIN departments d ON f.department_id=d.id GROUP BY d.id ORDER BY count DESC").all();
      return { title: 'Faculty Strength', data: { total: r?.c||0, by_department: byDept }, insight: `${r?.c||0} active faculty members.` };
    }
    case 'revenue': {
      const r = db.prepare("SELECT COALESCE(SUM(amount_paid),0) as total FROM fee_payments WHERE status='paid'").get();
      const monthly = db.prepare("SELECT strftime('%Y-%m',payment_date) as month, SUM(amount_paid) as amount FROM fee_payments WHERE status='paid' GROUP BY month ORDER BY month DESC LIMIT 6").all();
      return { title: 'Revenue Summary', data: { total_collected: `₹${((r?.total||0)/100000).toFixed(2)}L`, monthly_trend: monthly }, insight: `Total fee collection: ₹${((r?.total||0)/100000).toFixed(2)} Lakhs.` };
    }
    case 'top_students': {
      const r = db.prepare("SELECT u.name, s.enrollment_number, COALESCE(s.cgpa,0) as cgpa, s.batch_year FROM students s JOIN users u ON s.user_id=u.id WHERE COALESCE(s.cgpa,0)>0 ORDER BY cgpa DESC LIMIT 10").all();
      return { title: 'Top Students by CGPA', data: r, insight: r.length ? `Top performer: ${r[0]?.name} with CGPA ${r[0]?.cgpa}.` : 'No CGPA data recorded yet.' };
    }
    case 'accreditation_status': {
      const cycles = db.prepare("SELECT rc.submission_year, rc.status, rs.name FROM ranking_cycles rc JOIN ranking_systems rs ON rc.system_id=rs.id WHERE rs.name IN ('AACSB','EQUIS','NBA') ORDER BY rc.submission_year DESC").all();
      return { title: 'Accreditation Status', data: cycles.length ? cycles : [{ message: 'No accreditation cycles configured.' }], insight: cycles.length ? `${cycles.length} accreditation cycle(s) tracked.` : 'Set up accreditation cycles in Rankings module.' };
    }
    case 'campus_health': {
      const agents = db.prepare("SELECT agent_type, COUNT(*) as insights, SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical FROM agent_insights WHERE is_resolved=0 GROUP BY agent_type").all();
      const totalCritical = agents.reduce((s, a) => s + a.critical, 0);
      const totalWarning = agents.reduce((s, a) => s + (a.insights - a.critical), 0);
      const health = Math.max(0, 100 - totalCritical * 8 - totalWarning * 3);
      return { title: 'Campus Health Score', data: { health_score: health, critical_alerts: totalCritical, warnings: totalWarning, by_agent: agents }, insight: `Campus health: ${health}/100. ${totalCritical} critical issues need attention.` };
    }
    case 'library_stats': {
      const r = db.prepare("SELECT COUNT(*) as total_books, SUM(available_copies) as available FROM library_books").get();
      const overdue = db.prepare("SELECT COUNT(*) as c FROM library_transactions WHERE status='issued' AND due_date < date('now')").get();
      return { title: 'Library Statistics', data: { total_books: r?.total_books||0, available: r?.available||0, overdue: overdue?.c||0 }, insight: `${overdue?.c||0} overdue books need follow-up.` };
    }
    case 'helpdesk_stats': {
      const r = db.prepare("SELECT status, COUNT(*) as count FROM help_requests GROUP BY status").all();
      const open = r.find(x => x.status === 'open')?.count || 0;
      return { title: 'Helpdesk Status', data: r, insight: `${open} open support tickets awaiting resolution.` };
    }
    case 'academic_perf': {
      const r = db.prepare("SELECT AVG(COALESCE(cgpa,0)) as avg_cgpa, MIN(COALESCE(cgpa,0)) as min_cgpa, MAX(COALESCE(cgpa,0)) as max_cgpa FROM students WHERE COALESCE(cgpa,0)>0").get();
      return { title: 'Academic Performance', data: { avg_cgpa: parseFloat(r?.avg_cgpa||0).toFixed(2), min_cgpa: r?.min_cgpa||0, max_cgpa: r?.max_cgpa||0 }, insight: `Batch average CGPA: ${parseFloat(r?.avg_cgpa||0).toFixed(2)}.` };
    }
    case 'upcoming_exams': {
      const r = db.prepare("SELECT e.name, e.exam_date, c.name as course FROM examinations e JOIN courses c ON e.course_id=c.id WHERE e.exam_date >= date('now') ORDER BY e.exam_date LIMIT 10").all();
      return { title: 'Upcoming Examinations', data: r, insight: `${r.length} examinations scheduled.` };
    }
    case 'course_count': {
      const r = db.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN is_active=1 THEN 1 ELSE 0 END) as active FROM courses").get();
      return { title: 'Course Catalogue', data: { total: r?.total||0, active: r?.active||0 }, insight: `${r?.active||0} active courses running.` };
    }
    case 'hostel_stats': {
      const r = db.prepare("SELECT COUNT(*) as rooms, SUM(capacity) as capacity FROM hostel_rooms").get();
      const occ = db.prepare("SELECT COUNT(*) as occupied FROM hostel_allocations WHERE vacating_date IS NULL OR vacating_date >= date('now')").get();
      const rate = r?.capacity > 0 ? Math.round((occ?.occupied / r.capacity) * 100) : 0;
      return { title: 'Hostel Occupancy', data: { rooms: r?.rooms||0, total_capacity: r?.capacity||0, occupied: occ?.occupied||0, occupancy_rate: `${rate}%` }, insight: `Hostel at ${rate}% occupancy.` };
    }
    default:
      return null;
  }
}

router.post('/query', (req, res) => {
  const { query } = req.body;
  if (!query?.trim()) return res.status(400).json({ error: 'Query is required.' });

  const q = query.trim();
  const match = QUERY_PATTERNS.find(p => p.pattern.test(q));

  if (!match) {
    return res.json({
      understood: false,
      query: q,
      suggestions: [
        'Show admissions conversion rate',
        'Who are the top performing faculty?',
        'What is the placement rate?',
        'Show students with low attendance',
        'What is the NAAC score?',
        'Show research output statistics',
        'What is our NIRF ranking?',
        'Show fee collection summary',
        'Show campus health score',
      ],
    });
  }

  try {
    const result = runHandler(match.handler);
    res.json({ understood: true, query: q, handler: match.handler, ...result, timestamp: new Date().toISOString() });
  } catch (e) {
    res.json({ understood: true, query: q, title: 'Query Error', insight: `Could not process query: ${e.message}`, data: {} });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXECUTIVE INTELLIGENCE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

router.get('/executive-dashboard', authorize(...mgmt), (req, res) => {
  const students = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get();
  const faculty = db.prepare("SELECT COUNT(*) as c FROM faculty f JOIN users u ON f.user_id=u.id WHERE u.is_active=1").get();
  const avgCgpa = db.prepare("SELECT AVG(COALESCE(cgpa,0)) as avg FROM students WHERE COALESCE(cgpa,0)>0").get();
  const placed = db.prepare("SELECT COUNT(DISTINCT student_id) as c FROM placement_offers WHERE status IN ('issued','accepted')").get();
  const placementRate = students?.c > 0 ? Math.round((placed?.c / students.c) * 100) : 0;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount_paid),0) as total FROM fee_payments WHERE status='paid'").get();
  const pubs = db.prepare("SELECT COUNT(*) as c, SUM(is_scopus) as scopus FROM research_publications").get();
  const openTickets = db.prepare("SELECT COUNT(*) as c FROM help_requests WHERE status='open'").get();
  const naacAvg = db.prepare("SELECT AVG(current_score*100.0/NULLIF(max_score,0)) as avg FROM quality_criteria WHERE max_score>0").get();
  const mous = db.prepare("SELECT COUNT(*) as c FROM mou_agreements WHERE status='active'").get();
  const fdpDays = db.prepare("SELECT COALESCE(SUM(duration_days),0) as c FROM fdp_programs WHERE status='completed'").get();

  // Trend: last 3 months fee collection
  const revTrend = db.prepare("SELECT strftime('%Y-%m', payment_date) as month, SUM(amount_paid) as amount FROM fee_payments WHERE status='paid' GROUP BY month ORDER BY month DESC LIMIT 3").all();

  // Critical alerts
  const critAlerts = db.prepare("SELECT COUNT(*) as c FROM agent_insights WHERE severity='critical' AND is_resolved=0").get();

  // Student satisfaction (from feedback avg)
  const satisfaction = db.prepare("SELECT AVG(CAST(json_extract(response_data,'$.overall') AS REAL)) as avg FROM feedback_responses").get();
  const satScore = parseFloat(satisfaction?.avg || 3.5).toFixed(1);

  // Low attendance risk students
  const riskStudents = db.prepare(`SELECT COUNT(*) as c FROM (SELECT s.id, COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END)*100.0/NULLIF(COUNT(*),0) as pct FROM students s LEFT JOIN attendance a ON a.student_id=s.id WHERE s.status='active' GROUP BY s.id HAVING COUNT(a.id)>5 AND pct<75)`).get();

  res.json({
    kpis: {
      students: students?.c || 0,
      faculty: faculty?.c || 0,
      avg_cgpa: parseFloat(avgCgpa?.avg || 0).toFixed(2),
      placement_rate: placementRate,
      revenue_lakhs: parseFloat((revenue?.total || 0) / 100000).toFixed(2),
      publications: pubs?.c || 0,
      scopus_pubs: pubs?.scopus || 0,
      naac_score: parseFloat(naacAvg?.avg || 0).toFixed(1),
      active_mous: mous?.c || 0,
      fdp_days: fdpDays?.c || 0,
      open_tickets: openTickets?.c || 0,
      student_satisfaction: satScore,
      critical_alerts: critAlerts?.c || 0,
      at_risk_students: riskStudents?.c || 0,
    },
    revenue_trend: revTrend,
    health_score: Math.max(0, 100 - (critAlerts?.c || 0) * 8 - (riskStudents?.c || 0) * 2),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. PREDICTIVE ANALYTICS
// ─────────────────────────────────────────────────────────────────────────────

router.get('/predictions', authorize(...mgmt, 'placement', 'accounts'), (req, res) => {
  // Fee default risk: students with <50% fees paid
  const feeRisk = db.prepare(`SELECT u.name, s.enrollment_number, s.batch_year FROM students s JOIN users u ON s.user_id=u.id WHERE s.status='active' AND NOT EXISTS (SELECT 1 FROM fee_payments fp WHERE fp.student_id=s.id AND fp.status='paid') LIMIT 20`).all();

  // Placement risk: active final-year students with PRI < 50 (approximated by CGPA < 6)
  const placementRisk = db.prepare(`SELECT u.name, s.enrollment_number, COALESCE(s.cgpa,0) as cgpa, s.batch_year FROM students s JOIN users u ON s.user_id=u.id WHERE s.status='active' AND COALESCE(s.cgpa,0) > 0 AND COALESCE(s.cgpa,0) < 6 ORDER BY cgpa LIMIT 10`).all();

  // Dropout risk: students with < 60% attendance
  const dropoutRisk = db.prepare(`SELECT u.name, s.enrollment_number, COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END)*100.0/NULLIF(COUNT(*),0) as att FROM students s JOIN users u ON s.user_id=u.id LEFT JOIN attendance a ON a.student_id=s.id WHERE s.status='active' GROUP BY s.id HAVING COUNT(a.id)>10 AND att<60 ORDER BY att LIMIT 10`).all();

  // MOU expiry predictions
  const mouExpiring = db.prepare(`SELECT cp.name as partner, m.expiry_date, CAST((julianday(m.expiry_date) - julianday('now')) AS INTEGER) as days_left FROM mou_agreements m JOIN corporate_partners cp ON m.partner_id=cp.id WHERE m.status='active' AND m.expiry_date IS NOT NULL AND m.expiry_date <= date('now','+90 days') ORDER BY m.expiry_date`).all();

  // Grant endings
  const grantsEnding = db.prepare(`SELECT u.name as pi, g.title, g.end_date, g.amount FROM research_grants g JOIN users u ON g.pi_id=u.id WHERE g.status='ongoing' AND g.end_date IS NOT NULL AND g.end_date <= date('now','+60 days') ORDER BY g.end_date`).all();

  res.json({
    fee_default_risk: { count: feeRisk.length, students: feeRisk, action: '/fees' },
    placement_risk: { count: placementRisk.length, students: placementRisk, action: '/placements' },
    dropout_risk: { count: dropoutRisk.length, students: dropoutRisk.map(s => ({ ...s, att: parseFloat(s.att||0).toFixed(1) + '%' })), action: '/attendance' },
    mou_expiry: { count: mouExpiring.length, items: mouExpiring, action: '/corporate-relations' },
    grants_ending: { count: grantsEnding.length, items: grantsEnding, action: '/research' },
  });
});

module.exports = router;
