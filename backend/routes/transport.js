const express = require('express');
const router = express.Router();
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
  try {
    const routes   = db.prepare("SELECT COUNT(*) as c FROM transport_routes WHERE status='active'").get().c;
    const vehicles = db.prepare("SELECT COUNT(*) as c FROM transport_vehicles WHERE status='active'").get().c;
    const passes   = db.prepare("SELECT COUNT(*) as c FROM transport_passes WHERE status='active'").get().c;
    res.json({ activeRoutes: routes, activeVehicles: vehicles, activePasses: passes });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/routes', authenticate, (req, res) => {
  try {
    const routes = db.prepare(`
      SELECT r.*, v.vehicle_number,
        (SELECT COUNT(*) FROM transport_passes WHERE route_id=r.id AND status='active') as passenger_count
      FROM transport_routes r LEFT JOIN transport_vehicles v ON r.vehicle_id=v.id
      ORDER BY r.route_number
    `).all();
    res.json(routes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/routes', authenticate, authorize('admin', 'registrar'), (req, res) => {
  try {
    const { route_name, route_number, start_point, end_point, stops, departure_time, arrival_time, vehicle_id, driver_name, driver_contact } = req.body;
    if (!route_name) return res.status(400).json({ error: 'Route name is required.' });
    const r = db.prepare(`
      INSERT INTO transport_routes (route_name,route_number,start_point,end_point,stops,departure_time,arrival_time,vehicle_id,driver_name,driver_contact)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(route_name, route_number, start_point, end_point, stops ? JSON.stringify(stops) : null, departure_time, arrival_time, vehicle_id||null, driver_name, driver_contact);
    res.json({ id: r.lastInsertRowid, message: 'Route created.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/vehicles', authenticate, (req, res) => {
  try {
    const vehicles = db.prepare("SELECT * FROM transport_vehicles ORDER BY vehicle_number").all();
    res.json(vehicles);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/vehicles', authenticate, authorize('admin', 'registrar'), (req, res) => {
  try {
    const { vehicle_number, vehicle_type, capacity, model, insurance_expiry, fitness_expiry } = req.body;
    if (!vehicle_number) return res.status(400).json({ error: 'Vehicle number is required.' });
    const r = db.prepare(`
      INSERT INTO transport_vehicles (vehicle_number,vehicle_type,capacity,model,insurance_expiry,fitness_expiry)
      VALUES (?,?,?,?,?,?)
    `).run(vehicle_number, vehicle_type||'bus', capacity||null, model, insurance_expiry, fitness_expiry);
    res.json({ id: r.lastInsertRowid, message: 'Vehicle added.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/passes', authenticate, (req, res) => {
  try {
    const passes = db.prepare(`
      SELECT tp.*, s.name as student_name, s.roll_number, tr.route_name, tr.route_number
      FROM transport_passes tp
      LEFT JOIN students s ON tp.student_id=s.id
      LEFT JOIN transport_routes tr ON tp.route_id=tr.id
      ORDER BY tp.created_at DESC
    `).all();
    res.json(passes);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/passes', authenticate, authorize('admin', 'registrar'), (req, res) => {
  try {
    const { student_id, route_id, valid_from, valid_to } = req.body;
    if (!student_id || !route_id) return res.status(400).json({ error: 'Student and route are required.' });
    const pass_number = 'TP' + Date.now();
    const r = db.prepare(`
      INSERT INTO transport_passes (student_id,route_id,pass_number,valid_from,valid_to)
      VALUES (?,?,?,?,?)
    `).run(student_id, route_id, pass_number, valid_from, valid_to);
    res.json({ id: r.lastInsertRowid, pass_number, message: 'Pass issued.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
