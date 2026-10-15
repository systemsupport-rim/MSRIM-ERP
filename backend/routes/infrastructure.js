const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/buildings', (req, res) => {
  const buildings = db.prepare('SELECT b.*, COUNT(r.id) as room_count FROM buildings b LEFT JOIN infra_rooms r ON b.id = r.building_id AND r.is_active = 1 WHERE b.is_active = 1 GROUP BY b.id ORDER BY b.name').all();
  res.json(buildings);
});

router.post('/buildings', authorize('admin','registrar'), (req, res) => {
  const { name, code, floors, description } = req.body;
  const result = db.prepare('INSERT INTO buildings (name,code,floors,description) VALUES (?,?,?,?)').run(name,code,floors||1,description||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/rooms', (req, res) => {
  const { building_id, room_type, available } = req.query;
  let q = `SELECT r.*, b.name as building_name FROM infra_rooms r JOIN buildings b ON r.building_id = b.id WHERE r.is_active = 1`;
  const params = [];
  if (building_id) { q += ' AND r.building_id = ?'; params.push(building_id); }
  if (room_type) { q += ' AND r.room_type = ?'; params.push(room_type); }
  q += ' ORDER BY b.name, r.floor, r.room_number';
  const rooms = db.prepare(q).all(...params);
  const today = new Date().toISOString().split('T')[0];
  res.json(rooms.map(r => {
    const activeBookings = db.prepare("SELECT COUNT(*) as c FROM venue_bookings WHERE room_id = ? AND booking_date = ? AND status = 'confirmed'").get(r.id, today);
    return { ...r, booked_today: activeBookings.c > 0 };
  }));
});

router.post('/rooms', authorize('admin','registrar'), (req, res) => {
  const { building_id, room_number, floor, room_type, capacity, has_projector, has_ac, has_wifi } = req.body;
  const result = db.prepare('INSERT INTO infra_rooms (building_id,room_number,floor,room_type,capacity,has_projector,has_ac,has_wifi) VALUES (?,?,?,?,?,?,?,?)').run(building_id,room_number,floor||1,room_type||'classroom',capacity||60,has_projector?1:0,has_ac?1:0,has_wifi?1:0);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/bookings', (req, res) => {
  const { date, room_id, status } = req.query;
  let q = `SELECT vb.*, r.room_number, b.name as building_name, u.name as booked_by_name
    FROM venue_bookings vb JOIN infra_rooms r ON vb.room_id = r.id JOIN buildings b ON r.building_id = b.id JOIN users u ON vb.booked_by = u.id WHERE 1=1`;
  const params = [];
  if (date) { q += ' AND vb.booking_date = ?'; params.push(date); }
  if (room_id) { q += ' AND vb.room_id = ?'; params.push(room_id); }
  if (status) { q += ' AND vb.status = ?'; params.push(status); }
  q += ' ORDER BY vb.booking_date DESC, vb.start_time';
  res.json(db.prepare(q).all(...params));
});

router.post('/bookings', (req, res) => {
  const { room_id, purpose, booking_date, start_time, end_time, attendees_count, remarks } = req.body;
  const conflict = db.prepare(`SELECT id FROM venue_bookings WHERE room_id = ? AND booking_date = ? AND status = 'confirmed' AND ((start_time <= ? AND end_time > ?) OR (start_time < ? AND end_time >= ?) OR (start_time >= ? AND end_time <= ?))`).get(room_id, booking_date, start_time, start_time, end_time, end_time, start_time, end_time);
  if (conflict) return res.status(400).json({ error: 'Room already booked for this time slot.' });
  const result = db.prepare('INSERT INTO venue_bookings (room_id,booked_by,purpose,booking_date,start_time,end_time,attendees_count,status,remarks) VALUES (?,?,?,?,?,?,?,?,?)').run(room_id,req.user.id,purpose,booking_date,start_time,end_time,attendees_count||0,'confirmed',remarks||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/bookings/:id/cancel', (req, res) => {
  const booking = db.prepare('SELECT * FROM venue_bookings WHERE id = ?').get(req.params.id);
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  if (booking.booked_by !== req.user.id && !['admin','registrar'].includes(req.user.role)) return res.status(403).json({ error: 'Access denied.' });
  db.prepare("UPDATE venue_bookings SET status = 'cancelled' WHERE id = ?").run(req.params.id);
  res.json({ message: 'Booking cancelled.' });
});

router.get('/stats', (req, res) => {
  const buildings = db.prepare('SELECT COUNT(*) as c FROM buildings WHERE is_active = 1').get();
  const rooms = db.prepare('SELECT COUNT(*) as c FROM infra_rooms WHERE is_active = 1').get();
  const bookings = db.prepare("SELECT COUNT(*) as c FROM venue_bookings WHERE status = 'confirmed'").get();
  const byType = db.prepare('SELECT room_type, COUNT(*) as count FROM infra_rooms WHERE is_active = 1 GROUP BY room_type').all();
  const todayBookings = db.prepare("SELECT COUNT(*) as c FROM venue_bookings WHERE booking_date = date('now') AND status = 'confirmed'").get();
  res.json({ buildings: buildings.c, rooms: rooms.c, totalBookings: bookings.c, todayBookings: todayBookings.c, byType });
});

module.exports = router;
