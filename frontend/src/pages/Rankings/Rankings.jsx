import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, Award, Globe, BarChart3, Plus, X, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Rankings() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [systems, setSystems] = useState([]);
  const [history, setHistory] = useState([]);
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [cycleValues, setCycleValues] = useState([]);
  const [calculating, setCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});

  const isMgmt = ['admin','hod','registrar'].includes(user?.role);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, s, h, c] = await Promise.all([
        api.get('/rankings/dashboard'),
        api.get('/rankings/systems'),
        api.get('/rankings/history'),
        api.get('/rankings/cycles'),
      ]);
      setDashboard(d.data); setSystems(s.data); setHistory(h.data); setCycles(c.data);
    } catch { toast.error('Failed to load rankings data'); }
    setLoading(false);
  };

  const loadCycleValues = async (cycleId) => {
    try {
      const r = await api.get(`/rankings/cycles/${cycleId}/values`);
      setCycleValues(r.data); setSelectedCycle(cycleId);
    } catch { toast.error('Failed to load cycle data'); }
  };

  const autoCalculate = async (cycleId) => {
    setCalculating(true);
    try {
      const r = await api.post(`/rankings/cycles/${cycleId}/auto-calculate`);
      toast.success(`Auto-calculated ${r.data.metrics?.length || 0} metrics`);
      loadCycleValues(cycleId); loadAll();
    } catch { toast.error('Auto-calculate failed'); }
    setCalculating(false);
  };

  const submit = async () => {
    try {
      if (modalType === 'result') await api.post('/rankings/history', form);
      else if (modalType === 'cycle') await api.post('/rankings/cycles', form);
      toast.success('Saved!'); setShowModal(false); loadAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'systems', label: 'Ranking Systems' },
    { id: 'cycles', label: 'Active Cycles' },
    { id: 'history', label: 'Historical Results' },
  ];

  const metricCards = dashboard ? [
    { label: 'Total Students', value: dashboard.keyMetrics?.students, color: 'bg-blue-50 text-blue-600' },
    { label: 'Total Faculty', value: dashboard.keyMetrics?.faculty, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Publications', value: dashboard.keyMetrics?.publications, color: 'bg-violet-50 text-violet-600' },
    { label: 'Scopus Publications', value: dashboard.keyMetrics?.scopusPubs, color: 'bg-purple-50 text-purple-600' },
    { label: 'Patents Filed', value: dashboard.keyMetrics?.patents, color: 'bg-amber-50 text-amber-600' },
    { label: 'Active Grants', value: dashboard.keyMetrics?.grants, color: 'bg-green-50 text-green-600' },
    { label: 'FDP Days', value: dashboard.keyMetrics?.fdpDays, color: 'bg-teal-50 text-teal-600' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rankings & Accreditation Metrics</h1>
          <p className="text-gray-500 text-sm mt-1">NIRF · QS · AACSB · EQUIS · NBA · FT MBA</p>
        </div>
        {isMgmt && (
          <div className="flex gap-2">
            <button onClick={() => { setModalType('cycle'); setForm({ submission_year: new Date().getFullYear() }); setShowModal(true); }} className="btn-secondary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />New Cycle</button>
            <button onClick={() => { setModalType('result'); setForm({ year: new Date().getFullYear() }); setShowModal(true); }} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Log Result</button>
          </div>
        )}
      </div>

      {/* Key metrics */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {metricCards.map(m => (
            <div key={m.label} className="bg-white rounded-xl border p-3 text-center">
              <p className="text-xl font-bold text-gray-900">{m.value ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
          : tab === 'dashboard' && dashboard ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Latest Ranking Results</h3>
                {dashboard.latestResults?.length > 0 ? (
                  <div className="space-y-2">
                    {dashboard.latestResults.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <Globe className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{r.system_name}</p>
                          <p className="text-xs text-gray-500">Year {r.year}</p>
                        </div>
                        <div className="text-right">
                          {r.rank && <p className="font-bold text-gray-900">Rank #{r.rank}</p>}
                          {r.score && <p className="text-xs text-gray-500">Score: {r.score}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 text-sm">No ranking results logged yet.</p>}
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Pending Cycles</h3>
                {dashboard.pendingCycles?.length > 0 ? (
                  <div className="space-y-2">
                    {dashboard.pendingCycles.map(c => (
                      <div key={c.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{c.system_name} {c.submission_year}</p>
                          {c.submission_deadline && <p className="text-xs text-gray-500">Deadline: {c.submission_deadline}</p>}
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">{c.status?.replace('_',' ')}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 text-sm">No pending cycles.</p>}
              </div>
            </div>
          ) : tab === 'systems' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {systems.map(s => (
                <div key={s.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Award className="w-5 h-5 text-blue-600" /></div>
                    <span className={`text-xs px-2 py-0.5 rounded ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                  <p className="text-xs text-gray-400 mt-1 capitalize">{s.frequency}</p>
                </div>
              ))}
            </div>
          ) : tab === 'cycles' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 space-y-2">
                {cycles.map(c => (
                  <div key={c.id} onClick={() => loadCycleValues(c.id)}
                    className={`border rounded-lg p-3 cursor-pointer hover:bg-blue-50 transition-colors ${selectedCycle === c.id ? 'border-blue-500 bg-blue-50' : ''}`}>
                    <p className="font-medium text-sm">{c.system_name}</p>
                    <p className="text-xs text-gray-500">{c.submission_year} · {c.status?.replace('_',' ')}</p>
                    {c.submission_deadline && <p className="text-xs text-amber-600">Deadline: {c.submission_deadline}</p>}
                  </div>
                ))}
                {cycles.length === 0 && <p className="text-gray-400 text-sm">No cycles created.</p>}
              </div>
              <div className="md:col-span-2">
                {selectedCycle ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-700">Metric Values</h3>
                      {isMgmt && <button onClick={() => autoCalculate(selectedCycle)} disabled={calculating} className="btn-secondary text-xs flex items-center gap-1">
                        <Zap className="w-3 h-3" />{calculating ? 'Calculating...' : 'Auto-Calculate'}
                      </button>}
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {cycleValues.map(v => (
                        <div key={v.id} className="flex items-center gap-3 p-2 border rounded text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{v.metric_name}</p>
                            <p className="text-xs text-gray-500">{v.category} · weight: {v.weight}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{v.value ?? '—'} <span className="text-xs font-normal text-gray-500">{v.unit}</span></p>
                            {v.notes && <p className="text-xs text-gray-400">{v.notes}</p>}
                          </div>
                        </div>
                      ))}
                      {cycleValues.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No data entered. Click Auto-Calculate to populate from live DB.</p>}
                    </div>
                  </>
                ) : <p className="text-gray-400 text-sm text-center py-8">Select a cycle to view metrics.</p>}
              </div>
            </div>
          ) : tab === 'history' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-gray-500">
                  <th className="pb-2 text-left pr-4">System</th>
                  <th className="pb-2 text-left pr-4">Year</th>
                  <th className="pb-2 text-left pr-4">Rank</th>
                  <th className="pb-2 text-left pr-4">Score</th>
                  <th className="pb-2 text-left">Notes</th>
                </tr></thead>
                <tbody className="divide-y">
                  {history.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{r.system_name}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.year}</td>
                      <td className="py-2 pr-4">{r.rank ? <span className="font-bold text-blue-700">#{r.rank}</span> : '—'}</td>
                      <td className="py-2 pr-4">{r.score ?? '—'}</td>
                      <td className="py-2 text-gray-500">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && <p className="text-center text-gray-400 py-8">No ranking results logged yet.</p>}
            </div>
          ) : null}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold">{modalType === 'result' ? 'Log Ranking Result' : 'Create Submission Cycle'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <select className="input-field" value={form.system_id||''} onChange={e => setForm({...form,system_id:e.target.value})}>
                <option value="">Select Ranking System *</option>
                {systems.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input className="input-field" type="number" placeholder="Year *" value={form.year||form.submission_year||''} onChange={e => setForm({...form, year:e.target.value, submission_year:e.target.value})} />
              {modalType === 'result' ? <>
                <input className="input-field" type="number" placeholder="Rank" value={form.rank||''} onChange={e => setForm({...form,rank:e.target.value})} />
                <input className="input-field" type="number" placeholder="Score" value={form.score||''} onChange={e => setForm({...form,score:e.target.value})} />
                <input className="input-field" placeholder="Notes" value={form.notes||''} onChange={e => setForm({...form,notes:e.target.value})} />
              </> : <>
                <input className="input-field" type="date" placeholder="Submission Deadline" value={form.submission_deadline||''} onChange={e => setForm({...form,submission_deadline:e.target.value})} />
                <input className="input-field" type="number" placeholder="Target Rank" value={form.target_rank||''} onChange={e => setForm({...form,target_rank:e.target.value})} />
              </>}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={submit} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
