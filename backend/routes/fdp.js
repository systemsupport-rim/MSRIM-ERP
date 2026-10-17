const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const mgmt = ['admin','hod','registrar'];
const allStaff = [...mgmt,'faculty','accounts','librarian','placement'];

// ── FDP Programs (events organised/attended) ──────────────────────────────────
router.get('/programs', (req, res) => {
  const { type, status, year } = req.query;
  let q = 'SELECT * FROM fdp_programs WHERE 1=1';
  const p = [];
  if (type)   { q += ' AND type=?';   p.push(type); }
  if (status) { q += ' AND status=?'; p.push(status); }
  if (year)   { q += " AND strftime('%Y',start_date)=?"; p.push(year); }
  q += ' ORDER BY start_date DESC';
  res.json(db.prepare(q).all(...p));
});

router.get('/programs/:id', (req, res) => {
  const prog = db.prepare('SELECT * FROM fdp_programs WHERE id=?').get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Not found.' });
  const participants = db.prepare(`SELECT fp.*, u.name, u.role, u.department FROM fdp_participants fp
    JOIN users u ON fp.user_id = u.id WHERE fp.program_id=? ORDER BY u.name`).all(prog.id);
  res.json({ ...prog, participants });
});

router.post('/programs', authorize(...mgmt), (req, res) => {
  const {
    title, type, mode, organizer, sponsor, venue, start_date, end_date,
    duration_days, description, target_audience, max_participants, coordinator_id
  } = req.body;
  if (!title || !start_date) return res.status(400).json({ error: 'Title and start date required.' });
  const result = db.prepare(`INSERT INTO fdp_programs
    (title,type,mode,organizer,sponsor,venue,start_date,end_date,duration_days,
     description,target_audience,max_participants,coordinator_id,status,created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
    title,type||'attended',mode||'offline',organizer||'MSRIM',sponsor||null,venue||null,
    start_date,end_date||start_date,duration_days||1,description||null,
    target_audience||'all',max_participants||50,coordinator_id||req.user.id,'upcoming',req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/programs/:id', authorize(...mgmt), (req, res) => {
  const prog = db.prepare('SELECT * FROM fdp_programs WHERE id=?').get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Not found.' });
  const f = req.body;
  db.prepare(`UPDATE fdp_programs SET title=?,type=?,mode=?,organizer=?,sponsor=?,venue=?,start_date=?,
    end_date=?,duration_days=?,description=?,target_audience=?,max_participants=?,status=? WHERE id=?`)
    .run(f.title??prog.title,f.type??prog.type,f.mode??prog.mode,f.organizer??prog.organizer,
      f.sponsor??prog.sponsor,f.venue??prog.venue,f.start_date??prog.start_date,f.end_date??prog.end_date,
      f.duration_days??prog.duration_days,f.description??prog.description,f.target_audience??prog.target_audience,
      f.max_participants??prog.max_participants,f.status??prog.status,req.params.id);
  res.json({ message: 'Updated.' });
});

router.delete('/programs/:id', authorize(...mgmt), (req, res) => {
  db.prepare('DELETE FROM fdp_programs WHERE id=?').run(req.params.id);
  res.json({ message: 'Deleted.' });
});

// ── Participation Registration ─────────────────────────────────────────────────
router.post('/programs/:id/register', authorize(...allStaff), (req, res) => {
  const prog = db.prepare('SELECT * FROM fdp_programs WHERE id=?').get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'FDP not found.' });
  const count = db.prepare('SELECT COUNT(*) as c FROM fdp_participants WHERE program_id=?').get(prog.id);
  if (prog.max_participants && count.c >= prog.max_participants) return res.status(400).json({ error: 'FDP is full.' });
  const user_id = req.body.user_id || req.user.id;
  try {
    db.prepare('INSERT INTO fdp_participants (program_id,user_id,registered_by) VALUES (?,?,?)').run(prog.id, user_id, req.user.id);
    res.status(201).json({ message: 'Registered successfully.' });
  } catch { res.status(400).json({ error: 'Already registered.' }); }
});

router.put('/programs/:id/participants/:userId/attendance', authorize(...mgmt), (req, res) => {
  const { attendance, certificate_issued } = req.body;
  db.prepare('UPDATE fdp_participants SET attendance=?,certificate_issued=? WHERE program_id=? AND user_id=?')
    .run(attendance??'present', certificate_issued?1:0, req.params.id, req.params.userId);
  res.json({ message: 'Updated.' });
});

// ── Self-reported External FDPs ───────────────────────────────────────────────
router.get('/external', (req, res) => {
  const q = req.user.role === 'faculty' || req.user.role === 'staff'
    ? 'SELECT * FROM fdp_external WHERE user_id=? ORDER BY start_date DESC'
    : 'SELECT fe.*, u.name FROM fdp_external fe JOIN users u ON fe.user_id = u.id ORDER BY fe.start_date DESC';
  res.json(db.prepare(q).all(...(req.user.role === 'faculty' ? [req.user.id] : [])));
});

router.post('/external', authorize(...allStaff), (req, res) => {
  const { title, organizer, mode, start_date, end_date, duration_days, certificate_url, skills_gained, sponsored_by_msrim } = req.body;
  if (!title || !start_date) return res.status(400).json({ error: 'Title and start date required.' });
  const user_id = req.body.user_id && mgmt.includes(req.user.role) ? req.body.user_id : req.user.id;
  const result = db.prepare(`INSERT INTO fdp_external
    (user_id,title,organizer,mode,start_date,end_date,duration_days,certificate_url,skills_gained,sponsored_by_msrim,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(user_id,title,organizer,mode||'offline',start_date,end_date||start_date,duration_days||1,certificate_url||null,skills_gained||null,sponsored_by_msrim?1:0,'pending');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/external/:id/approve', authorize(...mgmt), (req, res) => {
  db.prepare("UPDATE fdp_external SET status=?,approved_by=?,approved_at=datetime('now') WHERE id=?")
    .run(req.body.status||'approved', req.user.id, req.params.id);
  res.json({ message: `FDP ${req.body.status||'approved'}.` });
});

// ── My FDP Dashboard ──────────────────────────────────────────────────────────
router.get('/my-summary', (req, res) => {
  const upcoming = db.prepare(`SELECT fp.title, fp.start_date, fp.end_date, fp.mode
    FROM fdp_participants p JOIN fdp_programs fp ON p.program_id = fp.id
    WHERE p.user_id=? AND fp.status='upcoming' ORDER BY fp.start_date LIMIT 5`).all(req.user.id);
  const completed = db.prepare(`SELECT fp.title, fp.start_date, fp.duration_days, p.certificate_issued
    FROM fdp_participants p JOIN fdp_programs fp ON p.program_id = fp.id
    WHERE p.user_id=? AND fp.status='completed' ORDER BY fp.start_date DESC LIMIT 10`).all(req.user.id);
  const external = db.prepare("SELECT * FROM fdp_external WHERE user_id=? AND status='approved' ORDER BY start_date DESC LIMIT 10").all(req.user.id);
  const totalDays = db.prepare(`SELECT COALESCE(SUM(fp.duration_days),0) as days
    FROM fdp_participants p JOIN fdp_programs fp ON p.program_id=fp.id
    WHERE p.user_id=? AND fp.status='completed'`).get(req.user.id)?.days || 0;
  const extDays = db.prepare("SELECT COALESCE(SUM(duration_days),0) as days FROM fdp_external WHERE user_id=? AND status='approved'").get(req.user.id)?.days || 0;
  res.json({ upcoming, completed, external, totalDays: totalDays + extDays });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get('/analytics', authorize(...mgmt), (req, res) => {
  const overview = db.prepare(`SELECT
    (SELECT COUNT(*) FROM fdp_programs) as total_programs,
    (SELECT COUNT(*) FROM fdp_programs WHERE status='upcoming') as upcoming,
    (SELECT COUNT(*) FROM fdp_programs WHERE status='completed') as completed,
    (SELECT COUNT(*) FROM fdp_participants) as total_participations,
    (SELECT COUNT(*) FROM fdp_external WHERE status='approved') as external_fdps,
    (SELECT COALESCE(SUM(duration_days),0) FROM fdp_programs WHERE status='completed') as total_days_organised`).get();
  const byType = db.prepare("SELECT type, COUNT(*) as count FROM fdp_programs GROUP BY type").all();
  const byMode = db.prepare("SELECT mode, COUNT(*) as count FROM fdp_programs GROUP BY mode").all();
  const topParticipants = db.prepare(`SELECT u.name, u.department, COUNT(fp.id) as count
    FROM fdp_participants fp JOIN users u ON fp.user_id = u.id
    GROUP BY fp.user_id ORDER BY count DESC LIMIT 10`).all();
  const monthlyTrend = db.prepare(`SELECT strftime('%Y-%m', start_date) as month, COUNT(*) as count
    FROM fdp_programs GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  res.json({ overview, byType, byMode, topParticipants, monthlyTrend });
});

module.exports = router;
