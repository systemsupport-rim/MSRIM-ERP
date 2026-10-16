import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Cpu, Activity, Plus, X } from 'lucide-react';

export default function BiometricManagement() {
  const { user } = useAuth();
  const [config, setConfig] = useState({ device_ip:'', device_port:'4370', enabled:'0' });
  const [records, setRecords] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ user_id:'', date:'', punch_in:'', punch_out:'' });
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/institution/settings', { params: { category:'biometric' } }),
      api.get('/institution/biometric', { params: { date: new Date().toISOString().slice(0,10) } }),
      api.get('/auth/users').catch(() => ({ data: [] })),
    ]).then(([s, r, u]) => {
      const bio = s.data.biometric || {};
      setConfig({ device_ip: bio.device_ip?.value||'', device_port: bio.device_port?.value||'4370', enabled: bio.enabled?.value||'0' });
      setRecords(r.data);
      setUsers(u.data.filter(u=>['faculty','staff'].includes(u.role)));
    }).finally(() => setLoading(false));
  }, []);

  async function saveConfig() {
    setSaving(true);
    try {
      await api.put('/institution/settings', { category:'biometric', settings: config });
      toast.success('Biometric device config saved.');
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  }

  async function addManual() {
    if (!manualForm.user_id || !manualForm.date) return toast.error('User and date required.');
    try {
      await api.post('/institution/biometric', { ...manualForm, source:'manual' });
      toast.success('Record added.');
      setShowManual(false);
      const r = await api.get('/institution/biometric', { params: { date: manualForm.date } });
      setRecords(r.data);
    } catch { toast.error('Failed.'); }
  }

  const canManage = ['admin','registrar'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Biometric Management</h1>
          <p className="text-gray-500 text-sm mt-1">Configure biometric devices and manage attendance punch records</p>
        </div>
        {canManage && <button onClick={() => setShowManual(true)} className="btn-secondary"><Plus className="w-4 h-4" /> Manual Entry</button>}
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2"><Cpu className="w-5 h-5 text-msrim-blue" /><h3 className="font-semibold">Device Configuration</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div><label className="block text-sm font-medium mb-1">Device IP Address</label>
            <input value={config.device_ip} onChange={e=>setConfig(c=>({...c,device_ip:e.target.value}))} className="input-field font-mono" placeholder="192.168.1.100" />
          </div>
          <div><label className="block text-sm font-medium mb-1">Port</label>
            <input value={config.device_port} onChange={e=>setConfig(c=>({...c,device_port:e.target.value}))} className="input-field font-mono" placeholder="4370" />
          </div>
          <div className="flex items-end gap-3">
            <label className="flex items-center gap-2 cursor-pointer pb-2">
              <input type="checkbox" checked={config.enabled==='1'} onChange={e=>setConfig(c=>({...c,enabled:e.target.checked?'1':'0'}))} className="w-4 h-4" />
              <span className="text-sm font-medium">Enable Sync</span>
            </label>
          </div>
        </div>
        {canManage && <div className="flex justify-end"><button onClick={saveConfig} disabled={saving} className="btn-primary"><Save className="w-4 h-4" />{saving?'Saving…':'Save Config'}</button></div>}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Activity className="w-4 h-4 text-msrim-blue" />
          <h3 className="font-semibold">Today's Punch Records ({records.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Staff</th><th className="table-th">Department</th>
              <th className="table-th">Punch In</th><th className="table-th">Punch Out</th>
              <th className="table-th">Source</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{r.name}</td>
                  <td className="table-td text-sm text-gray-500">{r.department}</td>
                  <td className="table-td font-mono text-sm text-green-700">{r.punch_in||'—'}</td>
                  <td className="table-td font-mono text-sm text-orange-600">{r.punch_out||'—'}</td>
                  <td className="table-td"><span className={r.source==='biometric'?'badge-blue':r.source==='mobile'?'badge-green':'badge-gray'}>{r.source}</span></td>
                </tr>
              ))}
              {!records.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No biometric records for today.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showManual && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between"><h3 className="font-bold text-lg">Manual Punch Entry</h3><button onClick={()=>setShowManual(false)}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Staff *</label>
                <select value={manualForm.user_id} onChange={e=>setManualForm(f=>({...f,user_id:e.target.value}))} className="select-field">
                  <option value="">Select staff…</option>
                  {users.map(u=><option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Date *</label><input type="date" value={manualForm.date} onChange={e=>setManualForm(f=>({...f,date:e.target.value}))} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Punch In</label><input type="time" value={manualForm.punch_in} onChange={e=>setManualForm(f=>({...f,punch_in:e.target.value}))} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-1">Punch Out</label><input type="time" value={manualForm.punch_out} onChange={e=>setManualForm(f=>({...f,punch_out:e.target.value}))} className="input-field" /></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addManual} className="btn-primary flex-1">Add Record</button>
              <button onClick={()=>setShowManual(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
