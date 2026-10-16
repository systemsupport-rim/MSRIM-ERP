import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, DollarSign } from 'lucide-react';

export default function HostelFee() {
  const { user } = useAuth();
  const [fees, setFees] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ room_type:'Single', academic_year_id:'', amount:0, frequency:'annual', description:'' });
  const [loading, setLoading] = useState(true);

  const ROOM_TYPES = ['Single','Double','Triple','Four-Sharing','AC Single','AC Double','Suite'];

  useEffect(() => {
    Promise.all([
      api.get('/hostel/fee-structure').catch(() => ({ data: [] })),
      api.get('/structure/academic-years').catch(() => ({ data: [] })),
    ]).then(([f, ay]) => {
      setFees(f.data); setAcademicYears(ay.data);
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    try {
      await api.post('/hostel/fee-structure', form);
      toast.success('Fee structure saved.');
      setShowForm(false);
      const r = await api.get('/hostel/fee-structure').catch(() => ({ data: [] }));
      setFees(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  const canManage = ['admin','registrar','accounts'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const totalRevenue = fees.reduce((a, f) => a + f.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hostel Fee Structure</h1>
          <p className="text-gray-500 text-sm mt-1">Configure hostel fee by room type and academic year</p>
        </div>
        {canManage && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Fee</button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {ROOM_TYPES.slice(0,6).map(rt => {
          const matching = fees.filter(f => f.room_type === rt);
          const latest = matching[0];
          return (
            <div key={rt} className="card p-4">
              <p className="text-gray-400 text-sm">{rt}</p>
              {latest ? (
                <>
                  <p className="text-2xl font-bold text-msrim-blue">₹{latest.amount.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">{latest.frequency} · {latest.academic_year_name || '—'}</p>
                </>
              ) : <p className="text-gray-300 text-lg font-bold mt-1">Not set</p>}
            </div>
          );
        })}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold">Fee Structure ({fees.length} entries)</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Room Type</th><th className="table-th">Academic Year</th>
              <th className="table-th">Amount</th><th className="table-th">Frequency</th>
              <th className="table-th">Description</th><th className="table-th">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {fees.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{f.room_type}</td>
                  <td className="table-td">{f.academic_year_name || '—'}</td>
                  <td className="table-td font-bold text-msrim-blue">₹{f.amount.toLocaleString()}</td>
                  <td className="table-td capitalize">{f.frequency}</td>
                  <td className="table-td text-sm text-gray-500">{f.description || '—'}</td>
                  <td className="table-td"><span className={f.is_active?'badge-green':'badge-gray'}>{f.is_active?'Active':'Inactive'}</span></td>
                </tr>
              ))}
              {!fees.length && <tr><td colSpan={6} className="table-td text-center py-10 text-gray-400">No fee structure configured.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Hostel Fee</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Room Type</label>
                <select value={form.room_type} onChange={e=>setForm(f=>({...f,room_type:e.target.value}))} className="select-field">
                  {ROOM_TYPES.map(rt=><option key={rt} value={rt}>{rt}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Academic Year</label>
                <select value={form.academic_year_id} onChange={e=>setForm(f=>({...f,academic_year_id:e.target.value}))} className="select-field">
                  <option value="">Select year…</option>
                  {academicYears.map(ay=><option key={ay.id} value={ay.id}>{ay.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Amount (₹)</label>
                  <input type="number" min="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:parseFloat(e.target.value)||0}))} className="input-field" />
                </div>
                <div><label className="block text-sm font-medium mb-1">Frequency</label>
                  <select value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))} className="select-field">
                    {['monthly','quarterly','annual','one-time'].map(fr=><option key={fr} value={fr}>{fr}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description</label>
                <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="input-field" placeholder="Optional notes" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={save} className="btn-primary flex-1">Save Fee</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
