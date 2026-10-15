import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Users, Plus, CheckCircle, X, Award, Calendar, Clock } from 'lucide-react';

export default function HR({ defaultTab = 'attendance' }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(defaultTab);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [stats, setStats] = useState(null);
  const [showLeave, setShowLeave] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    setLoading(true);
    try {
      const [a, l, p, s] = await Promise.all([
        api.get('/hr/attendance'),
        api.get('/hr/leaves'),
        api.get('/hr/portfolios'),
        api.get('/hr/stats')
      ]);
      setAttendance(a.data); setLeaves(l.data); setPortfolios(p.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  async function handleApproveLeave(id, status) {
    try { await api.put(`/hr/leaves/${id}/approve`, { status }); toast.success(`Leave ${status}`); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  async function deletePortfolio(id) {
    try { await api.delete(`/hr/portfolios/${id}`); toast.success('Deleted'); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canApprove = ['admin','registrar','hod'].includes(user.role);
  const leaveStatusColors = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red', cancelled:'badge-gray' };
  const attStatusColors = { present:'badge-green', absent:'badge-red', half_day:'badge-yellow', late:'badge-orange', on_leave:'badge-blue', holiday:'badge-gray' };
  const catColors = { publication:'badge-blue', conference:'badge-green', award:'badge-orange', certification:'badge-purple', project:'badge-blue', patent:'badge-yellow', other:'badge-gray' };

  const tabs = [
    { id: 'attendance', label: 'Attendance' },
    { id: 'leaves', label: 'Leave Management' },
    { id: 'portfolios', label: 'Staff Portfolio' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Management</h1>
          <p className="text-gray-500 text-sm mt-1">Staff Attendance, Leave & Portfolio</p>
        </div>
        <div className="flex gap-2">
          {tab === 'leaves' && <button className="btn-primary" onClick={() => setShowLeave(true)}><Plus className="w-4 h-4" /> Apply Leave</button>}
          {tab === 'portfolios' && <button className="btn-primary" onClick={() => setShowPortfolio(true)}><Plus className="w-4 h-4" /> Add Portfolio</button>}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[['Present Today',stats.presentToday,'text-green-600'],['Pending Leaves',stats.pendingLeaves,'text-yellow-600'],['Approved Leaves',stats.approvedLeaves,'text-msrim-blue'],['Portfolio Items',stats.portfolios,'text-purple-600']].map(([l,v,c]) => (
            <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab===t.id?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{t.label}</button>)}
      </div>

      {tab === 'attendance' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                {canApprove && <th className="table-th">Staff Member</th>}
                <th className="table-th">Date</th><th className="table-th">Check In</th>
                <th className="table-th">Check Out</th><th className="table-th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {attendance.slice(0,20).map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    {canApprove && <td className="table-td"><p className="font-medium">{a.name}</p><p className="text-xs text-gray-400 capitalize">{a.role}</p></td>}
                    <td className="table-td">{new Date(a.date).toLocaleDateString()}</td>
                    <td className="table-td">{a.check_in || '—'}</td>
                    <td className="table-td">{a.check_out || '—'}</td>
                    <td className="table-td"><span className={attStatusColors[a.status]||'badge-gray'}>{a.status}</span></td>
                  </tr>
                ))}
                {!attendance.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No attendance records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="space-y-3">
          {leaves.map(l => (
            <div key={l.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  {canApprove && <p className="font-bold">{l.applicant_name} <span className="text-gray-400 font-normal text-sm">({l.role})</span></p>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge-blue capitalize">{l.leave_type}</span>
                    <span className={leaveStatusColors[l.status]||'badge-gray'}>{l.status}</span>
                    <span className="text-sm text-gray-500">{l.days} day(s)</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{new Date(l.from_date).toLocaleDateString()} – {new Date(l.to_date).toLocaleDateString()}</p>
                  {l.reason && <p className="text-sm text-gray-500 mt-1">{l.reason}</p>}
                  {l.approved_by_name && <p className="text-xs text-gray-400 mt-1">Actioned by: {l.approved_by_name}</p>}
                </div>
                {canApprove && l.status === 'pending' && (
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => handleApproveLeave(l.id,'approved')} className="btn-primary py-1.5 text-sm"><CheckCircle className="w-3 h-3" /> Approve</button>
                    <button onClick={() => handleApproveLeave(l.id,'rejected')} className="btn-danger py-1.5 text-sm"><X className="w-3 h-3" /> Reject</button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!leaves.length && <div className="card text-center py-12 text-gray-400">No leave applications</div>}
        </div>
      )}

      {tab === 'portfolios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {portfolios.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {canApprove && <p className="text-xs text-gray-400 mb-1">By {p.name}</p>}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={catColors[p.category]||'badge-gray'}>{p.category}</span>
                  </div>
                  <h3 className="font-bold">{p.title}</h3>
                  {p.institution && <p className="text-gray-500 text-sm">{p.institution}</p>}
                  {p.description && <p className="text-gray-600 text-sm mt-1">{p.description}</p>}
                  {p.date && <p className="text-xs text-gray-400 mt-1">{new Date(p.date).toLocaleDateString()}</p>}
                </div>
                {p.user_id === user.id && (
                  <button onClick={() => deletePortfolio(p.id)} className="p-1 text-red-400 hover:text-red-600 flex-shrink-0"><X className="w-4 h-4" /></button>
                )}
              </div>
            </div>
          ))}
          {!portfolios.length && <div className="col-span-2 card text-center py-12 text-gray-400">No portfolio items added</div>}
        </div>
      )}

      {showLeave && <ApplyLeaveModal onClose={() => { setShowLeave(false); fetchData(); }} />}
      {showPortfolio && <AddPortfolioModal onClose={() => { setShowPortfolio(false); fetchData(); }} />}
    </div>
  );
}

function ApplyLeaveModal({ onClose }) {
  const [form, setForm] = useState({ leave_type:'sick', from_date:'', to_date:'', days:'1', reason:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/hr/leaves', form); toast.success('Leave application submitted!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Apply for Leave</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Leave Type</label><select value={form.leave_type} onChange={e=>set('leave_type',e.target.value)} className="select-field">{['sick','casual','earned','maternity','paternity','duty'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">From Date *</label><input required type="date" value={form.from_date} onChange={e=>set('from_date',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">To Date *</label><input required type="date" value={form.to_date} onChange={e=>set('to_date',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Days</label><input type="number" value={form.days} onChange={e=>set('days',e.target.value)} className="input-field" min="1" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Reason</label><textarea value={form.reason} onChange={e=>set('reason',e.target.value)} className="input-field" rows={3} /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Submitting...':'Submit'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddPortfolioModal({ onClose }) {
  const [form, setForm] = useState({ category:'publication', title:'', description:'', institution:'', date:'', url:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/hr/portfolios', form); toast.success('Portfolio item added!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Portfolio Item</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Category</label><select value={form.category} onChange={e=>set('category',e.target.value)} className="select-field">{['publication','conference','award','certification','project','patent','other'].map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Date</label><input type="date" value={form.date} onChange={e=>set('date',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Institution/Journal</label><input value={form.institution} onChange={e=>set('institution',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">URL / DOI</label><input value={form.url} onChange={e=>set('url',e.target.value)} className="input-field" placeholder="https://..." /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Adding...':'Add'}</button></div>
        </form>
      </div>
    </div>
  );
}
