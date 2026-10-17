const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const mgmt = ['admin','hod','registrar'];

// ── Ranking Systems supported ──────────────────────────────────────────────────
// NIRF (National Institutional Ranking Framework) - India
// QS World University Rankings - Global
// AACSB accreditation metrics
// EQUIS (EFMD Quality Improvement System)
// NBA (National Board of Accreditation)
// FT MBA Rankings (Financial Times)
// THE (Times Higher Education)

router.get('/systems', (req, res) => {
  const systems = db.prepare('SELECT * FROM ranking_systems ORDER BY name').all();
  res.json(systems);
});

router.post('/systems', authorize('admin'), (req, res) => {
  const { name, description, frequency, website, is_active } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const result = db.prepare('INSERT INTO ranking_systems (name,description,frequency,website,is_active) VALUES (?,?,?,?,?)')
    .run(name,description||null,frequency||'annual',website||null,is_active?1:1);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Metric Definitions ────────────────────────────────────────────────────────
router.get('/metrics', (req, res) => {
  const { system_id } = req.query;
  let q = 'SELECT rm.*, rs.name as system_name FROM ranking_metrics rm LEFT JOIN ranking_systems rs ON rm.system_id = rs.id WHERE 1=1';
  const p = [];
  if (system_id) { q += ' AND rm.system_id=?'; p.push(system_id); }
  q += ' ORDER BY rs.name, rm.category, rm.name';
  res.json(db.prepare(q).all(...p));
});

router.post('/metrics', authorize('admin'), (req, res) => {
  const { system_id, category, name, description, weight, unit, data_source, auto_calculate } = req.body;
  if (!name || !system_id) return res.status(400).json({ error: 'Name and system required.' });
  const result = db.prepare('INSERT INTO ranking_metrics (system_id,category,name,description,weight,unit,data_source,auto_calculate) VALUES (?,?,?,?,?,?,?,?)')
    .run(system_id,category||'general',name,description||null,weight||1,unit||'number',data_source||'manual',auto_calculate?1:0);
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Cycle Data Entry ──────────────────────────────────────────────────────────
router.get('/cycles', (req, res) => {
  const { system_id } = req.query;
  let q = 'SELECT rc.*, rs.name as system_name FROM ranking_cycles rc JOIN ranking_systems rs ON rc.system_id = rs.id WHERE 1=1';
  const p = [];
  if (system_id) { q += ' AND rc.system_id=?'; p.push(system_id); }
  q += ' ORDER BY rc.submission_year DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/cycles', authorize(...mgmt), (req, res) => {
  const { system_id, submission_year, submission_deadline, target_rank, target_score } = req.body;
  if (!system_id || !submission_year) return res.status(400).json({ error: 'System and year required.' });
  const result = db.prepare('INSERT INTO ranking_cycles (system_id,submission_year,submission_deadline,target_rank,target_score,status) VALUES (?,?,?,?,?,?)')
    .run(system_id,submission_year,submission_deadline||null,target_rank||null,target_score||null,'data_collection');
  res.status(201).json({ id: result.lastInsertRowid });
});

// ── Metric Values (actual data points) ───────────────────────────────────────
router.get('/cycles/:cycleId/values', (req, res) => {
  const values = db.prepare(`SELECT rv.*, rm.name as metric_name, rm.category, rm.weight, rm.unit
    FROM ranking_values rv JOIN ranking_metrics rm ON rv.metric_id = rm.id
    WHERE rv.cycle_id=? ORDER BY rm.category, rm.name`).all(req.params.cycleId);
  res.json(values);
});

router.post('/cycles/:cycleId/values', authorize(...mgmt), (req, res) => {
  const { metric_id, value, notes, evidence_url } = req.body;
  if (!metric_id) return res.status(400).json({ error: 'Metric required.' });
  db.prepare(`INSERT INTO ranking_values (cycle_id,metric_id,value,notes,evidence_url,updated_by)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(cycle_id,metric_id) DO UPDATE SET value=excluded.value,notes=excluded.notes,
    evidence_url=excluded.evidence_url,updated_by=excluded.updated_by,updated_at=datetime('now')`)
    .run(req.params.cycleId,metric_id,value,notes||null,evidence_url||null,req.user.id);
  res.json({ message: 'Saved.' });
});

router.post('/cycles/:cycleId/bulk-values', authorize(...mgmt), (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array required.' });
  const stmt = db.prepare(`INSERT INTO ranking_values (cycle_id,metric_id,value,notes,updated_by)
    VALUES (?,?,?,?,?)
    ON CONFLICT(cycle_id,metric_id) DO UPDATE SET value=excluded.value,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=datetime('now')`);
  req.body.forEach(v => stmt.run(req.params.cycleId, v.metric_id, v.value, v.notes||null, req.user.id));
  res.json({ message: `${req.body.length} values saved.` });
});

// ── Auto-calculate metrics from live DB data ──────────────────────────────────
router.post('/cycles/:cycleId/auto-calculate', authorize(...mgmt), (req, res) => {
  const cycle = db.prepare('SELECT rc.*, rs.name as system_name FROM ranking_cycles rc JOIN ranking_systems rs ON rc.system_id = rs.id WHERE rc.id=?').get(req.params.cycleId);
  if (!cycle) return res.status(404).json({ error: 'Cycle not found.' });

  const metrics = db.prepare("SELECT * FROM ranking_metrics WHERE system_id=? AND auto_calculate=1").all(cycle.system_id);
  const stmt = db.prepare(`INSERT INTO ranking_values (cycle_id,metric_id,value,notes,updated_by)
    VALUES (?,?,?,?,?)
    ON CONFLICT(cycle_id,metric_id) DO UPDATE SET value=excluded.value,notes=excluded.notes,updated_by=excluded.updated_by,updated_at=datetime('now')`);

  const calculated = [];
  for (const m of metrics) {
    let value = null;
    const src = m.data_source;
    try {
      if (src === 'students_total')       value = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get()?.c;
      else if (src === 'faculty_total')   value = db.prepare("SELECT COUNT(*) as c FROM faculty WHERE status='active'").get()?.c;
      else if (src === 'publications')    value = db.prepare('SELECT COUNT(*) as c FROM research_publications').get()?.c;
      else if (src === 'scopus_pubs')     value = db.prepare('SELECT COUNT(*) as c FROM research_publications WHERE is_scopus=1').get()?.c;
      else if (src === 'wos_pubs')        value = db.prepare('SELECT COUNT(*) as c FROM research_publications WHERE is_wos=1').get()?.c;
      else if (src === 'grants_amount')   value = db.prepare("SELECT COALESCE(SUM(amount),0) as c FROM research_grants WHERE status='ongoing'").get()?.c;
      else if (src === 'patents_filed')   value = db.prepare('SELECT COUNT(*) as c FROM research_patents').get()?.c;
      else if (src === 'patents_granted') value = db.prepare("SELECT COUNT(*) as c FROM research_patents WHERE status='granted'").get()?.c;
      else if (src === 'placement_rate')  {
        const total = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active' AND batch_year=(SELECT MAX(batch_year) FROM students)").get()?.c || 1;
        const placed = db.prepare("SELECT COUNT(DISTINCT student_id) as c FROM placement_offers WHERE status IN ('issued','accepted')").get()?.c || 0;
        value = Math.round((placed / total) * 100);
      }
      else if (src === 'avg_package')     value = db.prepare("SELECT ROUND(AVG(package_lpa),2) as c FROM placement_offers WHERE package_lpa>0").get()?.c;
      else if (src === 'fdp_days')        value = db.prepare("SELECT COALESCE(SUM(duration_days),0) as c FROM fdp_programs WHERE status='completed'").get()?.c;
      else if (src === 'student_faculty_ratio') {
        const s = db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get()?.c || 0;
        const f = db.prepare("SELECT COUNT(*) as c FROM faculty WHERE status='active'").get()?.c || 1;
        value = Math.round(s / f);
      }
      else if (src === 'female_faculty_pct') {
        const total = db.prepare("SELECT COUNT(*) as c FROM faculty WHERE status='active'").get()?.c || 1;
        const female = db.prepare("SELECT COUNT(*) as c FROM faculty WHERE status='active' AND gender='female'").get()?.c || 0;
        value = Math.round((female / total) * 100);
      }
      if (value !== null) { stmt.run(cycle.id, m.id, value, 'Auto-calculated', req.user.id); calculated.push(m.name); }
    } catch (_) {}
  }
  res.json({ message: `Calculated ${calculated.length} metrics.`, metrics: calculated });
});

// ── Historical rankings & results ─────────────────────────────────────────────
router.get('/history', (req, res) => {
  const { system_id } = req.query;
  let q = `SELECT rr.*, rs.name as system_name FROM ranking_results rr
    JOIN ranking_systems rs ON rr.system_id = rs.id WHERE 1=1`;
  const p = [];
  if (system_id) { q += ' AND rr.system_id=?'; p.push(system_id); }
  q += ' ORDER BY rr.year DESC';
  res.json(db.prepare(q).all(...p));
});

router.post('/history', authorize(...mgmt), (req, res) => {
  const { system_id, year, rank, score, category, notes } = req.body;
  if (!system_id || !year) return res.status(400).json({ error: 'System and year required.' });
  db.prepare('INSERT OR REPLACE INTO ranking_results (system_id,year,rank,score,category,notes) VALUES (?,?,?,?,?,?)')
    .run(system_id,year,rank||null,score||null,category||null,notes||null);
  res.json({ message: 'Saved.' });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard', (req, res) => {
  const systems = db.prepare('SELECT * FROM ranking_systems WHERE is_active=1').all();
  const latestResults = db.prepare(`SELECT rr.*, rs.name as system_name FROM ranking_results rr
    JOIN ranking_systems rs ON rr.system_id = rs.id
    WHERE rr.year = (SELECT MAX(year) FROM ranking_results rr2 WHERE rr2.system_id=rr.system_id)
    ORDER BY rs.name`).all();
  const pendingCycles = db.prepare("SELECT rc.*, rs.name as system_name FROM ranking_cycles rc JOIN ranking_systems rs ON rc.system_id=rs.id WHERE rc.status != 'submitted' ORDER BY rc.submission_deadline").all();
  const keyMetrics = {
    students: db.prepare("SELECT COUNT(*) as c FROM students WHERE status='active'").get()?.c || 0,
    faculty: db.prepare("SELECT COUNT(*) as c FROM faculty WHERE status='active'").get()?.c || 0,
    publications: db.prepare('SELECT COUNT(*) as c FROM research_publications').get()?.c || 0,
    scopusPubs: db.prepare('SELECT COUNT(*) as c FROM research_publications WHERE is_scopus=1').get()?.c || 0,
    patents: db.prepare('SELECT COUNT(*) as c FROM research_patents').get()?.c || 0,
    grants: db.prepare("SELECT COUNT(*) as c FROM research_grants WHERE status='ongoing'").get()?.c || 0,
    fdpDays: db.prepare("SELECT COALESCE(SUM(duration_days),0) as c FROM fdp_programs WHERE status='completed'").get()?.c || 0,
  };
  res.json({ systems, latestResults, pendingCycles, keyMetrics });
});

module.exports = router;
