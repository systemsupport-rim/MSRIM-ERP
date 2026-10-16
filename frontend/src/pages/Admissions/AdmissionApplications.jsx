import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  FileCheck, CheckCircle, XCircle, Clock, X, Search,
  GraduationCap, Send, DollarSign, ChevronRight, Filter
} from 'lucide-react';

const STAGES = [
  { key: 'applied',            label: 'Applied',        color: 'bg-blue-500' },
  { key: 'documents_pending',  label: 'Docs Pending',   color: 'bg-yellow-400' },
  { key: 'documents_verified', label: 'Docs Verified',  color: 'bg-blue-400' },
  { key: 'form_approved',      label: 'Form Approved',  color: 'bg-indigo-500' },
  { key: 'admitted',           label: 'Admitted',       color: 'bg-green-500' },
  { key: 'rejected',           label: 'Rejected',       color: 'bg-red-400' },
];

const statusBadge = {
  applied:            'badge-blue',
  documents_pending:  'badge-yellow',
  documents_verified: 'badge-blue',
  form_approved:      'bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium',
  admitted:           'bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium',
  rejected:           'badge-red',
  waitlisted:         'badge-yellow',
};

export default function AdmissionApplications() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [admitTarget, setAdmitTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [filters]);

  async function fetchData() {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    try {
      const [a, s] = await Promise.all([
        api.get('/admissions', { params }),
        api.get('/admissions/stats'),
      ]);
      setApps(a.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  async function act(id, action) {
    try {
      if (action === 'verify')  await api.put(`/admissions/${id}/verify-documents`);
      else if (action === 'approve') await api.put(`/admissions/${id}/approve`);
      else if (action === 'offer') {
        await api.post(`/admissions/${id}/offer-letter`, {});
        toast.success('Offer letter issued!');
      } else if (action === 'fee') {
        await api.put(`/admissions/${id}/initiate-fee`, {});
        toast.success('Fee initiation recorded!');
      } else await api.put(`/admissions/${id}/status`, { status: action });
      if (!['offer','fee'].includes(action)) toast.success('Updated!');
      fetchData(); setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  const canManage = ['admin', 'registrar'].includes(user.role);

  const pipelineCounts = STAGES.map(s => ({
    ...s,
    count: apps.filter(a => a.status === s.key).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admission Applications</h1>
        <p className="text-gray-500 text-sm mt-1">Full admission pipeline — documents, approval, offer letters & admission</p>
      </div>

      {/* Pipeline funnel */}
      <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
        {pipelineCounts.map((stage, i) => (
          <button key={stage.key} onClick={() => setFilters(f => ({ ...f, status: f.status === stage.key ? '' : stage.key }))}
            className={`flex-1 min-w-[90px] card p-3 text-center cursor-pointer hover:shadow-md transition-all ${filters.status === stage.key ? 'ring-2 ring-msrim-blue' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${stage.color} mx-auto mb-1`} />
            <p className="text-xs text-gray-500 leading-tight">{stage.label}</p>
            <p className="text-xl font-bold text-gray-800 mt-0.5">{stage.count}</p>
            {i < pipelineCounts.length - 1 && (
              <ChevronRight className="w-3 h-3 text-gray-300 mx-auto mt-1" />
            )}
          </button>
        ))}
      </div>

      {stats && (
        <div className="card p-4 bg-gradient-to-r from-msrim-blue/5 to-msrim-blue/0">
          <div className="flex flex-wrap gap-6 text-sm">
            <span>Total: <strong className="text-msrim-blue">{stats.total}</strong></span>
            <span>Admitted: <strong className="text-green-600">{stats.admitted}</strong></span>
            <span>Conversion: <strong className="text-purple-600">{stats.total > 0 ? Math.round((stats.admitted / stats.total) * 100) : 0}%</strong></span>
            <span>Docs Verified: <strong className="text-blue-600">{stats.docVerified}</strong></span>
            <span>Form Approved: <strong className="text-indigo-600">{stats.formApproved}</strong></span>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-48">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search applicant name, email, form no..." className="bg-transparent text-sm outline-none w-full" />
        </div>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="select-field w-48">
          <option value="">All Stages</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-th">Applicant</th>
                <th className="table-th">Form No.</th>
                <th className="table-th">Program</th>
                <th className="table-th">Score</th>
                <th className="table-th">Applied</th>
                <th className="table-th">Stage</th>
                <th className="table-th">Flags</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={8} className="table-td text-center py-8">
                  <div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : apps.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium">{a.applicant_name}</p>
                    <p className="text-xs text-gray-400">{a.email}</p>
                  </td>
                  <td className="table-td font-mono text-xs">{a.form_number}</td>
                  <td className="table-td"><span className="badge-blue">{a.program_name}</span></td>
                  <td className="table-td font-semibold">{a.entrance_score || '—'}</td>
                  <td className="table-td text-sm">{new Date(a.application_date || a.created_at).toLocaleDateString()}</td>
                  <td className="table-td">
                    <span className={statusBadge[a.status] || 'badge-gray'}>
                      {STAGES.find(s => s.key === a.status)?.label || a.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      {a.offer_issued ? <span className="text-xs text-green-600 font-medium">Offer ✓</span> : null}
                      {a.fee_initiated ? <span className="text-xs text-blue-600 font-medium">Fee ✓</span> : null}
                    </div>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => setSelected(a)} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">View</button>
                      {canManage && a.status === 'applied' && (
                        <button onClick={() => act(a.id, 'verify')} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg">Verify Docs</button>
                      )}
                      {canManage && a.status === 'documents_verified' && (
                        <button onClick={() => act(a.id, 'approve')} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg">Approve</button>
                      )}
                      {canManage && a.status === 'form_approved' && !a.offer_issued && (
                        <button onClick={() => act(a.id, 'offer')} className="text-xs px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg flex items-center gap-1">
                          <Send className="w-3 h-3" /> Offer
                        </button>
                      )}
                      {canManage && a.status === 'form_approved' && (
                        <button onClick={() => setAdmitTarget(a)} className="text-xs px-2 py-1 bg-msrim-orange/10 text-msrim-orange hover:bg-msrim-orange/20 rounded-lg flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" /> Admit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !apps.length && (
                <tr><td colSpan={8} className="table-td text-center py-12 text-gray-400">No applications found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-lg">{selected.applicant_name}</h3>
                <p className="text-sm text-gray-400">{selected.form_number}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                ['Email', selected.email], ['Phone', selected.phone],
                ['Program', selected.program_name], ['Batch Year', selected.batch_year],
                ['Gender', selected.gender], ['DOB', selected.dob],
                ['Category', selected.category], ['Entrance Score', selected.entrance_score],
                ['Stage', STAGES.find(s => s.key === selected.status)?.label],
                ['Applied On', new Date(selected.application_date || selected.created_at).toLocaleDateString()],
                ['Docs Verified', selected.documents_verified ? '✅ Yes' : '❌ No'],
                ['Form Approved', selected.form_approved ? '✅ Yes' : '❌ No'],
                ['Offer Issued', selected.offer_issued ? '✅ Yes' : '—'],
                ['Fee Initiated', selected.fee_initiated ? '✅ Yes' : '—'],
              ].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p><p className="text-sm font-medium mt-0.5">{v || '—'}</p></div>
              ))}
            </div>
            {canManage && (
              <div className="p-5 pt-0 border-t flex gap-2 flex-wrap">
                {selected.status === 'applied' && <button onClick={() => act(selected.id, 'verify')} className="btn-primary text-sm flex-1"><FileCheck className="w-4 h-4" /> Verify Documents</button>}
                {selected.status === 'documents_verified' && <button onClick={() => act(selected.id, 'approve')} className="btn-primary text-sm flex-1"><CheckCircle className="w-4 h-4" /> Approve Form</button>}
                {selected.status === 'form_approved' && !selected.offer_issued && (
                  <button onClick={() => act(selected.id, 'offer')} className="btn-secondary text-sm flex-1"><Send className="w-4 h-4" /> Issue Offer Letter</button>
                )}
                {selected.status === 'form_approved' && !selected.fee_initiated && (
                  <button onClick={() => act(selected.id, 'fee')} className="btn-secondary text-sm flex-1"><DollarSign className="w-4 h-4" /> Initiate Fee</button>
                )}
                {selected.status === 'form_approved' && (
                  <button onClick={() => { setSelected(null); setAdmitTarget(selected); }} className="btn-orange text-sm flex-1"><GraduationCap className="w-4 h-4" /> Admit</button>
                )}
                {!['admitted','rejected'].includes(selected.status) && (
                  <button onClick={() => act(selected.id, 'rejected')} className="btn-danger text-sm"><XCircle className="w-4 h-4" /> Reject</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {admitTarget && <AdmitModal admission={admitTarget} onClose={() => { setAdmitTarget(null); fetchData(); }} />}
    </div>
  );
}

function AdmitModal({ admission, onClose }) {
  const [form, setForm] = useState({
    enrollment_number: `MSRIM-PGDM-${admission.batch_year}-`,
    semester: '1', batch_year: String(admission.batch_year || new Date().getFullYear()),
    section: 'A', roll_number: '',
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
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <div><h3 className="font-bold text-lg">Admit as Student</h3><p className="text-gray-500 text-sm">{admission.applicant_name}</p></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Enrollment Number *</label>
            <input required value={form.enrollment_number} onChange={e => set('enrollment_number', e.target.value)} className="input-field font-mono" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Semester</label>
              <select value={form.semester} onChange={e => set('semester', e.target.value)} className="select-field">
                {[1,2,3,4].map(s => <option key={s} value={s}>Sem {s}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Section</label>
              <select value={form.section} onChange={e => set('section', e.target.value)} className="select-field">
                {['A','B','C','D'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Batch Year</label>
              <input type="number" value={form.batch_year} onChange={e => set('batch_year', e.target.value)} className="input-field" />
            </div>
            <div><label className="block text-sm font-medium mb-1">Roll Number</label>
              <input value={form.roll_number} onChange={e => set('roll_number', e.target.value)} className="input-field" placeholder="Optional" />
            </div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-700">Default password: <strong>Msrim@123</strong></div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-orange">
              <GraduationCap className="w-4 h-4" /> {loading ? 'Admitting...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
