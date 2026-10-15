const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Vendors
router.get('/vendors', (req, res) => {
  const { category, is_active } = req.query;
  let q = `SELECT * FROM vendors WHERE 1=1`;
  const params = [];
  if (category) { q += ' AND category=?'; params.push(category); }
  if (is_active !== undefined) { q += ' AND is_active=?'; params.push(parseInt(is_active)); }
  q += ' ORDER BY name';
  res.json(db.prepare(q).all(...params));
});

router.post('/vendors', authorize('admin','accounts'), (req, res) => {
  const { name, code, category, contact_person, email, phone, address, gstin, bank_account } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code required.' });
  const result = db.prepare(`INSERT INTO vendors (name,code,category,contact_person,email,phone,address,gstin,bank_account) VALUES (?,?,?,?,?,?,?,?,?)`).run(name, code, category||'', contact_person||'', email||'', phone||'', address||'', gstin||'', bank_account||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/vendors/:id', authorize('admin','accounts'), (req, res) => {
  const { name, category, contact_person, email, phone, address, gstin, is_active, rating } = req.body;
  db.prepare(`UPDATE vendors SET name=?,category=?,contact_person=?,email=?,phone=?,address=?,gstin=?,is_active=?,rating=? WHERE id=?`).run(name, category||'', contact_person||'', email||'', phone||'', address||'', gstin||'', is_active??1, parseFloat(rating)||0, req.params.id);
  res.json({ success: true });
});

// Purchase Requisitions
router.get('/requisitions', (req, res) => {
  const { status, department } = req.query;
  let q = `SELECT pr.*, u.name as requested_by_name, a.name as approved_by_name FROM purchase_requisitions pr LEFT JOIN users u ON pr.requested_by=u.id LEFT JOIN users a ON pr.approved_by=a.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND pr.status=?'; params.push(status); }
  if (department) { q += ' AND pr.department=?'; params.push(department); }
  if (req.user.role === 'faculty') { q += ' AND pr.requested_by=?'; params.push(req.user.id); }
  q += ' ORDER BY pr.created_at DESC LIMIT 200';
  res.json(db.prepare(q).all(...params));
});

router.post('/requisitions', (req, res) => {
  const { department, item_description, quantity, unit, estimated_cost, priority, required_by } = req.body;
  if (!item_description || !quantity) return res.status(400).json({ error: 'Item and quantity required.' });
  const num = `PR-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const result = db.prepare(`INSERT INTO purchase_requisitions (pr_number,department,requested_by,item_description,quantity,unit,estimated_cost,priority,required_by) VALUES (?,?,?,?,?,?,?,?,?)`).run(num, department||req.user.department||'', req.user.id, item_description, parseFloat(quantity), unit||'nos', parseFloat(estimated_cost)||null, priority||'normal', required_by||null);
  res.status(201).json({ id: result.lastInsertRowid, pr_number: num });
});

router.put('/requisitions/:id/action', authorize('admin','accounts','hod'), (req, res) => {
  const { action, remarks } = req.body;
  const status = action === 'approve' ? 'approved' : 'rejected';
  db.prepare(`UPDATE purchase_requisitions SET status=?,approved_by=? WHERE id=?`).run(status, req.user.id, req.params.id);
  res.json({ success: true });
});

// Purchase Orders
router.get('/orders', (req, res) => {
  const { status } = req.query;
  let q = `SELECT po.*, v.name as vendor_name, pr.item_description as pr_item, u.name as created_by_name FROM purchase_orders po LEFT JOIN vendors v ON po.vendor_id=v.id LEFT JOIN purchase_requisitions pr ON po.pr_id=pr.id LEFT JOIN users u ON po.created_by=u.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND po.status=?'; params.push(status); }
  q += ' ORDER BY po.created_at DESC LIMIT 100';
  res.json(db.prepare(q).all(...params));
});

router.post('/orders', authorize('admin','accounts'), (req, res) => {
  const { pr_id, vendor_id, items_detail, total_amount, tax_amount, delivery_date } = req.body;
  if (!vendor_id || !total_amount) return res.status(400).json({ error: 'vendor_id and total_amount required.' });
  const num = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const result = db.prepare(`INSERT INTO purchase_orders (po_number,pr_id,vendor_id,items_detail,total_amount,tax_amount,delivery_date,created_by) VALUES (?,?,?,?,?,?,?,?)`).run(num, pr_id||null, vendor_id, JSON.stringify(items_detail||[]), parseFloat(total_amount), parseFloat(tax_amount)||0, delivery_date||null, req.user.id);
  if (pr_id) db.prepare(`UPDATE purchase_requisitions SET status='po_raised' WHERE id=?`).run(pr_id);
  res.status(201).json({ id: result.lastInsertRowid, po_number: num });
});

router.put('/orders/:id/status', authorize('admin','accounts'), (req, res) => {
  const { status } = req.body;
  db.prepare(`UPDATE purchase_orders SET status=? WHERE id=?`).run(status, req.params.id);
  if (status === 'received') {
    const po = db.prepare(`SELECT * FROM purchase_orders WHERE id=?`).get(req.params.id);
    if (po?.pr_id) db.prepare(`UPDATE purchase_requisitions SET status='received' WHERE id=?`).run(po.pr_id);
  }
  res.json({ success: true });
});

// Inventory
router.get('/inventory', (req, res) => {
  const items = db.prepare(`SELECT * FROM inventory_items ORDER BY category, name`).all();
  res.json(items);
});

router.post('/inventory', authorize('admin','accounts'), (req, res) => {
  const { name, code, category, unit, current_stock, min_stock, location } = req.body;
  if (!name || !code) return res.status(400).json({ error: 'Name and code required.' });
  const result = db.prepare(`INSERT INTO inventory_items (name,code,category,unit,current_stock,min_stock,location) VALUES (?,?,?,?,?,?,?)`).run(name, code, category||'', unit||'nos', parseFloat(current_stock)||0, parseFloat(min_stock)||0, location||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/inventory/:id', authorize('admin','accounts'), (req, res) => {
  const { current_stock, min_stock, location } = req.body;
  db.prepare(`UPDATE inventory_items SET current_stock=?,min_stock=?,location=?,last_updated=datetime('now') WHERE id=?`).run(parseFloat(current_stock)||0, parseFloat(min_stock)||0, location||'', req.params.id);
  res.json({ success: true });
});

router.get('/stats', (req, res) => {
  const totalVendors = db.prepare(`SELECT COUNT(*) as c FROM vendors WHERE is_active=1`).get().c;
  const totalPRs = db.prepare(`SELECT COUNT(*) as c FROM purchase_requisitions`).get().c;
  const pendingPRs = db.prepare(`SELECT COUNT(*) as c FROM purchase_requisitions WHERE status='pending'`).get().c;
  const totalPOs = db.prepare(`SELECT COUNT(*) as c FROM purchase_orders`).get().c;
  const poValue = db.prepare(`SELECT COALESCE(SUM(total_amount),0) as v FROM purchase_orders WHERE status != 'cancelled'`).get().v;
  const lowStock = db.prepare(`SELECT COUNT(*) as c FROM inventory_items WHERE current_stock <= min_stock AND min_stock > 0`).get().c;
  const totalItems = db.prepare(`SELECT COUNT(*) as c FROM inventory_items`).get().c;
  const recentPRs = db.prepare(`SELECT pr.*, u.name as requested_by_name FROM purchase_requisitions pr LEFT JOIN users u ON pr.requested_by=u.id ORDER BY pr.created_at DESC LIMIT 5`).all();
  res.json({ totalVendors, totalPRs, pendingPRs, totalPOs, poValue, lowStock, totalItems, recentPRs });
});

module.exports = router;
