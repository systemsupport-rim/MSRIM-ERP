import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Save } from 'lucide-react';

export default function HRMasterData() {
  const { user } = useAuth();
  const [tab, setTab] = useState('pay-scales');
  const [payScales, setPayScales] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ designation:'', level:'', basic_min:0, basic_max:0, grade_pay:0, da_percent:38, hra_percent:20 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/institution/pay-scales').then(r => setPayScales(r.data)).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!form.designation) return toast.error('Designation is required.');
    try {
      await api.post('/institution/pay-scales', form);
      toast.success('Pay scale added.');
      setShowForm(false);
      setForm({ designation:'', level:'', basic_min:0, basic_max:0, grade_pay:0, da_percent:38, hra_percent:20 });
      const r = await api.get('/institution/pay-scales');
      setPayScales(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  async function toggleActive(id, is_active) {
    await api.put(`/institution/pay-scales/${id}`, { is_active: !is_active });
    const r = await api.get('/institution/pay-scales');
    setPayScales(r.data);
  }

  const canManage = ['admin','registrar'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const gross = (scale) => {
    const basic = (scale.basic_min + scale.basic_max) / 2;
    return Math.round(basic + scale.grade_pay + (basic * scale.da_percent / 100) + (basic * scale.hra_percent / 100));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">HR Master Data</h1>
          <p className="text-gray-500 text-sm mt-1">Pay scales, designations, and HR configuration</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Pay Scale</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Pay Scales ({payScales.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-th">Designation</th><th className="table-th">Level</th>
                <th className="table-th">Basic (Min–Max)</th><th className="table-th">Grade Pay</th>
                <th className="table-th">DA %</th><th className="table-th">HRA %</th>
                <th className="table-th">Est. Gross</th><th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {payScales.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{s.designation}</td>
                  <td className="table-td text-sm">{s.level || '—'}</td>
                  <td className="table-td font-mono text-sm">₹{s.basic_min.toLocaleString()} – ₹{s.basic_max.toLocaleString()}</td>
                  <td className="table-td">₹{s.grade_pay.toLocaleString()}</td>
                  <td className="table-td">{s.da_percent}%</td>
                  <td className="table-td">{s.hra_percent}%</td>
                  <td className="table-td font-bold text-msrim-blue">₹{gross(s).toLocaleString()}</td>
                  <td className="table-td">
                    {canManage ? (
                      <button onClick={() => toggleActive(s.id, s.is_active)}
                        className={`text-xs px-2 py-0.5 rounded font-medium ${s.is_active?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </button>
                    ) : <span className={`text-xs px-2 py-0.5 rounded ${s.is_active?'badge-green':'badge-gray'}`}>{s.is_active?'Active':'Inactive'}</span>}
                  </td>
                </tr>
              ))}
              {!payScales.length && <tr><td colSpan={8} className="table-td text-center py-10 text-gray-400">No pay scales configured yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Pay Scale</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Designation *</label>
                <input value={form.designation} onChange={e => setForm(f=>({...f,designation:e.target.value}))} className="input-field" placeholder="e.g. Associate Professor" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Level / Grade</label>
                <input value={form.level} onChange={e => setForm(f=>({...f,level:e.target.value}))} className="input-field" placeholder="e.g. 11" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Grade Pay (₹)</label>
                <input type="number" value={form.grade_pay} onChange={e => setForm(f=>({...f,grade_pay:parseFloat(e.target.value)||0}))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Basic Min (₹)</label>
                <input type="number" value={form.basic_min} onChange={e => setForm(f=>({...f,basic_min:parseFloat(e.target.value)||0}))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Basic Max (₹)</label>
                <input type="number" value={form.basic_max} onChange={e => setForm(f=>({...f,basic_max:parseFloat(e.target.value)||0}))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">DA %</label>
                <input type="number" value={form.da_percent} onChange={e => setForm(f=>({...f,da_percent:parseFloat(e.target.value)||0}))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">HRA %</label>
                <input type="number" value={form.hra_percent} onChange={e => setForm(f=>({...f,hra_percent:parseFloat(e.target.value)||0}))} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1"><Save className="w-4 h-4" /> Save</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
