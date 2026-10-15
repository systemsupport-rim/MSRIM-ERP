import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, Plus, BookOpen, ArrowDownToLine, ArrowUpFromLine, X } from 'lucide-react';

export default function Library() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('books');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showIssue, setShowIssue] = useState(null);

  useEffect(() => { fetchData(); }, [search, tab]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      const [bRes, tRes, sRes] = await Promise.all([
        api.get('/library/books', { params }),
        api.get('/library/transactions'),
        api.get('/library/stats')
      ]);
      setBooks(bRes.data); setTransactions(tRes.data); setStats(sRes.data);
    } catch { toast.error('Failed to load library data'); }
    finally { setLoading(false); }
  }

  async function handleReturn(txnId) {
    try {
      const res = await api.post(`/library/return/${txnId}`);
      toast.success(`Book returned. ${res.data.fine_amount > 0 ? `Fine: ₹${res.data.fine_amount}` : ''}`);
      fetchData();
    } catch { toast.error('Failed to return book'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Library Management</h1>
        {['librarian','admin'].includes(user.role) && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Book</button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Total Titles</p><p className="text-3xl font-bold text-msrim-blue">{stats.totalBooks}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Total Copies</p><p className="text-3xl font-bold text-green-600">{stats.totalCopies}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Issued</p><p className="text-3xl font-bold text-msrim-orange">{stats.currentlyIssued}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Overdue</p><p className="text-3xl font-bold text-red-500">{stats.overdue}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['books','transactions'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${tab===t ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'books' ? 'Books Catalog' : 'Issued Books'}
          </button>
        ))}
      </div>

      {tab === 'books' && (
        <>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 max-w-md">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title, author, ISBN..."
              className="bg-transparent text-sm outline-none w-full" />
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="table-th">Title</th><th className="table-th">Author</th>
                  <th className="table-th">Category</th><th className="table-th">Year</th>
                  <th className="table-th">Available</th>
                  {['librarian','admin'].includes(user.role) && <th className="table-th">Actions</th>}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {books.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="table-td"><p className="font-medium">{b.title}</p><p className="text-xs text-gray-400">{b.isbn}</p></td>
                      <td className="table-td">{b.author}</td>
                      <td className="table-td"><span className="badge-blue">{b.category}</span></td>
                      <td className="table-td">{b.year}</td>
                      <td className="table-td">
                        <span className={`font-medium ${b.available_copies > 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {b.available_copies} / {b.total_copies}
                        </span>
                      </td>
                      {['librarian','admin'].includes(user.role) && (
                        <td className="table-td">
                          <button onClick={() => setShowIssue(b)} disabled={b.available_copies === 0}
                            className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50">
                            <ArrowDownToLine className="w-3 h-3" /> Issue
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!books.length && <tr><td colSpan={6} className="table-td text-center py-8 text-gray-400">No books found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'transactions' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Book</th><th className="table-th">Borrower</th>
                <th className="table-th">Issued</th><th className="table-th">Due Date</th>
                <th className="table-th">Status</th>
                {['librarian','admin'].includes(user.role) && <th className="table-th">Actions</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="table-td"><p className="font-medium">{t.title}</p><p className="text-xs text-gray-400">{t.author}</p></td>
                    <td className="table-td">{t.borrower_name}</td>
                    <td className="table-td">{new Date(t.issue_date).toLocaleDateString()}</td>
                    <td className="table-td">{new Date(t.due_date).toLocaleDateString()}</td>
                    <td className="table-td">
                      <span className={t.status==='returned'?'badge-green':t.status==='overdue'?'badge-red':'badge-yellow'}>{t.status}</span>
                      {t.fine_amount > 0 && <p className="text-xs text-red-500">Fine: ₹{t.fine_amount}</p>}
                    </td>
                    {['librarian','admin'].includes(user.role) && (
                      <td className="table-td">
                        {t.status === 'issued' && (
                          <button onClick={() => handleReturn(t.id)} className="btn-secondary py-1.5 px-3 text-xs">
                            <ArrowUpFromLine className="w-3 h-3" /> Return
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!transactions.length && <tr><td colSpan={6} className="table-td text-center py-8 text-gray-400">No transactions</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddBookModal onClose={() => { setShowAdd(false); fetchData(); }} />}
      {showIssue && <IssueBookModal book={showIssue} onClose={() => { setShowIssue(null); fetchData(); }} />}
    </div>
  );
}

function AddBookModal({ onClose }) {
  const [form, setForm] = useState({ isbn:'',title:'',author:'',publisher:'',year:'2024',category:'Management',total_copies:'1',price:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/library/books', form); toast.success('Book added!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Book</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {[['Title *','title',true],['Author','author',false],['ISBN','isbn',false],['Publisher','publisher',false]].map(([l,k,r]) => (
            <div key={k} className={l.includes('Title')||l.includes('Author') ? 'col-span-2':''}>
              <label className="block text-sm font-medium mb-1">{l}</label>
              <input required={r} value={form[k]} onChange={e => set(k,e.target.value)} className="input-field" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={e => set('category',e.target.value)} className="select-field">
              {['Management','Finance','Marketing','HR','Operations','Strategy','Economics','Others'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          {[['Year','year','number'],['Copies','total_copies','number'],['Price (₹)','price','number']].map(([l,k,t]) => (
            <div key={k}>
              <label className="block text-sm font-medium mb-1">{l}</label>
              <input type={t} value={form[k]} onChange={e => set(k,e.target.value)} className="input-field" />
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Book'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IssueBookModal({ book, onClose }) {
  const [students, setStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/faculty')]).then(([s,f]) => {
      setStudents(s.data); setFaculty(f.data);
    });
  }, []);

  async function handleIssue() {
    if (!userId) return toast.error('Select a borrower');
    setLoading(true);
    try {
      await api.post('/library/issue', { book_id: book.id, user_id: userId });
      toast.success('Book issued! Due in 14 days.'); onClose();
    } catch(err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Issue Book</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="font-medium text-blue-800">{book.title}</p>
            <p className="text-blue-600 text-sm">{book.author} · Available: {book.available_copies}</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Borrower</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} className="select-field">
              <option value="">Select borrower...</option>
              <optgroup label="Students">{students.map(s => <option key={s.user_id} value={s.user_id}>{s.name} ({s.enrollment_number})</option>)}</optgroup>
              <optgroup label="Faculty">{faculty.map(f => <option key={f.user_id} value={f.user_id}>{f.name} ({f.employee_id})</option>)}</optgroup>
            </select>
          </div>
          <p className="text-xs text-gray-400">Due date: 14 days from today. Fine ₹5/day after due date.</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleIssue} disabled={loading} className="btn-primary">{loading ? 'Issuing...' : 'Issue Book'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
