import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { HelpCircle, Plus, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

const priorityColors = { low:'badge-gray', medium:'badge-blue', high:'badge-yellow', urgent:'badge-red' };
const statusColors = { open:'badge-blue', in_progress:'badge-yellow', resolved:'badge-green', closed:'badge-gray', rejected:'badge-red' };

export default function Helpdesk() {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('requests');
  const [showRaise, setShowRaise] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [s, r, st] = await Promise.all([api.get('/helpdesk/services'), api.get('/helpdesk/requests'), api.get('/helpdesk/stats')]);
      setServices(s.data); setRequests(r.data); setStats(st.data);
    } finally { setLoading(false); }
  }

  async function handleResolve(id) {
    try { await api.put(`/helpdesk/requests/${id}/resolve`, { resolution_notes: 'Resolved by admin' }); toast.success('Request resolved!'); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canManage = ['admin','registrar'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campus Help Center</h1>
          <p className="text-gray-500 text-sm mt-1">Service Requests & Support</p>
        </div>
        <button className="btn-primary" onClick={() => setShowRaise(true)}><Plus className="w-4 h-4" /> Raise Request</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[['Total Requests',stats.total,'text-msrim-blue'],['Open',stats.open,'text-blue-600'],['Resolved',stats.resolved,'text-green-600'],['Services (Live)',stats.liveSvcs,'text-msrim-orange'],['Total Services',stats.totalSvcs,'text-purple-600']].map(([l,v,c]) => (
            <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['requests','My Requests'],['services','Services']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-2 rounded-md text-sm font-medium ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{label}</button>
        ))}
      </div>

      {tab === 'requests' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Subject</th><th className="table-th">Service</th>
                <th className="table-th">Priority</th><th className="table-th">Status</th>
                {canManage && <th className="table-th">Raised By</th>}
                <th className="table-th">Date</th><th className="table-th">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-td"><p className="font-medium">{r.subject}</p>{r.description && <p className="text-xs text-gray-400 truncate max-w-xs">{r.description}</p>}</td>
                    <td className="table-td"><p className="text-sm">{r.service_name}</p><span className="text-xs text-gray-400">{r.category}</span></td>
                    <td className="table-td"><span className={priorityColors[r.priority]||'badge-gray'}>{r.priority}</span></td>
                    <td className="table-td"><span className={statusColors[r.status]||'badge-gray'}>{r.status}</span></td>
                    {canManage && <td className="table-td">{r.raised_by_name}</td>}
                    <td className="table-td">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="table-td">
                      {canManage && r.status === 'open' && <button onClick={() => handleResolve(r.id)} className="btn-secondary py-1 px-2 text-xs"><CheckCircle className="w-3 h-3" /> Resolve</button>}
                      {r.status === 'resolved' && r.rating === null && <span className="text-xs text-gray-400">Rate Service</span>}
                    </td>
                  </tr>
                ))}
                {!requests.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No requests raised</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'services' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{s.name}</h3>
                  <p className="text-gray-500 text-sm">{s.category}</p>
                  {s.description && <p className="text-gray-600 text-sm mt-1">{s.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">SLA: {s.sla_hours}h · {s.request_count} requests</p>
                </div>
                <span className={s.is_active ? 'badge-green' : 'badge-red'}>{s.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <button onClick={() => { setShowRaise(true); }} className="mt-3 btn-primary py-1.5 text-sm w-full justify-center">Raise Request</button>
            </div>
          ))}
          {!services.length && <div className="col-span-3 card text-center py-12 text-gray-400">No services configured</div>}
        </div>
      )}

      {showRaise && <RaiseRequestModal services={services} onClose={() => { setShowRaise(false); fetchData(); }} />}
    </div>
  );
}

function RaiseRequestModal({ services, onClose }) {
  const [form, setForm] = useState({ service_id:'', subject:'', description:'', priority:'medium' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/helpdesk/requests', form); toast.success('Request raised!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Raise Help Request</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Service *</label>
            <select required value={form.service_id} onChange={e=>set('service_id',e.target.value)} className="select-field">
              <option value="">Select Service</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Subject *</label><input required value={form.subject} onChange={e=>set('subject',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Priority</label>
            <select value={form.priority} onChange={e=>set('priority',e.target.value)} className="select-field">
              {['low','medium','high','urgent'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={4} placeholder="Describe your issue in detail..." /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Raising...':'Raise Request'}</button></div>
        </form>
      </div>
    </div>
  );
}
