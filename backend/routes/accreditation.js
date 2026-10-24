const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Accreditation Cycles ──────────────────────────────────────────────────────
router.get('/cycles', (req, res) => {
  const { body } = req.query;
  let q = 'SELECT * FROM accreditation_cycles WHERE 1=1';
  const p = [];
  if (body) { q += ' AND body=?'; p.push(body); }
  q += ' ORDER BY created_at DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/cycles', authorize('admin','registrar'), (req, res) => {
  const { name, body, start_date, end_date, target_grade, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const r = db.prepare(`INSERT INTO accreditation_cycles (name,body,start_date,end_date,target_grade,status) VALUES (?,?,?,?,?,?)`).run(name, body||'NAAC', start_date||null, end_date||null, target_grade||'', status||'planning');
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/cycles/:id', authorize('admin','registrar'), (req, res) => {
  const { name, body, start_date, end_date, target_grade, status } = req.body;
  db.prepare(`UPDATE accreditation_cycles SET name=?,body=?,start_date=?,end_date=?,target_grade=?,status=? WHERE id=?`).run(name, body||'NAAC', start_date||null, end_date||null, target_grade||'', status||'planning', req.params.id);
  res.json({ success: true });
});

router.delete('/cycles/:id', authorize('admin'), (req, res) => {
  db.prepare('DELETE FROM accreditation_cycles WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Quality Criteria ──────────────────────────────────────────────────────────
router.get('/criteria', (req, res) => {
  const { cycle_id, body } = req.query;
  let q = `SELECT qc.*, u.name as responsible_name,
    (SELECT COUNT(*) FROM accreditation_evidence e WHERE e.criteria_id=qc.id) as evidence_count,
    (SELECT COUNT(*) FROM accreditation_actions a WHERE a.criteria_id=qc.id AND a.status != 'completed') as open_actions
    FROM quality_criteria qc
    LEFT JOIN users u ON qc.responsible_person=u.id
    LEFT JOIN accreditation_cycles ac ON qc.cycle_id=ac.id
    WHERE 1=1`;
  const p = [];
  if (cycle_id) { q += ' AND qc.cycle_id=?'; p.push(cycle_id); }
  if (body)     { q += ' AND ac.body=?';     p.push(body); }
  q += ' ORDER BY qc.criterion_number';
  res.json(db.prepare(q).all(...p));
});

router.post('/criteria', authorize('admin','registrar','hod'), (req, res) => {
  const { cycle_id, criterion_number, criterion_name, max_score, weightage, responsible_person, notes } = req.body;
  if (!cycle_id || !criterion_number || !criterion_name) return res.status(400).json({ error: 'cycle_id, criterion_number, criterion_name required.' });
  const r = db.prepare(`INSERT INTO quality_criteria (cycle_id,criterion_number,criterion_name,max_score,weightage,responsible_person,notes) VALUES (?,?,?,?,?,?,?)`).run(cycle_id, criterion_number, criterion_name, parseFloat(max_score)||100, parseFloat(weightage)||1, responsible_person||req.user.id, notes||'');
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/criteria/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { current_score, status, notes, responsible_person } = req.body;
  db.prepare(`UPDATE quality_criteria SET current_score=?,status=?,notes=?,responsible_person=? WHERE id=?`).run(parseFloat(current_score)||0, status||'not_started', notes||'', responsible_person||null, req.params.id);
  res.json({ success: true });
});

router.delete('/criteria/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM quality_criteria WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Quality Indicators ────────────────────────────────────────────────────────
router.get('/indicators', (req, res) => {
  const { criteria_id, cycle_id } = req.query;
  let q = `SELECT qi.*, qc.criterion_name, qc.criterion_number FROM quality_indicators qi JOIN quality_criteria qc ON qi.criteria_id=qc.id WHERE 1=1`;
  const p = [];
  if (criteria_id) { q += ' AND qi.criteria_id=?'; p.push(criteria_id); }
  if (cycle_id)    { q += ' AND qc.cycle_id=?';    p.push(cycle_id); }
  q += ' ORDER BY qi.indicator_code';
  res.json(db.prepare(q).all(...p));
});

router.post('/indicators', authorize('admin','registrar','hod'), (req, res) => {
  const { criteria_id, indicator_code, indicator_name, target_value, unit, data_source } = req.body;
  if (!criteria_id || !indicator_code || !indicator_name) return res.status(400).json({ error: 'criteria_id, code, name required.' });
  const r = db.prepare(`INSERT INTO quality_indicators (criteria_id,indicator_code,indicator_name,target_value,unit,data_source) VALUES (?,?,?,?,?,?)`).run(criteria_id, indicator_code, indicator_name, parseFloat(target_value)||null, unit||'', data_source||'');
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/indicators/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { achieved_value, verified, data_source, notes } = req.body;
  db.prepare(`UPDATE quality_indicators SET achieved_value=?,verified=?,data_source=?,last_updated=datetime('now') WHERE id=?`).run(parseFloat(achieved_value)||0, verified?1:0, data_source||'', req.params.id);
  res.json({ success: true });
});

router.delete('/indicators/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM quality_indicators WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Evidence Repository ───────────────────────────────────────────────────────
router.get('/evidence', (req, res) => {
  const { criteria_id, body, document_type, academic_year } = req.query;
  let q = `SELECT e.*, qc.criterion_name, qc.criterion_number, ac.body as acc_body,
    u.name as uploaded_by_name, v.name as verified_by_name
    FROM accreditation_evidence e
    LEFT JOIN quality_criteria qc ON e.criteria_id=qc.id
    LEFT JOIN accreditation_cycles ac ON qc.cycle_id=ac.id
    LEFT JOIN users u ON e.uploaded_by=u.id
    LEFT JOIN users v ON e.verified_by=v.id
    WHERE 1=1`;
  const p = [];
  if (criteria_id)   { q += ' AND e.criteria_id=?';    p.push(criteria_id); }
  if (body)          { q += ' AND (e.body=? OR ac.body=?)'; p.push(body, body); }
  if (document_type) { q += ' AND e.document_type=?';  p.push(document_type); }
  if (academic_year) { q += ' AND e.academic_year=?';  p.push(academic_year); }
  q += ' ORDER BY e.created_at DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/evidence', authorize('admin','registrar','hod','faculty'), (req, res) => {
  const { criteria_id, body, title, description, document_type, academic_year, file_name } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required.' });
  const r = db.prepare(`INSERT INTO accreditation_evidence (criteria_id,body,title,description,document_type,academic_year,file_name,uploaded_by) VALUES (?,?,?,?,?,?,?,?)`).run(criteria_id||null, body||'NAAC', title, description||'', document_type||'report', academic_year||'', file_name||'', req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/evidence/:id/verify', authorize('admin','registrar'), (req, res) => {
  db.prepare("UPDATE accreditation_evidence SET verified_by=?,verified_at=datetime('now') WHERE id=?").run(req.user.id, req.params.id);
  res.json({ success: true });
});

router.put('/evidence/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { title, description, document_type, academic_year, file_name } = req.body;
  db.prepare('UPDATE accreditation_evidence SET title=?,description=?,document_type=?,academic_year=?,file_name=? WHERE id=?').run(title, description||'', document_type||'report', academic_year||'', file_name||'', req.params.id);
  res.json({ success: true });
});

router.delete('/evidence/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM accreditation_evidence WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Action Plans / Gap Tracker ────────────────────────────────────────────────
router.get('/actions', (req, res) => {
  const { body, status, criteria_id } = req.query;
  let q = `SELECT a.*, qc.criterion_name, qc.criterion_number, u.name as responsible_name, cu.name as created_by_name
    FROM accreditation_actions a
    LEFT JOIN quality_criteria qc ON a.criteria_id=qc.id
    LEFT JOIN users u ON a.responsible_person=u.id
    LEFT JOIN users cu ON a.created_by=cu.id
    WHERE 1=1`;
  const p = [];
  if (body)        { q += ' AND a.body=?';        p.push(body); }
  if (status)      { q += ' AND a.status=?';      p.push(status); }
  if (criteria_id) { q += ' AND a.criteria_id=?'; p.push(criteria_id); }
  // auto-mark overdue
  q += " ORDER BY CASE a.status WHEN 'overdue' THEN 1 WHEN 'open' THEN 2 WHEN 'in_progress' THEN 3 ELSE 4 END, a.target_date";
  const rows = db.prepare(q).all(...p);
  // update overdue status in-memory
  const today = new Date().toISOString().split('T')[0];
  rows.forEach(r => { if (r.target_date && r.target_date < today && r.status === 'open') r.status = 'overdue'; });
  res.json(rows);
});

router.post('/actions', authorize('admin','registrar','hod'), (req, res) => {
  const { criteria_id, body, criterion_ref, gap_description, action_planned, responsible_person, target_date, priority } = req.body;
  if (!gap_description || !action_planned) return res.status(400).json({ error: 'gap_description and action_planned required.' });
  const r = db.prepare(`INSERT INTO accreditation_actions (criteria_id,body,criterion_ref,gap_description,action_planned,responsible_person,target_date,priority,created_by) VALUES (?,?,?,?,?,?,?,?,?)`).run(criteria_id||null, body||'NAAC', criterion_ref||'', gap_description, action_planned, responsible_person||null, target_date||null, priority||'medium', req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/actions/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { status, remarks, completion_date, responsible_person, target_date } = req.body;
  db.prepare('UPDATE accreditation_actions SET status=?,remarks=?,completion_date=?,responsible_person=?,target_date=? WHERE id=?').run(status||'open', remarks||'', completion_date||null, responsible_person||null, target_date||null, req.params.id);
  res.json({ success: true });
});

router.delete('/actions/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM accreditation_actions WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── AOL — Assurance of Learning (AACSB) ──────────────────────────────────────
router.get('/aol/goals', (req, res) => {
  const { cycle_id } = req.query;
  let q = `SELECT g.*, p.name as program_name, p.code as program_code,
    (SELECT COUNT(*) FROM aol_measurements m WHERE m.goal_id=g.id) as measurement_count,
    (SELECT COUNT(*) FROM aol_closings cl WHERE cl.goal_id=g.id) as closing_count
    FROM aol_goals g LEFT JOIN programs p ON g.program_id=p.id WHERE 1=1`;
  const p = [];
  if (cycle_id) { q += ' AND g.cycle_id=?'; p.push(cycle_id); }
  q += ' ORDER BY g.goal_code';
  res.json(db.prepare(q).all(...p));
});

router.post('/aol/goals', authorize('admin','registrar','hod'), (req, res) => {
  const { cycle_id, goal_code, goal_name, description, program_id } = req.body;
  if (!cycle_id || !goal_code || !goal_name) return res.status(400).json({ error: 'cycle_id, goal_code, goal_name required.' });
  const r = db.prepare('INSERT INTO aol_goals (cycle_id,goal_code,goal_name,description,program_id) VALUES (?,?,?,?,?)').run(cycle_id, goal_code, goal_name, description||'', program_id||null);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/aol/goals/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { goal_name, description, status } = req.body;
  db.prepare('UPDATE aol_goals SET goal_name=?,description=?,status=? WHERE id=?').run(goal_name, description||'', status||'active', req.params.id);
  res.json({ success: true });
});

router.delete('/aol/goals/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM aol_goals WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

router.get('/aol/measurements', (req, res) => {
  const { goal_id } = req.query;
  let q = 'SELECT * FROM aol_measurements WHERE 1=1';
  const p = [];
  if (goal_id) { q += ' AND goal_id=?'; p.push(goal_id); }
  q += ' ORDER BY academic_year DESC, id';
  res.json(db.prepare(q).all(...p));
});

router.post('/aol/measurements', authorize('admin','registrar','hod'), (req, res) => {
  const { goal_id, learning_objective, measurement_tool, target_pct, academic_year } = req.body;
  if (!goal_id || !learning_objective) return res.status(400).json({ error: 'goal_id and learning_objective required.' });
  const r = db.prepare('INSERT INTO aol_measurements (goal_id,learning_objective,measurement_tool,target_pct,academic_year) VALUES (?,?,?,?,?)').run(goal_id, learning_objective, measurement_tool||'', parseFloat(target_pct)||70, academic_year||'2024-25');
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/aol/measurements/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { achieved_pct, findings, measurement_tool } = req.body;
  db.prepare('UPDATE aol_measurements SET achieved_pct=?,findings=?,measurement_tool=? WHERE id=?').run(parseFloat(achieved_pct)||null, findings||'', measurement_tool||'', req.params.id);
  res.json({ success: true });
});

router.delete('/aol/measurements/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM aol_measurements WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

router.get('/aol/closings', (req, res) => {
  const { goal_id } = req.query;
  let q = 'SELECT * FROM aol_closings WHERE 1=1';
  const p = [];
  if (goal_id) { q += ' AND goal_id=?'; p.push(goal_id); }
  q += ' ORDER BY implementation_date DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/aol/closings', authorize('admin','registrar','hod'), (req, res) => {
  const { goal_id, gap_identified, action_taken, implementation_date, next_review_date } = req.body;
  if (!goal_id || !gap_identified || !action_taken) return res.status(400).json({ error: 'goal_id, gap_identified, action_taken required.' });
  const r = db.prepare('INSERT INTO aol_closings (goal_id,gap_identified,action_taken,implementation_date,next_review_date) VALUES (?,?,?,?,?)').run(goal_id, gap_identified, action_taken, implementation_date||null, next_review_date||null);
  res.status(201).json({ id: r.lastInsertRowid });
});

// ── NIRF ─────────────────────────────────────────────────────────────────────
router.get('/nirf', (req, res) => {
  const { cycle_id, academic_year } = req.query;
  let q = 'SELECT * FROM nirf_data WHERE 1=1';
  const p = [];
  if (cycle_id)      { q += ' AND cycle_id=?';      p.push(cycle_id); }
  if (academic_year) { q += ' AND academic_year=?';  p.push(academic_year); }
  q += ' ORDER BY parameter, metric_code';
  res.json(db.prepare(q).all(...p));
});

router.post('/nirf', authorize('admin','registrar'), (req, res) => {
  const { cycle_id, parameter, metric_code, metric_name, value, max_value, weightage, academic_year, notes } = req.body;
  if (!cycle_id || !metric_code) return res.status(400).json({ error: 'cycle_id and metric_code required.' });
  try {
    db.prepare(`INSERT INTO nirf_data (cycle_id,parameter,metric_code,metric_name,value,max_value,weightage,academic_year,notes,last_updated) VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(cycle_id,metric_code,academic_year) DO UPDATE SET value=excluded.value,notes=excluded.notes,last_updated=excluded.last_updated`).run(cycle_id, parameter||'TLR', metric_code, metric_name||metric_code, parseFloat(value)||0, parseFloat(max_value)||100, parseFloat(weightage)||1, academic_year||'2024-25', notes||'');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

router.get('/nirf/score', (req, res) => {
  const { cycle_id, academic_year } = req.query;
  const ay = academic_year || '2024-25';
  const rows = db.prepare('SELECT * FROM nirf_data WHERE cycle_id=? AND academic_year=?').all(cycle_id, ay);
  // NIRF score = sum of (value/max_value * parameter_weightage_pct)
  const paramWeights = { TLR:30, RP:30, GO:20, OI:10, PP:10 };
  const byParam = {};
  rows.forEach(r => {
    if (!byParam[r.parameter]) byParam[r.parameter] = { scored:0, max:0 };
    byParam[r.parameter].scored += (r.value || 0);
    byParam[r.parameter].max += r.max_value;
  });
  let total = 0;
  const breakdown = Object.entries(paramWeights).map(([param, wt]) => {
    const d = byParam[param] || { scored:0, max:1 };
    const pct = d.max > 0 ? (d.scored / d.max) * wt : 0;
    total += pct;
    return { parameter: param, weight: wt, scored: parseFloat(d.scored.toFixed(2)), max: d.max, contribution: parseFloat(pct.toFixed(2)) };
  });
  res.json({ total: parseFloat(total.toFixed(2)), breakdown, academic_year: ay });
});

router.post('/nirf/auto-populate', authorize('admin','registrar'), (req, res) => {
  const { cycle_id, academic_year } = req.body;
  const ay = academic_year || '2024-25';
  try {
    const students = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get().c;
    const faculty  = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='faculty' AND is_active=1").get().c;
    const female   = db.prepare("SELECT COUNT(*) as c FROM students WHERE gender='female' AND status='active'").get().c;
    const placements = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get().c;
    const publications = db.prepare("SELECT COUNT(*) as c FROM research_papers WHERE status='published'").get()?.c || 0;

    // Populate known metrics from live data
    const updates = [
      ['TLR','TLR-SS','Student Strength including Doctoral Students', Math.min(20, Math.round(students/50)), 20],
      ['TLR','TLR-FSR','Faculty-Student Ratio', faculty > 0 ? Math.min(30, Math.round((faculty/students)*300)) : 0, 30],
      ['OI','OI-WD','Women Diversity', students > 0 ? Math.min(30, Math.round((female/students)*50)) : 0, 30],
      ['RP','RP-PU','Combined Metric for Publications', Math.min(35, publications*2), 35],
    ];
    const stmt = db.prepare(`INSERT INTO nirf_data (cycle_id,parameter,metric_code,metric_name,value,max_value,academic_year,data_source,last_updated)
      VALUES (?,?,?,?,?,?,?,?,datetime('now'))
      ON CONFLICT(cycle_id,metric_code,academic_year) DO UPDATE SET value=excluded.value,data_source=excluded.data_source,last_updated=excluded.last_updated`);
    updates.forEach(([p,c,n,v,mx]) => stmt.run(cycle_id, p, c, n, v, mx, ay, 'auto'));
    res.json({ success: true, populated: updates.length, students, faculty, publications });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Site Visits ───────────────────────────────────────────────────────────────
router.get('/visits', (req, res) => {
  const { cycle_id } = req.query;
  let q = `SELECT v.*, ac.name as cycle_name, ac.body, u.name as created_by_name
    FROM accreditation_visits v
    JOIN accreditation_cycles ac ON v.cycle_id=ac.id
    LEFT JOIN users u ON v.created_by=u.id
    WHERE 1=1`;
  const p = [];
  if (cycle_id) { q += ' AND v.cycle_id=?'; p.push(cycle_id); }
  q += ' ORDER BY v.scheduled_date DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/visits', authorize('admin','registrar'), (req, res) => {
  const { cycle_id, visit_type, scheduled_date, peer_team, agenda } = req.body;
  if (!cycle_id || !scheduled_date) return res.status(400).json({ error: 'cycle_id and scheduled_date required.' });
  const r = db.prepare('INSERT INTO accreditation_visits (cycle_id,visit_type,scheduled_date,peer_team,agenda,created_by) VALUES (?,?,?,?,?,?)').run(cycle_id, visit_type||'peer_team_visit', scheduled_date, peer_team||'', agenda||'', req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/visits/:id', authorize('admin','registrar'), (req, res) => {
  const { status, actual_date, observations, outcome, grade_awarded, peer_team, agenda } = req.body;
  db.prepare('UPDATE accreditation_visits SET status=?,actual_date=?,observations=?,outcome=?,grade_awarded=?,peer_team=?,agenda=? WHERE id=?').run(status||'scheduled', actual_date||null, observations||'', outcome||'', grade_awarded||'', peer_team||'', agenda||'', req.params.id);
  res.json({ success: true });
});

router.delete('/visits/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM accreditation_visits WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── IQAC Meetings ─────────────────────────────────────────────────────────────
router.get('/meetings', (req, res) => {
  res.json(db.prepare(`SELECT im.*, u.name as created_by_name FROM iqac_meetings im LEFT JOIN users u ON im.created_by=u.id ORDER BY im.date DESC LIMIT 50`).all());
});

router.post('/meetings', authorize('admin','registrar'), (req, res) => {
  const { meeting_number, date, venue, agenda, minutes, action_items, status } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required.' });
  const r = db.prepare(`INSERT INTO iqac_meetings (meeting_number,date,venue,agenda,minutes,action_items,status,created_by) VALUES (?,?,?,?,?,?,?,?)`).run(meeting_number||`IQAC-${Date.now()}`, date, venue||'', JSON.stringify(agenda||[]), minutes||'', JSON.stringify(action_items||[]), status||'scheduled', req.user.id);
  res.status(201).json({ id: r.lastInsertRowid });
});

router.put('/meetings/:id', authorize('admin','registrar'), (req, res) => {
  const { minutes, action_items, status, venue, agenda } = req.body;
  db.prepare(`UPDATE iqac_meetings SET minutes=?,action_items=?,status=?,venue=?,agenda=? WHERE id=?`).run(minutes||'', JSON.stringify(action_items||[]), status||'scheduled', venue||'', JSON.stringify(agenda||[]), req.params.id);
  res.json({ success: true });
});

router.delete('/meetings/:id', authorize('admin','registrar'), (req, res) => {
  db.prepare('DELETE FROM iqac_meetings WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── Readiness Dashboard ───────────────────────────────────────────────────────
router.get('/readiness', (req, res) => {
  const cycles = db.prepare("SELECT * FROM accreditation_cycles WHERE status IN ('in_progress','planning') ORDER BY body").all();
  const result = cycles.map(cycle => {
    const criteria = db.prepare('SELECT * FROM quality_criteria WHERE cycle_id=?').all(cycle.id);
    const total = criteria.reduce((s,c) => s + c.max_score, 0);
    const scored = criteria.reduce((s,c) => s + (c.current_score||0), 0);
    const readiness = total > 0 ? Math.round((scored/total)*100) : 0;
    const completed = criteria.filter(c => c.status === 'completed' || c.status === 'verified').length;
    const evidence = db.prepare('SELECT COUNT(*) as c FROM accreditation_evidence e JOIN quality_criteria qc ON e.criteria_id=qc.id WHERE qc.cycle_id=?').get(cycle.id).c;
    const actions  = db.prepare("SELECT COUNT(*) as c FROM accreditation_actions a JOIN quality_criteria qc ON a.criteria_id=qc.id WHERE qc.cycle_id=? AND a.status != 'completed'").get(cycle.id).c;
    const nextVisit = db.prepare("SELECT scheduled_date FROM accreditation_visits WHERE cycle_id=? AND status='scheduled' ORDER BY scheduled_date LIMIT 1").get(cycle.id);
    return { ...cycle, readiness, total_criteria: criteria.length, completed_criteria: completed, evidence_count: evidence, open_actions: actions, next_visit: nextVisit?.scheduled_date || null };
  });
  res.json(result);
});

// ── Stats ────────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const activeCycles      = db.prepare("SELECT COUNT(*) as c FROM accreditation_cycles WHERE status='in_progress'").get().c;
  const totalCriteria     = db.prepare('SELECT COUNT(*) as c FROM quality_criteria').get().c;
  const completedCriteria = db.prepare("SELECT COUNT(*) as c FROM quality_criteria WHERE status IN ('completed','verified')").get().c;
  const verifiedIndicators= db.prepare('SELECT COUNT(*) as c FROM quality_indicators WHERE verified=1').get().c;
  const totalIndicators   = db.prepare('SELECT COUNT(*) as c FROM quality_indicators').get().c;
  const totalEvidence     = db.prepare('SELECT COUNT(*) as c FROM accreditation_evidence').get().c;
  const openActions       = db.prepare("SELECT COUNT(*) as c FROM accreditation_actions WHERE status IN ('open','in_progress','overdue')").get().c;
  const overdueActions    = db.prepare("SELECT COUNT(*) as c FROM accreditation_actions WHERE status='open' AND target_date < date('now')").get().c;
  const upcomingMeetings  = db.prepare("SELECT COUNT(*) as c FROM iqac_meetings WHERE status='scheduled' AND date >= date('now')").get().c;
  const avgScore          = db.prepare('SELECT AVG(CASE WHEN max_score>0 THEN (current_score*100.0/max_score) ELSE 0 END) as v FROM quality_criteria WHERE max_score>0').get().v;
  const criteriaProgress  = db.prepare('SELECT qc.criterion_number, qc.criterion_name, qc.current_score, qc.max_score, qc.status, ac.body FROM quality_criteria qc JOIN accreditation_cycles ac ON qc.cycle_id=ac.id ORDER BY ac.body, qc.criterion_number LIMIT 30').all();
  const cycleStatus       = db.prepare('SELECT name, body, status, target_grade FROM accreditation_cycles ORDER BY created_at DESC LIMIT 10').all();
  const aolGoals          = db.prepare('SELECT COUNT(*) as c FROM aol_goals').get().c;
  res.json({ activeCycles, totalCriteria, completedCriteria, verifiedIndicators, totalIndicators, totalEvidence, openActions, overdueActions, upcomingMeetings, avgScore: parseFloat((avgScore||0).toFixed(1)), criteriaProgress, cycleStatus, aolGoals });
});

module.exports = router;
