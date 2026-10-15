import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Briefcase, Plus, CheckCircle, Clock, XCircle, TrendingUp, X, Trash2, Ban } from 'lucide-react';

export default function Placements() {
  const { user } = useAuth();
  const [placements, setPlacements] = useState([]);
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('drives');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    setLoading(true);
    try {
      const [plc, apps, s] = await Promise.all([
        api.get('/placements'),
        api.get('/placements/applications'),
        api.get('/placements/stats')
      ]);
      setPlacements(plc.data); setApplications(apps.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  async function handleApply(placementId) {
    try {
      await api.post('/placements/apply', { placement_id: placementId });
      toast.success('Applied successfully!'); fetchData();
    } catch(err) { toast.error(err.response?.data?.error || 'Failed to apply'); }
  }

  const hasApplied = (id) => applications.some(a => a.placement_id === id || a.placement_id === id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Placement Cell</h1>
        {['admin','placement'].includes(user.role) && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Drive</button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Students Placed</p><p className="text-3xl font-bold text-msrim-blue">{stats.totalPlaced}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Avg Package</p><p className="text-3xl font-bold text-green-600">₹{stats.avgPackage} LPA</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Highest Package</p><p className="text-3xl font-bold text-msrim-orange">₹{stats.maxPackage} LPA</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Upcoming Drives</p><p className="text-3xl font-bold text-purple-600">{stats.upcomingDrives}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['drives','applications'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab===t ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'drives' ? 'Placement Drives' : 'My Applications'}
          </button>
        ))}
      </div>

      {tab === 'drives' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {placements.map(p => (
            <div key={p.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{p.company_name}</h3>
                  <p className="text-gray-600">{p.job_role}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${p.status==='upcoming'?'badge-blue':p.status==='completed'?'badge-green':'badge-yellow'}`}>
                  {p.status}
                </span>
              </div>
              <div className="space-y-1.5 mb-4">
                {p.package_lpa && <p className="text-green-600 font-bold text-lg">₹{p.package_lpa} LPA</p>}
                {p.location && <p className="text-gray-500 text-sm">📍 {p.location}</p>}
                {p.drive_date && <p className="text-gray-500 text-sm">📅 Drive Date: {new Date(p.drive_date).toLocaleDateString()}</p>}
                {p.last_apply_date && <p className="text-gray-500 text-sm">⏰ Apply by: {new Date(p.last_apply_date).toLocaleDateString()}</p>}
                {p.description && <p className="text-gray-600 text-sm mt-2 line-clamp-2">{p.description}</p>}
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  {p.total_applications} applied · {p.selected_count} selected
                </div>
                {user.role === 'student' && p.status === 'upcoming' && (
                  <button onClick={() => handleApply(p.id)}
                    disabled={applications.some(a => a.placement_id === p.id)}
                    className={`btn-primary text-sm py-1.5 disabled:opacity-50 ${applications.some(a => a.placement_id === p.id) ? 'bg-green-600 hover:bg-green-600' : ''}`}>
                    {applications.some(a => a.placement_id === p.id) ? (<><CheckCircle className="w-3 h-3" /> Applied</>) : (<><Briefcase className="w-3 h-3" /> Apply Now</>)}
                  </button>
                )}
                {['admin','placement'].includes(user.role) && (
                  <div className="flex items-center gap-1.5">
                    {p.status !== 'cancelled' && (
                      <button onClick={async () => {
                        if (!window.confirm(`Cancel "${p.company_name}" drive?`)) return;
                        try { await api.put(`/placements/${p.id}/deactivate`); toast.success('Drive cancelled'); fetchData(); }
                        catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                      }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-yellow-300 text-yellow-700 hover:bg-yellow-50 font-medium transition-colors">
                        <Ban className="w-3 h-3" /> Cancel
                      </button>
                    )}
                    <button onClick={async () => {
                      if (!window.confirm(`Permanently remove "${p.company_name}" drive?`)) return;
                      try { await api.delete(`/placements/${p.id}`); toast.success('Drive removed'); fetchData(); }
                      catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                    }} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors">
                      <Trash2 className="w-3 h-3" /> Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!placements.length && <div className="card text-center py-12 text-gray-400 col-span-2">No placement drives listed</div>}
        </div>
      )}

      {tab === 'applications' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                {user.role !== 'student' && <th className="table-th">Student</th>}
                <th className="table-th">Company</th><th className="table-th">Role</th>
                <th className="table-th">Package</th><th className="table-th">Applied</th>
                <th className="table-th">Status</th>
                {['admin','placement'].includes(user.role) && <th className="table-th">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {applications.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    {user.role !== 'student' && <td className="table-td"><p className="font-medium">{a.student_name}</p><p className="text-xs text-gray-400">{a.enrollment_number}</p></td>}
                    <td className="table-td font-medium">{a.company_name}</td>
                    <td className="table-td">{a.job_role}</td>
                    <td className="table-td font-semibold text-green-600">{a.package_lpa ? `₹${a.package_lpa} LPA` : '—'}</td>
                    <td className="table-td">{new Date(a.applied_date).toLocaleDateString()}</td>
                    <td className="table-td">
                      <span className={`${a.status==='selected'?'badge-green':a.status==='rejected'?'badge-red':a.status==='shortlisted'?'badge-yellow':'badge-blue'}`}>
                        {a.status}
                      </span>
                    </td>
                    {['admin','placement'].includes(user.role) && (
                      <td className="table-td">
                        <select defaultValue={a.status}
                          onChange={async e => {
                            try { await api.put(`/placements/applications/${a.id}/status`, { status: e.target.value }); toast.success('Updated'); fetchData(); }
                            catch { toast.error('Failed'); }
                          }}
                          className="select-field w-32 py-1 text-xs">
                          {['applied','shortlisted','selected','rejected','on_hold'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
                {!applications.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No applications</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddDriveModal onClose={() => { setShowAdd(false); fetchData(); }} />}
    </div>
  );
}

function AddDriveModal({ onClose }) {
  const [form, setForm] = useState({ company_name:'',job_role:'',package_lpa:'',drive_date:'',last_apply_date:'',description:'',requirements:'',location:'',type:'campus' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/placements', form); toast.success('Placement drive added!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Placement Drive</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Company Name *</label>
            <input required value={form.company_name} onChange={e => set('company_name',e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Job Role *</label>
            <input required value={form.job_role} onChange={e => set('job_role',e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Package (LPA)</label>
            <input type="number" step="0.5" value={form.package_lpa} onChange={e => set('package_lpa',e.target.value)} className="input-field" placeholder="12.5" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Drive Date</label>
            <input type="date" value={form.drive_date} onChange={e => set('drive_date',e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Apply Date</label>
            <input type="date" value={form.last_apply_date} onChange={e => set('last_apply_date',e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <input value={form.location} onChange={e => set('location',e.target.value)} className="input-field" placeholder="Bangalore" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={e => set('type',e.target.value)} className="select-field">
              {['campus','off-campus','internship'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description',e.target.value)} className="input-field" rows={3} />
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Drive'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
