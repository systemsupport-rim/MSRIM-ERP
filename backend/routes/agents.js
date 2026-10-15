const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Core agent runner functions ──────────────────────────────────────────────

function clearOldInsights(agentType) {
  db.prepare(`DELETE FROM agent_insights WHERE agent_type = ? AND is_resolved = 0`).run(agentType);
}

function addInsight(agentType, severity, title, description, entityType, entityId, actionUrl) {
  db.prepare(`INSERT INTO agent_insights (agent_type, severity, title, description, entity_type, entity_id, action_url) VALUES (?,?,?,?,?,?,?)`).run(agentType, severity, title, description || '', entityType || '', entityId || null, actionUrl || '');
}

function logRun(agentType, count, duration) {
  db.prepare(`INSERT INTO agent_runs (agent_type, status, insights_generated, duration_ms) VALUES (?,?,?,?)`).run(agentType, 'success', count, duration);
  // Keep only last 50 runs per agent
  db.prepare(`DELETE FROM agent_runs WHERE agent_type = ? AND id NOT IN (SELECT id FROM agent_runs WHERE agent_type = ? ORDER BY ran_at DESC LIMIT 50)`).run(agentType, agentType);
}

// ── Agent 1: Student Risk Monitor ───────────────────────────────────────────
function runStudentRiskAgent() {
  const t0 = Date.now();
  clearOldInsights('student_risk');
  let count = 0;

  // Students with low attendance
  try {
    const lowAtt = db.prepare(`
      SELECT u.name, s.enrollment_number, s.id as student_id,
        COUNT(CASE WHEN a.status IN ('present','late') THEN 1 END) * 100.0 / NULLIF(COUNT(a.id), 0) as pct,
        COUNT(a.id) as total
      FROM students s JOIN users u ON s.user_id = u.id
      LEFT JOIN attendance a ON a.student_id = s.id
      GROUP BY s.id HAVING total > 5
      ORDER BY pct ASC LIMIT 20
    `).all();

    lowAtt.forEach(s => {
      const pct = parseFloat(s.pct || 0).toFixed(1);
      if (pct < 65) {
        addInsight('student_risk', 'critical', `Critical Attendance: ${s.name}`, `${s.name} (${s.enrollment_number}) has only ${pct}% attendance — below condonation threshold. Immediate action required.`, 'student', s.student_id, '/students');
        count++;
      } else if (pct < 75) {
        addInsight('student_risk', 'warning', `Low Attendance: ${s.name}`, `${s.name} (${s.enrollment_number}) has ${pct}% attendance — below minimum 75% requirement.`, 'student', s.student_id, '/attendance');
        count++;
      }
    });
  } catch (_) {}

  // Students with pending fees
  try {
    const pendingFees = db.prepare(`
      SELECT u.name, s.enrollment_number, s.id as student_id, COUNT(fp.id) as pending_count, SUM(fs.amount) as pending_amt
      FROM students s JOIN users u ON s.user_id = u.id
      JOIN fee_structures fs ON fs.program_id = s.program_id
      LEFT JOIN fee_payments fp ON fp.student_id = s.id AND fp.fee_structure_id = fs.id AND fp.status = 'paid'
      WHERE fp.id IS NULL AND fs.due_date < date('now')
      GROUP BY s.id HAVING pending_count > 0 LIMIT 10
    `).all();
    pendingFees.forEach(s => {
      addInsight('student_risk', 'warning', `Overdue Fees: ${s.name}`, `${s.name} (${s.enrollment_number}) has ${s.pending_count} overdue fee payment(s) totalling ₹${s.pending_amt?.toLocaleString('en-IN') || '—'}.`, 'student', s.student_id, '/fees');
      count++;
    });
  } catch (_) {}

  // Students with zero attendance
  try {
    const zeroAtt = db.prepare(`
      SELECT u.name, s.enrollment_number, s.id as student_id FROM students s JOIN users u ON s.user_id = u.id
      WHERE s.id NOT IN (SELECT DISTINCT student_id FROM attendance WHERE student_id IS NOT NULL) LIMIT 5
    `).all();
    if (zeroAtt.length > 0) {
      addInsight('student_risk', 'critical', `${zeroAtt.length} Students with Zero Attendance Records`, `${zeroAtt.map(s => s.name).join(', ')} have no attendance records. Verify enrollment status.`, 'attendance', null, '/attendance');
      count++;
    }
  } catch (_) {}

  logRun('student_risk', count, Date.now() - t0);
  return count;
}

// ── Agent 2: Finance Anomaly Detector ───────────────────────────────────────
function runFinanceAgent() {
  const t0 = Date.now();
  clearOldInsights('finance');
  let count = 0;

  // Budget heads with >90% utilization
  try {
    const highUtil = db.prepare(`
      SELECT bh.name, ba.allocated_amount, ba.utilized_amount,
        (ba.utilized_amount * 100.0 / NULLIF(ba.allocated_amount, 0)) as util_pct
      FROM budget_allocations ba JOIN budget_heads bh ON ba.head_id = bh.id
      WHERE ba.allocated_amount > 0 HAVING util_pct >= 90 ORDER BY util_pct DESC LIMIT 10
    `).all();
    highUtil.forEach(h => {
      const pct = parseFloat(h.util_pct).toFixed(1);
      const sev = pct >= 100 ? 'critical' : 'warning';
      addInsight('finance', sev, `${sev === 'critical' ? 'Budget Exceeded' : 'Budget Nearly Exhausted'}: ${h.name}`, `${h.name} is at ${pct}% utilization (₹${h.utilized_amount?.toLocaleString('en-IN')} of ₹${h.allocated_amount?.toLocaleString('en-IN')} allocated). ${sev === 'critical' ? 'Immediate reallocation needed.' : 'Consider requesting additional budget.'}`, 'budget', null, '/finance');
      count++;
    });
  } catch (_) {}

  // Pending expense vouchers > 7 days
  try {
    const stalePending = db.prepare(`
      SELECT COUNT(*) as c, SUM(amount) as total FROM expense_vouchers
      WHERE status = 'pending' AND created_at < datetime('now', '-7 days')
    `).get();
    if (stalePending?.c > 0) {
      addInsight('finance', 'warning', `${stalePending.c} Expense Vouchers Pending > 7 Days`, `₹${stalePending.total?.toLocaleString('en-IN') || 0} in expenses awaiting approval for over a week. Finance team attention required.`, 'expense', null, '/finance');
      count++;
    }
  } catch (_) {}

  // Large single expense (> 5L)
  try {
    const largeExp = db.prepare(`
      SELECT ev.voucher_number, ev.amount, ev.vendor_name, bh.name as head_name FROM expense_vouchers ev
      LEFT JOIN budget_heads bh ON ev.budget_head_id = bh.id
      WHERE ev.amount > 500000 AND ev.status = 'pending' LIMIT 5
    `).all();
    largeExp.forEach(e => {
      addInsight('finance', 'warning', `High-Value Voucher Pending: ${e.voucher_number}`, `₹${e.amount?.toLocaleString('en-IN')} expense from ${e.vendor_name || 'unknown vendor'} under "${e.head_name}" requires senior approval.`, 'expense', null, '/finance');
      count++;
    });
  } catch (_) {}

  // Check if income is 0 (no income recorded this month)
  try {
    const recentIncome = db.prepare(`SELECT COUNT(*) as c FROM income_entries WHERE receipt_date >= date('now', '-30 days')`).get();
    if (recentIncome?.c === 0) {
      addInsight('finance', 'info', 'No Income Entries This Month', 'No income entries recorded in the last 30 days. Ensure fee collection and other income is being logged.', 'income', null, '/finance');
      count++;
    }
  } catch (_) {}

  logRun('finance', count, Date.now() - t0);
  return count;
}

// ── Agent 3: NAAC Score Optimizer ───────────────────────────────────────────
function runNaacAgent() {
  const t0 = Date.now();
  clearOldInsights('naac');
  let count = 0;

  try {
    const activeCycle = db.prepare(`SELECT * FROM accreditation_cycles WHERE status = 'in_progress' ORDER BY created_at DESC LIMIT 1`).get();
    if (!activeCycle) {
      addInsight('naac', 'info', 'No Active NAAC Cycle', 'No accreditation cycle is currently in progress. Create a new cycle to start tracking.', 'cycle', null, '/accreditation');
      logRun('naac', 1, Date.now() - t0);
      return 1;
    }

    const criteria = db.prepare(`SELECT * FROM quality_criteria WHERE cycle_id = ?`).all(activeCycle.id);
    const totalWeight = criteria.reduce((s, c) => s + (c.weightage || 1), 0);
    const weightedScore = criteria.reduce((s, c) => s + (c.max_score > 0 ? (c.current_score / c.max_score) * (c.weightage || 1) : 0), 0);
    const overallPct = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0;

    // Project grade
    const grade = overallPct >= 90 ? 'A++' : overallPct >= 80 ? 'A+' : overallPct >= 70 ? 'A' : overallPct >= 60 ? 'B++' : 'B+';
    const targetGrade = activeCycle.target_grade || 'A+';
    const onTrack = grade >= targetGrade || overallPct >= 80;

    if (!onTrack) {
      addInsight('naac', 'critical', `NAAC Off-Track: Projecting Grade ${grade}`, `Current average score is ${overallPct.toFixed(1)}%. At this rate the projected grade is ${grade}, below target ${targetGrade}. Immediate action needed on weak criteria.`, 'cycle', activeCycle.id, '/accreditation');
      count++;
    } else {
      addInsight('naac', 'success', `NAAC On Track: Projecting Grade ${grade}`, `Overall score at ${overallPct.toFixed(1)}%. Continue current efforts to achieve ${targetGrade} target.`, 'cycle', activeCycle.id, '/accreditation');
      count++;
    }

    // Weak criteria
    criteria.filter(c => c.max_score > 0 && (c.current_score / c.max_score) < 0.6).forEach(c => {
      const pct = ((c.current_score / c.max_score) * 100).toFixed(1);
      const actions = {
        'I': 'Update curriculum design documents, add new electives, map CO-PO matrix',
        'II': 'Improve student feedback scores, add active learning methods, update evaluation rubrics',
        'III': 'Register more faculty publications, file patents, expand community extension programs',
        'IV': 'Update lab equipment inventory, increase digital library subscriptions, add ERP documentation',
        'V': 'Launch new scholarships, improve placement stats, update alumni mentoring data',
        'VI': 'Document governance processes, conduct strategic planning workshops, update committee minutes',
        'VII': 'Implement green campus initiative, add gender sensitization programs, update best practices'
      };
      const suggestion = actions[c.criterion_number] || 'Update evidence files and documentation for this criterion';
      addInsight('naac', 'warning', `Weak Criterion ${c.criterion_number}: ${c.criterion_name} (${pct}%)`, `Score: ${c.current_score}/${c.max_score}. Recommended actions: ${suggestion}`, 'criteria', c.id, '/accreditation');
      count++;
    });

    // Not-started criteria
    const notStarted = criteria.filter(c => c.status === 'not_started').length;
    if (notStarted > 0) {
      addInsight('naac', 'warning', `${notStarted} NAAC Criteria Not Yet Started`, `${notStarted} criterion/criteria have no progress recorded. Assign responsible persons and begin evidence collection immediately.`, 'criteria', null, '/accreditation');
      count++;
    }

    // Upcoming deadline
    if (activeCycle.end_date) {
      const daysLeft = Math.ceil((new Date(activeCycle.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft > 0 && daysLeft < 90) {
        addInsight('naac', daysLeft < 30 ? 'critical' : 'warning', `NAAC Submission Deadline in ${daysLeft} Days`, `${activeCycle.name} ends on ${activeCycle.end_date}. Ensure all criteria are completed and evidence is compiled.`, 'cycle', activeCycle.id, '/accreditation');
        count++;
      }
    }
  } catch (_) {}

  logRun('naac', count, Date.now() - t0);
  return count;
}

// ── Agent 4: Procurement Intelligence ───────────────────────────────────────
function runProcurementAgent() {
  const t0 = Date.now();
  clearOldInsights('procurement');
  let count = 0;

  // Low stock items
  try {
    const lowStock = db.prepare(`SELECT * FROM inventory_items WHERE current_stock <= min_stock AND min_stock > 0`).all();
    lowStock.forEach(item => {
      const sev = item.current_stock <= 0 ? 'critical' : 'warning';
      addInsight('procurement', sev, `${sev === 'critical' ? 'Out of Stock' : 'Low Stock'}: ${item.name}`, `Current stock: ${item.current_stock} ${item.unit}. Minimum required: ${item.min_stock} ${item.unit}. Location: ${item.location || 'N/A'}. Raise a purchase requisition immediately.`, 'inventory', item.id, '/procurement');
      count++;
    });
  } catch (_) {}

  // Pending PRs older than 3 days
  try {
    const stalePRs = db.prepare(`
      SELECT pr.*, u.name as requester FROM purchase_requisitions pr LEFT JOIN users u ON pr.requested_by = u.id
      WHERE pr.status = 'pending' AND pr.created_at < datetime('now', '-3 days') LIMIT 10
    `).all();
    if (stalePRs.length > 0) {
      addInsight('procurement', 'warning', `${stalePRs.length} Purchase Requisitions Pending Approval`, `PRs raised by ${[...new Set(stalePRs.map(p => p.requester))].join(', ')} have been waiting over 3 days. Review and approve to avoid operational delays.`, 'pr', null, '/procurement');
      count++;
    }
  } catch (_) {}

  // Overdue PO deliveries
  try {
    const overduePOs = db.prepare(`
      SELECT po.po_number, po.total_amount, v.name as vendor_name, po.delivery_date FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      WHERE po.status NOT IN ('received','cancelled') AND po.delivery_date < date('now') LIMIT 10
    `).all();
    overduePOs.forEach(po => {
      addInsight('procurement', 'warning', `Overdue Delivery: ${po.po_number}`, `PO from ${po.vendor_name || 'vendor'} worth ₹${po.total_amount?.toLocaleString('en-IN')} was due on ${po.delivery_date}. Follow up required.`, 'po', null, '/procurement');
      count++;
    });
  } catch (_) {}

  // Urgent PRs
  try {
    const urgentPRs = db.prepare(`SELECT COUNT(*) as c FROM purchase_requisitions WHERE priority = 'urgent' AND status = 'pending'`).get();
    if (urgentPRs?.c > 0) {
      addInsight('procurement', 'critical', `${urgentPRs.c} URGENT Purchase Requisition(s) Pending`, `${urgentPRs.c} requisition(s) marked URGENT are awaiting approval. Immediate attention required.`, 'pr', null, '/procurement');
      count++;
    }
  } catch (_) {}

  logRun('procurement', count, Date.now() - t0);
  return count;
}

// ── Agent 5: Campus Pulse Engine ────────────────────────────────────────────
function runCampusPulseAgent() {
  const t0 = Date.now();
  clearOldInsights('campus_pulse');
  let count = 0;

  try {
    // Overall campus health metrics
    const metrics = {};
    try { metrics.students = db.prepare(`SELECT COUNT(*) as c FROM students`).get().c; } catch (_) { metrics.students = 0; }
    try { metrics.faculty = db.prepare(`SELECT COUNT(*) as c FROM faculty`).get().c; } catch (_) { metrics.faculty = 0; }
    try { metrics.openTickets = db.prepare(`SELECT COUNT(*) as c FROM help_requests WHERE status = 'open'`).get().c; } catch (_) { metrics.openTickets = 0; }
    try { metrics.pendingWorkflows = db.prepare(`SELECT COUNT(*) as c FROM workflow_instances WHERE status = 'pending'`).get().c; } catch (_) { metrics.pendingWorkflows = 0; }
    try { metrics.activeJobs = db.prepare(`SELECT COUNT(*) as c FROM alumni_jobs WHERE is_active = 1`).get().c; } catch (_) { metrics.activeJobs = 0; }

    // Health score (0-100)
    let score = 100;
    if (metrics.openTickets > 10) score -= 10;
    if (metrics.openTickets > 20) score -= 10;
    if (metrics.pendingWorkflows > 5) score -= 5;
    if (metrics.pendingWorkflows > 15) score -= 10;

    // Helpdesk SLA check
    try {
      const slaBreached = db.prepare(`
        SELECT COUNT(*) as c FROM help_requests hr
        JOIN help_services hs ON hr.service_id = hs.id
        WHERE hr.status = 'open' AND datetime(hr.created_at, '+' || hs.sla_hours || ' hours') < datetime('now')
      `).get().c;
      if (slaBreached > 0) {
        addInsight('campus_pulse', 'critical', `${slaBreached} Helpdesk Ticket(s) Breaching SLA`, `${slaBreached} campus support request(s) have exceeded their Service Level Agreement deadline. Escalation required.`, 'helpdesk', null, '/helpdesk');
        score -= Math.min(slaBreached * 3, 15);
        count++;
      }
    } catch (_) {}

    // Notice board activity
    try {
      const recentNotices = db.prepare(`SELECT COUNT(*) as c FROM notices WHERE created_at >= datetime('now', '-7 days')`).get().c;
      if (recentNotices === 0) {
        addInsight('campus_pulse', 'info', 'No New Notices This Week', 'No notices have been published in the last 7 days. Consider sharing campus updates to keep the community engaged.', 'notice', null, '/notices');
        count++;
      }
    } catch (_) {}

    // Library activity
    try {
      const activeLibUsers = db.prepare(`SELECT COUNT(*) as c FROM library_transactions WHERE issue_date >= date('now', '-30 days')`).get().c;
      if (activeLibUsers < 5 && metrics.students > 10) {
        addInsight('campus_pulse', 'info', 'Low Library Usage This Month', `Only ${activeLibUsers} library transactions in the last 30 days. Consider promoting digital resources and reading programs.`, 'library', null, '/library');
        count++;
      }
    } catch (_) {}

    // Placement activity
    try {
      const recentPlacements = db.prepare(`SELECT COUNT(*) as c FROM placement_drives WHERE created_at >= date('now', '-30 days')`).get().c;
      const totalStudents = metrics.students;
      if (recentPlacements === 0 && totalStudents > 0) {
        addInsight('campus_pulse', 'info', 'No Placement Drives This Month', 'No placement drives scheduled in the last 30 days. Connect with companies to drive campus recruitment activity.', 'placement', null, '/placements');
        count++;
      }
    } catch (_) {}

    // Positive insights
    if (metrics.faculty > 0 && metrics.students > 0) {
      const ratio = (metrics.students / metrics.faculty).toFixed(1);
      addInsight('campus_pulse', 'success', `Faculty-Student Ratio: 1:${ratio}`, `${metrics.faculty} faculty members supporting ${metrics.students} students. ${parseFloat(ratio) <= 20 ? 'Excellent faculty-student ratio.' : 'Consider expanding faculty strength.'}`, 'campus', null, '/faculty');
      count++;
    }

    if (metrics.activeJobs > 0) {
      addInsight('campus_pulse', 'success', `${metrics.activeJobs} Alumni Job Opportunit${metrics.activeJobs > 1 ? 'ies' : 'y'} Available`, `${metrics.activeJobs} job opening(s) posted by MSRIM alumni. Share with current students and final year batches.`, 'alumni', null, '/alumni');
      count++;
    }
  } catch (_) {}

  logRun('campus_pulse', count, Date.now() - t0);
  return count;
}

// ── Run All Agents ───────────────────────────────────────────────────────────
function runAllAgents() {
  const results = {};
  try { results.student_risk = runStudentRiskAgent(); } catch (e) { results.student_risk = 0; }
  try { results.finance = runFinanceAgent(); } catch (e) { results.finance = 0; }
  try { results.naac = runNaacAgent(); } catch (e) { results.naac = 0; }
  try { results.procurement = runProcurementAgent(); } catch (e) { results.procurement = 0; }
  try { results.campus_pulse = runCampusPulseAgent(); } catch (e) { results.campus_pulse = 0; }
  return results;
}

// Run agents on module load (server startup)
try { runAllAgents(); } catch (_) {}

// Auto-refresh every 10 minutes
setInterval(() => { try { runAllAgents(); } catch (_) {} }, 10 * 60 * 1000);

// ── API Routes ───────────────────────────────────────────────────────────────

// GET all insights (active, unresolved)
router.get('/insights', (req, res) => {
  const { agent_type, severity, limit } = req.query;
  let q = `SELECT * FROM agent_insights WHERE is_resolved = 0`;
  const params = [];
  if (agent_type) { q += ' AND agent_type = ?'; params.push(agent_type); }
  if (severity) { q += ' AND severity = ?'; params.push(severity); }
  q += ' ORDER BY CASE severity WHEN \'critical\' THEN 1 WHEN \'warning\' THEN 2 WHEN \'info\' THEN 3 ELSE 4 END, generated_at DESC LIMIT ?';
  params.push(parseInt(limit) || 100);
  res.json(db.prepare(q).all(...params));
});

// GET agent dashboard stats
router.get('/dashboard', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved = 0`).get().c;
  const critical = db.prepare(`SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved = 0 AND severity = 'critical'`).get().c;
  const warning = db.prepare(`SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved = 0 AND severity = 'warning'`).get().c;
  const success = db.prepare(`SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved = 0 AND severity = 'success'`).get().c;
  const info = db.prepare(`SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved = 0 AND severity = 'info'`).get().c;
  const resolved = db.prepare(`SELECT COUNT(*) as c FROM agent_insights WHERE is_resolved = 1`).get().c;

  const byAgent = db.prepare(`SELECT agent_type, COUNT(*) as c, MAX(generated_at) as last_run FROM agent_insights WHERE is_resolved = 0 GROUP BY agent_type`).all();
  const recentRuns = db.prepare(`SELECT agent_type, MAX(ran_at) as last_ran, SUM(insights_generated) as total_insights FROM agent_runs GROUP BY agent_type`).all();
  const recentInsights = db.prepare(`SELECT * FROM agent_insights WHERE is_resolved = 0 ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, generated_at DESC LIMIT 10`).all();

  // Health score
  let healthScore = 100;
  healthScore -= Math.min(critical * 8, 40);
  healthScore -= Math.min(warning * 3, 30);
  healthScore = Math.max(healthScore, 0);

  res.json({ total, critical, warning, success, info, resolved, healthScore, byAgent, recentRuns, recentInsights });
});

// POST trigger all agents manually
router.post('/run', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const results = runAllAgents();
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  res.json({ success: true, total, results, message: `All 5 agents refreshed — ${total} insights generated.` });
});

// POST run single agent
router.post('/run/:type', authorize('admin', 'registrar', 'hod'), (req, res) => {
  const map = {
    student_risk: runStudentRiskAgent,
    finance: runFinanceAgent,
    naac: runNaacAgent,
    procurement: runProcurementAgent,
    campus_pulse: runCampusPulseAgent,
  };
  const fn = map[req.params.type];
  if (!fn) return res.status(404).json({ error: 'Unknown agent type.' });
  const count = fn();
  res.json({ success: true, insights_generated: count });
});

// PUT resolve insight
router.put('/insights/:id/resolve', (req, res) => {
  db.prepare(`UPDATE agent_insights SET is_resolved = 1, resolved_at = datetime('now'), resolved_by = ? WHERE id = ?`).run(req.user.id, req.params.id);
  res.json({ success: true });
});

// PUT resolve all by agent type
router.put('/insights/resolve-all/:agent', authorize('admin', 'registrar'), (req, res) => {
  db.prepare(`UPDATE agent_insights SET is_resolved = 1, resolved_at = datetime('now'), resolved_by = ? WHERE agent_type = ?`).run(req.user.id, req.params.agent);
  res.json({ success: true });
});

// GET agent run history
router.get('/history', authorize('admin', 'registrar'), (req, res) => {
  const history = db.prepare(`SELECT * FROM agent_runs ORDER BY ran_at DESC LIMIT 100`).all();
  res.json(history);
});

module.exports = router;
module.exports.runAllAgents = runAllAgents;
