const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/definitions', (req, res) => {
  const defs = db.prepare(`SELECT wd.*, u.name as created_by_name FROM workflow_definitions wd LEFT JOIN users u ON wd.created_by = u.id ORDER BY wd.created_at DESC`).all();
  res.json(defs);
});

router.post('/definitions', authorize('admin','hod','registrar'), (req, res) => {
  const { name, type, description, steps_config } = req.body;
  if (!name || !type) return res.status(400).json({ error: 'Name and type required.' });
  const result = db.prepare(`INSERT INTO workflow_definitions (name,type,description,steps_config,created_by) VALUES (?,?,?,?,?)`).run(name, type, description||'', JSON.stringify(steps_config||[]), req.user.id);
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/definitions/:id', authorize('admin','hod','registrar'), (req, res) => {
  const { name, type, description, steps_config, is_active } = req.body;
  db.prepare(`UPDATE workflow_definitions SET name=?,type=?,description=?,steps_config=?,is_active=? WHERE id=?`).run(name, type, description||'', JSON.stringify(steps_config||[]), is_active??1, req.params.id);
  res.json({ success: true });
});

router.get('/instances', (req, res) => {
  const { status, my_tasks, workflow_type } = req.query;
  let q = `SELECT wi.*, wd.name as workflow_name, wd.type as workflow_type, u.name as initiated_by_name
    FROM workflow_instances wi
    JOIN workflow_definitions wd ON wi.workflow_id = wd.id
    JOIN users u ON wi.initiated_by = u.id WHERE 1=1`;
  const params = [];
  if (status) { q += ' AND wi.status = ?'; params.push(status); }
  if (workflow_type) { q += ' AND wd.type = ?'; params.push(workflow_type); }
  if (my_tasks === '1') {
    q += ` AND (wi.initiated_by = ? OR wi.id IN (SELECT instance_id FROM workflow_approvals WHERE approver_id = ?))`;
    params.push(req.user.id, req.user.id);
  }
  q += ' ORDER BY wi.created_at DESC LIMIT 100';
  res.json(db.prepare(q).all(...params));
});

router.post('/instances', (req, res) => {
  const { workflow_id, title, data } = req.body;
  if (!workflow_id || !title) return res.status(400).json({ error: 'workflow_id and title required.' });
  const wf = db.prepare(`SELECT * FROM workflow_definitions WHERE id = ? AND is_active = 1`).get(workflow_id);
  if (!wf) return res.status(404).json({ error: 'Workflow not found.' });
  const steps = JSON.parse(wf.steps_config || '[]');
  const result = db.prepare(`INSERT INTO workflow_instances (workflow_id,title,initiated_by,current_step,total_steps,status,data) VALUES (?,?,?,1,?,?,?)`).run(workflow_id, title, req.user.id, Math.max(steps.length,1), 'pending', JSON.stringify(data||{}));
  if (steps.length > 0 && steps[0].approver_id) {
    db.prepare(`INSERT INTO workflow_approvals (instance_id,step_number,approver_id,action) VALUES (?,1,?,'pending')`).run(result.lastInsertRowid, steps[0].approver_id);
  }
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/instances/:id', (req, res) => {
  const inst = db.prepare(`SELECT wi.*, wd.name as workflow_name, wd.type as workflow_type, wd.steps_config, u.name as initiated_by_name
    FROM workflow_instances wi JOIN workflow_definitions wd ON wi.workflow_id = wd.id JOIN users u ON wi.initiated_by = u.id WHERE wi.id = ?`).get(req.params.id);
  if (!inst) return res.status(404).json({ error: 'Not found.' });
  const approvals = db.prepare(`SELECT wa.*, u.name as approver_name FROM workflow_approvals wa LEFT JOIN users u ON wa.approver_id = u.id WHERE wa.instance_id = ? ORDER BY wa.step_number`).all(req.params.id);
  res.json({ ...inst, approvals });
});

router.put('/instances/:id/action', (req, res) => {
  const { action, remarks } = req.body;
  if (!['approved','rejected'].includes(action)) return res.status(400).json({ error: 'Invalid action.' });
  const instance = db.prepare(`SELECT * FROM workflow_instances WHERE id = ?`).get(req.params.id);
  if (!instance) return res.status(404).json({ error: 'Not found.' });
  db.prepare(`UPDATE workflow_approvals SET action=?,remarks=?,acted_at=datetime('now') WHERE instance_id=? AND approver_id=? AND action='pending'`).run(action, remarks||'', req.params.id, req.user.id);
  const finalStatus = action === 'rejected' ? 'rejected' : (instance.current_step >= instance.total_steps ? 'approved' : 'in_progress');
  db.prepare(`UPDATE workflow_instances SET status=?,current_step=?,updated_at=datetime('now') WHERE id=?`).run(finalStatus, Math.min(instance.current_step+1, instance.total_steps), req.params.id);
  res.json({ success: true, status: finalStatus });
});

router.get('/my-tasks', (req, res) => {
  const tasks = db.prepare(`SELECT wa.*, wi.title, wi.status as instance_status, wd.name as workflow_name, wd.type as workflow_type, u.name as initiated_by_name, wi.created_at as initiated_at
    FROM workflow_approvals wa
    JOIN workflow_instances wi ON wa.instance_id = wi.id
    JOIN workflow_definitions wd ON wi.workflow_id = wd.id
    JOIN users u ON wi.initiated_by = u.id
    WHERE wa.approver_id = ? AND wa.action = 'pending' ORDER BY wi.created_at DESC`).all(req.user.id);
  res.json(tasks);
});

router.get('/stats', (req, res) => {
  const total = db.prepare(`SELECT COUNT(*) as c FROM workflow_instances`).get().c;
  const pending = db.prepare(`SELECT COUNT(*) as c FROM workflow_instances WHERE status='pending'`).get().c;
  const in_progress = db.prepare(`SELECT COUNT(*) as c FROM workflow_instances WHERE status='in_progress'`).get().c;
  const approved = db.prepare(`SELECT COUNT(*) as c FROM workflow_instances WHERE status='approved'`).get().c;
  const rejected = db.prepare(`SELECT COUNT(*) as c FROM workflow_instances WHERE status='rejected'`).get().c;
  const myPending = db.prepare(`SELECT COUNT(*) as c FROM workflow_approvals WHERE approver_id=? AND action='pending'`).get(req.user.id).c;
  const byType = db.prepare(`SELECT wd.type, COUNT(*) as c FROM workflow_instances wi JOIN workflow_definitions wd ON wi.workflow_id=wd.id GROUP BY wd.type`).all();
  res.json({ total, pending, in_progress, approved, rejected, myPending, byType });
});

module.exports = router;
