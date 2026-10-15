import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Users2, Plus, CheckCircle, FileCheck, XCircle, Clock, X, Search, GraduationCap } from 'lucide-react';

const statusConfig = {
  applied: { color: 'badge-blue', label: 'Applied', icon: Clock },
  documents_pending: { color: 'badge-yellow', label: 'Docs Pending', icon: Clock },
  documents_verified: { color: 'badge-blue', label: 'Docs Verified', icon: FileCheck },
  form_approved: { color: 'badge-green', label: 'Form Approved', icon: CheckCircle },
  admitted: { color: 'bg-green-500 text-white', label: 'Admitted', icon: CheckCircle },
  rejected: { color: 'badge-red', label: 'Rejected', icon: XCircle },
  waitlisted: { color: 'badge-yellow', label: 'Waitlisted', icon: Clock },
};

export default function Admissions() {
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [admitTarget, setAdmitTarget] = useState(null);

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([
        api.get('/admissions', { params: { search: search || undefined, status: statusFilter || undefined } }),
        api.get('/admissions/stats')
      ]);
      setAdmissions(a.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  async function handleAction(id, action) {
    try {
      if (action === 'verify') await api.put(`/admissions/${id}/verify-documents`);
      else if (action === 'approve') await api.put(`/admissions/${id}/approve`);
      else await api.put(`/admissions/${id}/status`, { status: action });
      toast.success('Updated!'); fetchData(); setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admissions Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage admission applications and approvals</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Application</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Total Apps</p><p className="text-3xl font-bold text-msrim-blue">{stats.total}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Admitted</p><p className="text-3xl font-bold text-green-600">{stats.admitted}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Docs Verified</p><p className="text-3xl font-bold text-blue-600">{stats.docVerified}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Form Approved</p><p className="text-3xl font-bold text-msrim-orange">{stats.formApproved}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Conversion Rate</p><p className="text-3xl font-bold text-purple-600">{stats.total > 0 ? Math.round((stats.admitted / stats.total) * 100) : 0}%</p></div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants..." className="bg-transparent text-sm outline-none w-full" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select-field w-48">
          <option value="">All Status</option>
          {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Applicant</th><th className="table-th">Form No</th>
              <th className="table-th">Program</th><th className="table-th">Score</th>
              <th className="table-th">Date</th><th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="table-td text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : admissions.map(a => {
                  const cfg = statusConfig[a.status] || statusConfig.applied;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="table-td">
                        <div>
                          <p className="font-medium">{a.applicant_name}</p>
                          <p className="text-xs text-gray-400">{a.email}</p>
                        </div>
                      </td>
                      <td className="table-td font-mono text-xs">{a.form_number}</td>
                      <td className="table-td"><span className="badge-blue">{a.program_name}</span></td>
                      <td className="table-td font-semibold">{a.entrance_score || '—'}</td>
                      <td className="table-td">{new Date(a.application_date).toLocaleDateString()}</td>
                      <td className="table-td"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span></td>
                      <td className="table-td">
                        <div className="flex gap-1">
                          {a.status === 'applied' && <button onClick={() => handleAction(a.id, 'verify')} className="btn-secondary py-1 px-2 text-xs">Verify Docs</button>}
                          {a.status === 'documents_verified' && <button onClick={() => handleAction(a.id, 'approve')} className="btn-primary py-1 px-2 text-xs">Approve</button>}
                          {a.status === 'form_approved' && <button onClick={() => setAdmitTarget(a)} className="btn-orange py-1 px-2 text-xs"><GraduationCap className="w-3 h-3" /> Admit</button>}
                          <button onClick={() => setSelected(a)} className="btn-secondary py-1 px-2 text-xs">View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              {!loading && !admissions.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No applications found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-xl">{selected.applicant_name}</h2>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[['Form Number', selected.form_number], ['Email', selected.email], ['Phone', selected.phone],
                ['Program', selected.program_name], ['Batch Year', selected.batch_year], ['Gender', selected.gender],
                ['DOB', selected.dob], ['Category', selected.category], ['Entrance Score', selected.entrance_score],
                ['Status', statusConfig[selected.status]?.label], ['Applied On', new Date(selected.application_date).toLocaleDateString()],
                ['Docs Verified', selected.documents_verified ? 'Yes' : 'No'], ['Form Approved', selected.form_approved ? 'Yes' : 'No']
              ].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p><p className="text-sm font-medium mt-0.5">{v || '—'}</p></div>
              ))}
            </div>
            <div className="p-6 pt-0 flex gap-2 flex-wrap">
              {selected.status === 'applied' && <button onClick={() => handleAction(selected.id, 'verify')} className="btn-primary text-sm"><FileCheck className="w-4 h-4" /> Verify Documents</button>}
              {selected.status === 'documents_verified' && <button onClick={() => handleAction(selected.id, 'approve')} className="btn-primary text-sm"><CheckCircle className="w-4 h-4" /> Approve Form</button>}
              {selected.status === 'form_approved' && <button onClick={() => { setSelected(null); setAdmitTarget(selected); }} className="btn-orange text-sm"><GraduationCap className="w-4 h-4" /> Admit as Student</button>}
              {!['admitted', 'rejected'].includes(selected.status) && <button onClick={() => handleAction(selected.id, 'rejected')} className="btn-danger text-sm"><XCircle className="w-4 h-4" /> Reject</button>}
            </div>
          </div>
        </div>
      )}

      {admitTarget && (
        <AdmitModal
          admission={admitTarget}
          onClose={() => { setAdmitTarget(null); fetchData(); }}
        />
      )}

      {showAdd && <AddAdmissionModal onClose={() => { setShowAdd(false); fetchData(); }} />}
    </div>
  );
}

function AdmitModal({ admission, onClose }) {
  const [form, setForm] = useState({
    enrollment_number: `MSRIM-PGDM-${admission.batch_year}-`,
    semester: '1',
    batch_year: String(admission.batch_year || new Date().getFullYear()),
    section: 'A',
    roll_number: ''
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await api.post(`/admissions/${admission.id}/admit`, form);
      toast.success(`${admission.applicant_name} admitted! Login: ${res.data.username} / ${res.data.defaultPassword}`);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Admission failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-xl">Admit as Student</h2>
            <p className="text-gray-500 text-sm">{admission.applicant_name} · {admission.program_name}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Enrollment Number *</label>
            <input required value={form.enrollment_number} onChange={e => set('enrollment_number', e.target.value)} className="input-field font-mono" placeholder="MSRIM-PGDM-2025-001" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Semester</label>
              <select value={form.semester} onChange={e => set('semester', e.target.value)} className="select-field">
                {[1, 2, 3, 4].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Section</label>
              <select value={form.section} onChange={e => set('section', e.target.value)} className="select-field">
                {['A', 'B', 'C', 'D'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Batch Year</label>
              <input type="number" value={form.batch_year} onChange={e => set('batch_year', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Roll Number</label>
              <input value={form.roll_number} onChange={e => set('roll_number', e.target.value)} className="input-field" placeholder="Optional" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
            A student account will be created. Default password: <strong>Msrim@123</strong>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-orange">
              <GraduationCap className="w-4 h-4" />
              {loading ? 'Admitting...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddAdmissionModal({ onClose }) {
  const [form, setForm] = useState({ applicant_name: '', email: '', phone: '', dob: '', gender: 'Male', program_id: '1', batch_year: '2025', entrance_score: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/admissions', form); toast.success('Application added!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Application</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Full Name *</label><input required value={form.applicant_name} onChange={e => set('applicant_name', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Date of Birth</label><input type="date" value={form.dob} onChange={e => set('dob', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Gender</label><select value={form.gender} onChange={e => set('gender', e.target.value)} className="select-field"><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Program</label><select value={form.program_id} onChange={e => set('program_id', e.target.value)} className="select-field"><option value="1">PGDM</option><option value="2">FPM</option><option value="3">EPGDM</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Batch Year</label><input type="number" value={form.batch_year} onChange={e => set('batch_year', e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Entrance Score</label><input type="number" step="0.1" value={form.entrance_score} onChange={e => set('entrance_score', e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add'}</button></div>
        </form>
      </div>
    </div>
  );
}
