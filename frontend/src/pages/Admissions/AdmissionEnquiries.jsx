import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Phone, Mail, Calendar, ArrowRight, TrendingUp, Bell } from 'lucide-react';

const SOURCE_COLORS = {
  'walk-in': 'bg-blue-100 text-blue-700', website: 'bg-green-100 text-green-700',
  referral: 'bg-purple-100 text-purple-700', agent: 'bg-orange-100 text-orange-700',
  'social-media': 'bg-pink-100 text-pink-700', email: 'bg-indigo-100 text-indigo-700',
  phone: 'bg-teal-100 text-teal-700', fair: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_STYLES = {
  new: 'badge-blue', contacted: 'badge-yellow', interested: 'badge-green',
  'not-interested': 'badge-red', converted: 'bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium',
  lost: 'badge-gray',
};

export default function AdmissionEnquiries() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [stats, setStats] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [filters, setFilters] = useState({ status: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '', email: '', phone: '', source: 'walk-in',
    program_id: '', batch_year: new Date().getFullYear(), follow_up_date: '', notes: '',
  });

  useEffect(() => {
    api.get('/structure/programs').then(r => setPrograms(r.data || [])).catch(() => {});
    fetchData();
  }, []);

  useEffect(() => { fetchData(); }, [filters]);

  async function fetchData() {
    setLoading(true);
    const params = {};
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    try {
      const [e, s] = await Promise.all([
        api.get('/admissions/enquiries', { params }),
        api.get('/admissions/enquiries/stats'),
      ]);
      setEnquiries(e.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  async function addEnquiry() {
    if (!form.name.trim()) return toast.error('Name is required.');
    try {
      await api.post('/admissions/enquiries', form);
      toast.success('Enquiry added!');
      setShowForm(false);
      setForm({ name:'', email:'', phone:'', source:'walk-in', program_id:'', batch_year: new Date().getFullYear(), follow_up_date:'', notes:'' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/admissions/enquiries/${id}`, { status });
      toast.success('Status updated.');
      fetchData();
    } catch { toast.error('Failed.'); }
  }

  async function convertToApplication(id) {
    if (!confirm('Convert this enquiry to an admission application?')) return;
    try {
      const res = await api.post(`/admissions/enquiries/${id}/convert`, {});
      toast.success(`Converted! Form No: ${res.data.form_number}`);
      fetchData();
      setSelected(null);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  const canManage = ['admin', 'registrar', 'hod'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Admission Enquiries</h1>
          <p className="text-gray-500 text-sm mt-1">Track prospective student enquiries and convert to applications</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Enquiry
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Total Enquiries', stats.total, 'text-msrim-blue'],
            ['Converted', stats.converted, 'text-green-600'],
            ['Follow-up Due', stats.followDue, 'text-orange-600'],
            ['Conversion Rate', stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) + '%' : '0%', 'text-purple-600'],
          ].map(([l, v, c]) => (
            <div key={l} className="card p-4"><p className="text-gray-400 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      {/* Pipeline view by status */}
      {stats?.byStatus && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {['new','contacted','interested','not-interested','converted','lost'].map(s => {
            const found = stats.byStatus.find(b => b.status === s);
            return (
              <button key={s} onClick={() => setFilters(f => ({ ...f, status: f.status === s ? '' : s }))}
                className={`card p-3 text-center cursor-pointer hover:shadow-md transition-all ${filters.status === s ? 'ring-2 ring-msrim-blue' : ''}`}>
                <p className="text-xs text-gray-400 capitalize mb-1">{s.replace('-', ' ')}</p>
                <p className="text-xl font-bold text-gray-800">{found?.count || 0}</p>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
          placeholder="Search name, email, phone..." className="input-field flex-1 min-w-48" />
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="select-field w-44">
          <option value="">All Status</option>
          {['new','contacted','interested','not-interested','converted','lost'].map(s => (
            <option key={s} value={s}>{s.replace('-', ' ')}</option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Contact</th>
                <th className="table-th">Program</th>
                <th className="table-th">Source</th>
                <th className="table-th">Follow-up</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="table-td text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : enquiries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-xs text-gray-400">{new Date(e.created_at).toLocaleDateString()}</p>
                  </td>
                  <td className="table-td">
                    {e.phone && <p className="text-sm flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{e.phone}</p>}
                    {e.email && <p className="text-xs text-gray-400 flex items-center gap-1"><Mail className="w-3 h-3" />{e.email}</p>}
                  </td>
                  <td className="table-td text-sm">{e.program_name || '—'}</td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SOURCE_COLORS[e.source] || 'bg-gray-100 text-gray-600'}`}>{e.source}</span>
                  </td>
                  <td className="table-td text-sm">
                    {e.follow_up_date ? (
                      <span className={`flex items-center gap-1 ${new Date(e.follow_up_date) <= new Date() ? 'text-orange-600 font-medium' : 'text-gray-600'}`}>
                        <Calendar className="w-3 h-3" />
                        {new Date(e.follow_up_date).toLocaleDateString()}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="table-td">
                    <span className={STATUS_STYLES[e.status] || 'badge-gray'}>{e.status.replace('-', ' ')}</span>
                  </td>
                  <td className="table-td">
                    <div className="flex gap-1 flex-wrap">
                      <button onClick={() => setSelected(e)} className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">View</button>
                      {canManage && e.status !== 'converted' && e.status !== 'lost' && (
                        <button onClick={() => convertToApplication(e.id)}
                          className="text-xs px-2 py-1 bg-msrim-blue/10 hover:bg-msrim-blue/20 text-msrim-blue rounded-lg flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" /> Convert
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !enquiries.length && (
                <tr><td colSpan={7} className="table-td text-center py-12 text-gray-400">No enquiries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-bold text-lg">{selected.name}</h3>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                ['Email', selected.email], ['Phone', selected.phone],
                ['Program', selected.program_name], ['Batch Year', selected.batch_year],
                ['Source', selected.source], ['Status', selected.status],
                ['Assigned To', selected.assigned_name], ['Follow-up', selected.follow_up_date ? new Date(selected.follow_up_date).toLocaleDateString() : null],
              ].map(([k, v]) => (
                <div key={k}><p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p><p className="text-sm font-medium mt-0.5">{v || '—'}</p></div>
              ))}
              {selected.notes && (
                <div className="col-span-2"><p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p><p className="text-sm mt-0.5 text-gray-700">{selected.notes}</p></div>
              )}
            </div>
            {canManage && (
              <div className="p-5 pt-0 border-t mt-2 flex gap-2 flex-wrap">
                {['contacted','interested','not-interested','lost'].filter(s => s !== selected.status).map(s => (
                  <button key={s} onClick={() => { updateStatus(selected.id, s); setSelected(prev => ({ ...prev, status: s })); }}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 capitalize">{s.replace('-', ' ')}</button>
                ))}
                {selected.status !== 'converted' && (
                  <button onClick={() => convertToApplication(selected.id)}
                    className="btn-primary text-sm ml-auto">
                    <ArrowRight className="w-4 h-4" /> Convert to Application
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Enquiry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">Add Enquiry</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="input-field" placeholder="Prospective student name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Source</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="select-field">
                    {['walk-in','website','referral','agent','social-media','email','phone','fair','other'].map(s => (
                      <option key={s} value={s}>{s.replace('-', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Program</label>
                  <select value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))} className="select-field">
                    <option value="">Select program</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Batch Year</label>
                  <input type="number" value={form.batch_year} onChange={e => setForm(f => ({ ...f, batch_year: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Follow-up Date</label>
                  <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="input-field" rows={2} placeholder="Any relevant notes..." />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-2">
              <button onClick={addEnquiry} className="btn-primary flex-1">Add Enquiry</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
