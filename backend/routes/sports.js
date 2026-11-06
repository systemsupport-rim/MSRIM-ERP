const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
  try {
    const teams       = db.prepare("SELECT COUNT(*) as c FROM sports_teams WHERE status='active'").get().c;
    const tournaments = db.prepare("SELECT COUNT(*) as c FROM sports_tournaments WHERE status IN ('upcoming','ongoing')").get().c;
    const facilities  = db.prepare("SELECT COUNT(*) as c FROM sports_facilities WHERE status='available'").get().c;
    res.json({ activeTeams: teams, activeTournaments: tournaments, availableFacilities: facilities });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/teams', authenticate, (req, res) => {
  try {
    const teams = db.prepare("SELECT * FROM sports_teams ORDER BY sport, name").all();
    res.json(teams);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/teams', authenticate, authorize('admin', 'registrar', 'hod', 'faculty'), (req, res) => {
  try {
    const { name, sport, category, coach_name, captain_name, members_count } = req.body;
    if (!name || !sport) return res.status(400).json({ error: 'Name and sport are required.' });
    const r = db.prepare(`
      INSERT INTO sports_teams (name,sport,category,coach_name,captain_name,members_count)
      VALUES (?,?,?,?,?,?)
    `).run(name, sport, category||'intercollegiate', coach_name, captain_name, members_count||0);
    res.json({ id: r.lastInsertRowid, message: 'Team created.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/tournaments', authenticate, (req, res) => {
  try {
    const tournaments = db.prepare("SELECT * FROM sports_tournaments ORDER BY start_date DESC").all();
    res.json(tournaments);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/tournaments', authenticate, authorize('admin', 'registrar', 'hod', 'faculty'), (req, res) => {
  try {
    const { name, sport, start_date, end_date, venue, level } = req.body;
    if (!name) return res.status(400).json({ error: 'Tournament name is required.' });
    const r = db.prepare(`
      INSERT INTO sports_tournaments (name,sport,start_date,end_date,venue,level)
      VALUES (?,?,?,?,?,?)
    `).run(name, sport, start_date, end_date, venue, level||'intercollegiate');
    res.json({ id: r.lastInsertRowid, message: 'Tournament created.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/facilities', authenticate, (req, res) => {
  try {
    const facilities = db.prepare("SELECT * FROM sports_facilities ORDER BY name").all();
    res.json(facilities);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/facilities', authenticate, authorize('admin', 'registrar'), (req, res) => {
  try {
    const { name, facility_type, capacity, location } = req.body;
    if (!name) return res.status(400).json({ error: 'Facility name is required.' });
    const r = db.prepare(`
      INSERT INTO sports_facilities (name,facility_type,capacity,location)
      VALUES (?,?,?,?)
    `).run(name, facility_type, capacity||null, location);
    res.json({ id: r.lastInsertRowid, message: 'Facility added.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
