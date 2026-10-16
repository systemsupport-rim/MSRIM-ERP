import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Settings2, Target } from 'lucide-react';

export default function AdmissionSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [form, setForm] = useState({ academic_year_id: '', program_id: '', intake_target: 60, last_date: '', fee_amount: 0 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admissions/settings'),
      api.get('/structure/programs').catch(() => ({ data: [] })),
      api.get('/structure/academic-years').catch(() => ({ data: [] })),
    ]).then(([s, p, ay]) => {
      setSettings(s.data); setPrograms(p.data); setAcademicYears(ay.data);
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!form.academic_year_id || !form.program_id) return toast.error('Academic year and program are required.');
    setSaving(true);
    try {
      await api.post('/admissions/settings', form);
      toast.success('Settings saved.');
      const r = await api.get('/admissions/settings');
      setSettings(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  if (!['admin', 'registrar'].includes(user.role)) {
    return <div className="card p-8 text-center text-gray-400">Access restricted to Admin and Registrar.</div>;
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admission Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure intake targets, last dates and fee amounts per program</p>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold flex items-center gap-2 mb-4"><Settings2 className="w-4 h-4 text-msrim-blue" /> Configure Target</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Academic Year *</label>
            <select value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} className="select-field">
              <option value="">Select year...</option>
              {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Program *</label>
            <select value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))} className="select-field">
              <option value="">Select program...</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Intake Target</label>
            <input type="number" min="1" value={form.intake_target} onChange={e => setForm(f => ({ ...f, intake_target: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Date of Application</label>
            <input type="date" value={form.last_date} onChange={e => setForm(f => ({ ...f, last_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Application Fee (₹)</label>
            <input type="number" min="0" value={form.fee_amount} onChange={e => setForm(f => ({ ...f, fee_amount: e.target.value }))} className="input-field" />
          </div>
          <div className="flex items-end">
            <button onClick={save} disabled={saving} className="btn-primary w-full">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2">
          <Target className="w-4 h-4 text-msrim-blue" />
          <h3 className="font-semibold">Current Settings ({settings.length})</h3>
        </div>
        {settings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Academic Year</th>
                  <th className="table-th">Program</th>
                  <th className="table-th">Intake Target</th>
                  <th className="table-th">Last Date</th>
                  <th className="table-th">Application Fee</th>
                  <th className="table-th">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {settings.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{s.academic_year_name}</td>
                    <td className="table-td">{s.program_name}</td>
                    <td className="table-td">
                      <span className="font-bold text-msrim-blue text-lg">{s.intake_target}</span>
                      <span className="text-gray-400 text-xs ml-1">seats</span>
                    </td>
                    <td className="table-td">{s.last_date ? new Date(s.last_date).toLocaleDateString() : '—'}</td>
                    <td className="table-td">{s.fee_amount > 0 ? `₹${s.fee_amount.toLocaleString()}` : '—'}</td>
                    <td className="table-td text-xs text-gray-400">{new Date(s.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">No settings configured yet. Use the form above.</div>
        )}
      </div>
    </div>
  );
}
