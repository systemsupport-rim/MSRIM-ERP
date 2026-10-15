const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

router.get('/rooms', (req, res) => {
  const { block, available } = req.query;
  let q = 'SELECT r.*, (SELECT COUNT(*) FROM hostel_allocations WHERE room_id = r.id AND status = \'active\') as current_occupancy FROM hostel_rooms r WHERE 1=1';
  const params = [];
  if (block) { q += ' AND r.block = ?'; params.push(block); }
  if (available === 'true') { q += ' AND r.capacity > (SELECT COUNT(*) FROM hostel_allocations WHERE room_id = r.id AND status = \'active\')'; }
  q += ' ORDER BY r.block, r.room_number';
  res.json(db.prepare(q).all(...params));
});

router.post('/rooms', authorize('admin','registrar'), (req, res) => {
  const { room_number, block, floor, capacity, type, monthly_rent, amenities } = req.body;
  const result = db.prepare('INSERT INTO hostel_rooms (room_number,block,floor,capacity,type,monthly_rent,amenities) VALUES (?,?,?,?,?,?,?)').run(room_number,block,floor||1,capacity||2,type||'double',monthly_rent||5000,amenities||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/allocations', (req, res) => {
  const { status } = req.query;
  let q = `SELECT ha.*, u.name as student_name, s.enrollment_number, r.room_number, r.block
    FROM hostel_allocations ha JOIN students s ON ha.student_id = s.id JOIN users u ON s.user_id = u.id JOIN hostel_rooms r ON ha.room_id = r.id WHERE 1=1`;
  const params = [];
  if (req.user.role === 'student') {
    const stu = db.prepare('SELECT id FROM students WHERE user_id = ?').get(req.user.id);
    if (stu) { q += ' AND ha.student_id = ?'; params.push(stu.id); }
  }
  if (status) { q += ' AND ha.status = ?'; params.push(status); }
  q += ' ORDER BY r.block, r.room_number';
  res.json(db.prepare(q).all(...params));
});

router.post('/allocations', authorize('admin','registrar'), (req, res) => {
  const { student_id, room_id, fee_per_month, remarks } = req.body;
  const room = db.prepare('SELECT r.*, (SELECT COUNT(*) FROM hostel_allocations WHERE room_id = r.id AND status = \'active\') as occ FROM hostel_rooms r WHERE r.id = ?').get(room_id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  if (room.occ >= room.capacity) return res.status(400).json({ error: 'Room is full.' });
  try {
    db.prepare('INSERT INTO hostel_allocations (student_id,room_id,fee_per_month,remarks) VALUES (?,?,?,?)').run(student_id,room_id,fee_per_month||room.monthly_rent,remarks||'');
    res.status(201).json({ message: 'Room allocated.' });
  } catch { res.status(400).json({ error: 'Student already has a room allocated.' }); }
});

router.put('/allocations/:id/vacate', authorize('admin','registrar'), (req, res) => {
  db.prepare("UPDATE hostel_allocations SET status = 'vacated', vacating_date = date('now') WHERE id = ?").run(req.params.id);
  res.json({ message: 'Room vacated.' });
});

router.get('/stats', (req, res) => {
  const totalRooms = db.prepare('SELECT COUNT(*) as c FROM hostel_rooms').get();
  const totalCapacity = db.prepare('SELECT SUM(capacity) as c FROM hostel_rooms').get();
  const occupied = db.prepare("SELECT COUNT(*) as c FROM hostel_allocations WHERE status = 'active'").get();
  const byBlock = db.prepare("SELECT block, SUM(capacity) as capacity, COUNT(ha.id) as occupied FROM hostel_rooms r LEFT JOIN hostel_allocations ha ON r.id = ha.room_id AND ha.status = 'active' GROUP BY r.block").all();
  res.json({ totalRooms: totalRooms.c, totalCapacity: totalCapacity.c || 0, currentHostellers: occupied.c, available: (totalCapacity.c || 0) - occupied.c, byBlock });
});

module.exports = router;
