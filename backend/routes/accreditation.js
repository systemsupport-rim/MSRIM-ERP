const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Accreditation Cycles
router.get('/cycles', (req, res) => {
  res.json(db.prepare(`SELECT * FROM accreditation_cycles ORDER BY created_at DESC`).all());
});

router.post('/cycles', authorize('admin','registrar'), (req, res) => {
  const { name, body, start_date, end_date, target_grade, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const result = db.prepare(`INSERT INTO accreditation_cycles (name,body,start_date,end_date,target_grade,status) VALUES (?,?,?,?,?,?)`).run(name, body||'NAAC', start_date||null, end_date||null, target_grade||'', status||'planning');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/cycles/:id', authorize('admin','registrar'), (req, res) => {
  const { name, body, start_date, end_date, target_grade, status } = req.body;
  db.prepare(`UPDATE accreditation_cycles SET name=?,body=?,start_date=?,end_date=?,target_grade=?,status=? WHERE id=?`).run(name, body||'NAAC', start_date||null, end_date||null, target_grade||'', status||'planning', req.params.id);
  res.json({ success: true });
});

// Quality Criteria
router.get('/criteria', (req, res) => {
  const { cycle_id } = req.query;
  let q = `SELECT qc.*, u.name as responsible_name FROM quality_criteria qc LEFT JOIN users u ON qc.responsible_person=u.id WHERE 1=1`;
  const params = [];
  if (cycle_id) { q += ' AND qc.cycle_id=?'; params.push(cycle_id); }
  q += ' ORDER BY qc.criterion_number';
  res.json(db.prepare(q).all(...params));
});

router.post('/criteria', authorize('admin','registrar','hod'), (req, res) => {
  const { cycle_id, criterion_number, criterion_name, max_score, weightage, responsible_person, notes } = req.body;
  if (!cycle_id || !criterion_number || !criterion_name) return res.status(400).json({ error: 'cycle_id, criterion_number, and criterion_name required.' });
  const result = db.prepare(`INSERT INTO quality_criteria (cycle_id,criterion_number,criterion_name,max_score,weightage,responsible_person,notes) VALUES (?,?,?,?,?,?,?)`).run(cycle_id, criterion_number, criterion_name, parseFloat(max_score)||100, parseFloat(weightage)||1, responsible_person||req.user.id, notes||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/criteria/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { current_score, status, notes, responsible_person } = req.body;
  db.prepare(`UPDATE quality_criteria SET current_score=?,status=?,notes=?,responsible_person=? WHERE id=?`).run(parseFloat(current_score)||0, status||'not_started', notes||'', responsible_person||null, req.params.id);
  res.json({ success: true });
});

// Quality Indicators (KPIs)
router.get('/indicators', (req, res) => {
  const { criteria_id } = req.query;
  let q = `SELECT qi.*, qc.criterion_name FROM quality_indicators qi JOIN quality_criteria qc ON qi.criteria_id=qc.id WHERE 1=1`;
  const params = [];
  if (criteria_id) { q += ' AND qi.criteria_id=?'; params.push(criteria_id); }
  q += ' ORDER BY qi.indicator_code';
  res.json(db.prepare(q).all(...params));
});

router.post('/indicators', authorize('admin','registrar','hod'), (req, res) => {
  const { criteria_id, indicator_code, indicator_name, target_value, unit, data_source } = req.body;
  if (!criteria_id || !indicator_code || !indicator_name) return res.status(400).json({ error: 'criteria_id, code, and name required.' });
  const result = db.prepare(`INSERT INTO quality_indicators (criteria_id,indicator_code,indicator_name,target_value,unit,data_source) VALUES (?,?,?,?,?,?)`).run(criteria_id, indicator_code, indicator_name, parseFloat(target_value)||null, unit||'', data_source||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/indicators/:id', authorize('admin','registrar','hod'), (req, res) => {
  const { achieved_value, verified, data_source } = req.body;
  db.prepare(`UPDATE quality_indicators SET achieved_value=?,verified=?,data_source=?,last_updated=datetime('now') WHERE id=?`).run(parseFloat(achieved_value)||0, verified?1:0, data_source||'', req.params.id);
  res.json({ success: true });
});

// IQAC Meetings
router.get('/meetings', (req, res) => {
  const meetings = db.prepare(`SELECT im.*, u.name as created_by_name FROM iqac_meetings im LEFT JOIN users u ON im.created_by=u.id ORDER BY im.date DESC LIMIT 50`).all();
  res.json(meetings);
});

router.post('/meetings', authorize('admin','registrar'), (req, res) => {
  const { meeting_number, date, venue, agenda, minutes, action_items, status } = req.body;
  if (!date) return res.status(400).json({ error: 'Date required.' });
  const result = db.prepare(`INSERT INTO iqac_meetings (meeting_number,date,venue,agenda,minutes,action_items,status,created_by) VALUES (?,?,?,?,?,?,?,?)`).run(meeting_number||`IQAC-${Date.now()}`, date, venue||'', JSON.stringify(agenda||[]), minutes||'', JSON.stringify(action_items||[]), status||'scheduled', req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/meetings/:id', authorize('admin','registrar'), (req, res) => {
  const { minutes, action_items, status } = req.body;
  db.prepare(`UPDATE iqac_meetings SET minutes=?,action_items=?,status=? WHERE id=?`).run(minutes||'', JSON.stringify(action_items||[]), status||'scheduled', req.params.id);
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const activeCycles = db.prepare(`SELECT COUNT(*) as c FROM accreditation_cycles WHERE status='in_progress'`).get().c;
  const totalCriteria = db.prepare(`SELECT COUNT(*) as c FROM quality_criteria`).get().c;
  const completedCriteria = db.prepare(`SELECT COUNT(*) as c FROM quality_criteria WHERE status='completed'`).get().c;
  const verifiedIndicators = db.prepare(`SELECT COUNT(*) as c FROM quality_indicators WHERE verified=1`).get().c;
  const totalIndicators = db.prepare(`SELECT COUNT(*) as c FROM quality_indicators`).get().c;
  const upcomingMeetings = db.prepare(`SELECT COUNT(*) as c FROM iqac_meetings WHERE status='scheduled' AND date >= date('now')`).get().c;
  const avgScore = db.prepare(`SELECT AVG(CASE WHEN max_score>0 THEN (current_score*100.0/max_score) ELSE 0 END) as v FROM quality_criteria WHERE max_score > 0`).get().v;
  const criteriaProgress = db.prepare(`SELECT criterion_number, criterion_name, current_score, max_score, status FROM quality_criteria ORDER BY criterion_number LIMIT 20`).all();
  const cycleStatus = db.prepare(`SELECT name, body, status, target_grade FROM accreditation_cycles ORDER BY created_at DESC LIMIT 5`).all();
  res.json({ activeCycles, totalCriteria, completedCriteria, verifiedIndicators, totalIndicators, upcomingMeetings, avgScore: (avgScore||0).toFixed(1), criteriaProgress, cycleStatus });
});

module.exports = router;
