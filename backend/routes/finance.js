const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/budget-heads', (req, res) => {
  res.json(db.prepare(`SELECT * FROM budget_heads ORDER BY category, name`).all());
});

router.post('/budget-heads', authorize('admin','accounts'), (req, res) => {
  const { name, code, category, parent_id } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code required.' });
  const result = db.prepare(`INSERT INTO budget_heads (name,code,category,parent_id) VALUES (?,?,?,?)`).run(name, code, category||'expenditure', parent_id||null);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/allocations', (req, res) => {
  const { academic_year_id, department } = req.query;
  let q = `SELECT ba.*, bh.name as head_name, bh.code as head_code, bh.category, u.name as created_by_name
    FROM budget_allocations ba JOIN budget_heads bh ON ba.head_id = bh.id LEFT JOIN users u ON ba.created_by = u.id WHERE 1=1`;
  const params = [];
  if (academic_year_id) { q += ' AND ba.academic_year_id = ?'; params.push(academic_year_id); }
  if (department) { q += ' AND ba.department = ?'; params.push(department); }
  q += ' ORDER BY bh.category, bh.name';
  res.json(db.prepare(q).all(...params));
});

router.post('/allocations', authorize('admin','accounts'), (req, res) => {
  const { head_id, academic_year_id, department, allocated_amount } = req.body;
  if (!head_id || !allocated_amount) return res.status(400).json({ error: 'head_id and allocated_amount required.' });
  const result = db.prepare(`INSERT INTO budget_allocations (head_id,academic_year_id,department,allocated_amount,created_by) VALUES (?,?,?,?,?)`).run(head_id, academic_year_id||1, department||'', parseFloat(allocated_amount)||0, req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/allocations/:id', authorize('admin','accounts'), (req, res) => {
  const { allocated_amount } = req.body;
  db.prepare(`UPDATE budget_allocations SET allocated_amount=? WHERE id=?`).run(parseFloat(allocated_amount)||0, req.params.id);
  res.json({ success: true });
});

router.get('/expenses', (req, res) => {
  const { status, department } = req.query;
  let q = `SELECT ev.*, bh.name as head_name, u.name as requested_by_name, a.name as approved_by_name
    FROM expense_vouchers ev JOIN budget_heads bh ON ev.budget_head_id = bh.id
    LEFT JOIN users u ON ev.requested_by = u.id LEFT JOIN users a ON ev.approved_by = a.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND ev.status = ?'; params.push(status); }
  if (department) { q += ' AND ev.department = ?'; params.push(department); }
  q += ' ORDER BY ev.created_at DESC LIMIT 200';
  res.json(db.prepare(q).all(...params));
});

router.post('/expenses', (req, res) => {
  const { budget_head_id, department, amount, description, vendor_name, payment_mode } = req.body;
  if (!budget_head_id || !amount) return res.status(400).json({ error: 'budget_head_id and amount required.' });
  const num = `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const result = db.prepare(`INSERT INTO expense_vouchers (voucher_number,budget_head_id,department,amount,description,vendor_name,payment_mode,requested_by) VALUES (?,?,?,?,?,?,?,?)`).run(num, budget_head_id, department||'', parseFloat(amount), description||'', vendor_name||'', payment_mode||'bank_transfer', req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, voucher_number: num });
});

router.put('/expenses/:id/action', authorize('admin','accounts'), (req, res) => {
  const { action } = req.body;
  const status = action === 'approve' ? 'approved' : (action === 'pay' ? 'paid' : 'rejected');
  const ev = db.prepare(`SELECT * FROM expense_vouchers WHERE id=?`).get(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Not found.' });
  db.prepare(`UPDATE expense_vouchers SET status=?,approved_by=?,approved_at=datetime('now') WHERE id=?`).run(status, req.user.id, req.params.id);
  if (status === 'approved') {
    db.prepare(`UPDATE budget_allocations SET utilized_amount=utilized_amount+? WHERE head_id=?`).run(ev.amount, ev.budget_head_id);
  }
  res.json({ success: true });
});

router.get('/income', (req, res) => {
  const income = db.prepare(`SELECT ie.*, bh.name as head_name, u.name as created_by_name FROM income_entries ie JOIN budget_heads bh ON ie.budget_head_id = bh.id LEFT JOIN users u ON ie.created_by = u.id ORDER BY ie.receipt_date DESC LIMIT 200`).all();
  res.json(income);
});

router.post('/income', authorize('admin','accounts'), (req, res) => {
  const { budget_head_id, amount, description, source, receipt_date } = req.body;
  if (!budget_head_id || !amount) return res.status(400).json({ error: 'budget_head_id and amount required.' });
  const num = `INC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const result = db.prepare(`INSERT INTO income_entries (entry_number,budget_head_id,amount,description,source,receipt_date,created_by) VALUES (?,?,?,?,?,?,?)`).run(num, budget_head_id, parseFloat(amount), description||'', source||'', receipt_date||new Date().toISOString().split('T')[0], req.user.id);
  res.status(201).json({ id: result.lastInsertRowid, entry_number: num });
});

router.get('/stats', (req, res) => {
  const totalBudget = db.prepare(`SELECT COALESCE(SUM(allocated_amount),0) as v FROM budget_allocations`).get().v;
  const totalUtilized = db.prepare(`SELECT COALESCE(SUM(utilized_amount),0) as v FROM budget_allocations`).get().v;
  const totalIncome = db.prepare(`SELECT COALESCE(SUM(amount),0) as v FROM income_entries`).get().v;
  const pendingExp = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM expense_vouchers WHERE status='pending'`).get();
  const approvedExp = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM expense_vouchers WHERE status='approved'`).get();
  const paidExp = db.prepare(`SELECT COUNT(*) as c, COALESCE(SUM(amount),0) as v FROM expense_vouchers WHERE status='paid'`).get();
  const headStats = db.prepare(`SELECT bh.name, bh.category, COALESCE(SUM(ba.allocated_amount),0) as allocated, COALESCE(SUM(ba.utilized_amount),0) as utilized FROM budget_heads bh LEFT JOIN budget_allocations ba ON bh.id=ba.head_id GROUP BY bh.id ORDER BY allocated DESC LIMIT 10`).all();
  const monthlyIncome = db.prepare(`SELECT strftime('%Y-%m', receipt_date) as month, SUM(amount) as total FROM income_entries GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  res.json({ totalBudget, totalUtilized, totalIncome, pendingExp, approvedExp, paidExp, utilizationRate: totalBudget>0?((totalUtilized/totalBudget)*100).toFixed(1):0, headStats, monthlyIncome });
});

module.exports = router;
