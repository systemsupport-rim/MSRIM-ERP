const express = require('express');
const { db } = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/books', (req, res) => {
  const { search, category, available } = req.query;
  let query = 'SELECT * FROM library_books WHERE 1=1';
  const params = [];
  if (search) { query += ' AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  if (available === 'true') { query += ' AND available_copies > 0'; }
  query += ' ORDER BY title';
  res.json(db.prepare(query).all(...params));
});

router.post('/books', authorize('admin','librarian'), (req, res) => {
  const { isbn, title, author, publisher, year, category, total_copies, price, location } = req.body;
  const result = db.prepare('INSERT INTO library_books (isbn,title,author,publisher,year,category,total_copies,available_copies,price,location) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(isbn||null,title,author,publisher,year,category,total_copies||1,total_copies||1,price||0,location||'');
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/transactions', (req, res) => {
  const { user_id, status } = req.query;
  let uid = user_id;
  if (req.user.role === 'student' || req.user.role === 'faculty') uid = req.user.id;

  let query = `SELECT lt.*, b.title, b.author, b.isbn, u.name as borrower_name
    FROM library_transactions lt JOIN library_books b ON lt.book_id = b.id JOIN users u ON lt.user_id = u.id WHERE 1=1`;
  const params = [];
  if (uid) { query += ' AND lt.user_id = ?'; params.push(uid); }
  if (status) { query += ' AND lt.status = ?'; params.push(status); }
  query += ' ORDER BY lt.issue_date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/issue', authorize('librarian','admin'), (req, res) => {
  const { book_id, user_id } = req.body;
  const book = db.prepare('SELECT * FROM library_books WHERE id = ?').get(book_id);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (book.available_copies <= 0) return res.status(400).json({ error: 'No copies available.' });

  const existing = db.prepare("SELECT id FROM library_transactions WHERE book_id = ? AND user_id = ? AND status = 'issued'").get(book_id, user_id);
  if (existing) return res.status(400).json({ error: 'User already has this book.' });

  const due_date = new Date();
  due_date.setDate(due_date.getDate() + 14);

  db.prepare('INSERT INTO library_transactions (book_id,user_id,due_date,status,issued_by) VALUES (?,?,?,?,?)').run(book_id,user_id,due_date.toISOString().split('T')[0],'issued',req.user.id);
  db.prepare('UPDATE library_books SET available_copies = available_copies - 1 WHERE id = ?').run(book_id);
  res.status(201).json({ message: 'Book issued.', due_date: due_date.toISOString().split('T')[0] });
});

router.post('/return/:transactionId', authorize('librarian','admin'), (req, res) => {
  const txn = db.prepare("SELECT * FROM library_transactions WHERE id = ? AND status = 'issued'").get(req.params.transactionId);
  if (!txn) return res.status(404).json({ error: 'Transaction not found.' });

  const today = new Date();
  const due = new Date(txn.due_date);
  const overdueDays = Math.max(0, Math.floor((today - due) / 86400000));
  const fine = overdueDays * 5;

  db.prepare("UPDATE library_transactions SET status = 'returned', return_date = date('now'), fine_amount = ? WHERE id = ?").run(fine, txn.id);
  db.prepare('UPDATE library_books SET available_copies = available_copies + 1 WHERE id = ?').run(txn.book_id);
  res.json({ message: 'Book returned.', fine_amount: fine, overdue_days: overdueDays });
});

router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count, SUM(total_copies) as copies FROM library_books').get();
  const issued = db.prepare("SELECT COUNT(*) as count FROM library_transactions WHERE status = 'issued'").get();
  const overdue = db.prepare("SELECT COUNT(*) as count FROM library_transactions WHERE status = 'issued' AND due_date < date('now')").get();
  const categories = db.prepare('SELECT category, COUNT(*) as count FROM library_books GROUP BY category').all();
  res.json({ totalBooks: total.count, totalCopies: total.copies, currentlyIssued: issued.count, overdue: overdue.count, categories });
});

module.exports = router;
