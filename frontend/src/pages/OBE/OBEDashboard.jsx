import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Star, Target, TrendingUp, Award, BarChart3, CheckCircle,
  AlertCircle, Plus, X, RefreshCw, ChevronRight, BookOpen
} from 'lucide-react';

const BLOOM_COLORS = {
  Remembering: 'bg-gray-200 text-gray-700',
  Understanding: 'bg-blue-200 text-blue-800',
  Applying: 'bg-green-200 text-green-800',
  Analysing: 'bg-yellow-200 text-yellow-800',
  Evaluating: 'bg-orange-200 text-orange-800',
  Creating: 'bg-red-200 text-red-800',
};

const BLOOM_HEX = {
  Remembering:'#9ca3af', Understanding:'#60a5fa', Applying:'#4ade80',
  Analysing:'#fbbf24', Evaluating:'#f97316', Creating:'#f87171',
};

const PO_LEVEL_COLORS = ['bg-gray-100 text-gray-400','bg-yellow-100 text-yellow-700','bg-blue-100 text-blue-700','bg-green-100 text-green-700'];
const PO_LEVEL_LABELS = ['—','Level 1','Level 2','Level 3'];

function HBar({ value, max = 100, color = 'bg-msrim-blue', target, label }) {
  const pct = Math.min((value / max) * 100, 100);
  const tpct = target ? Math.min((target / max) * 100, 100) : null;
  return (
    <div className="relative">
      {label && <p className="text-xs text-gray-500 mb-1 truncate">{label}</p>}
      <div className="h-5 bg-gray-100 rounded-full relative overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        {tpct && (
          <div className="absolute top-0 h-full w-0.5 bg-red-500 opacity-60" style={{ left: `${tpct}%` }} title={`Target: ${target}%`} />
        )}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5">
        <span className="font-bold text-gray-700">{value}%</span>
        {target && <span className="text-red-400">Target: {target}%</span>}
      </div>
    </div>
  );
}

export default function OBEDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [coAttainment, setCoAttainment] = useState([]);
  const [poAttainment, setPoAttainment] = useState([]);
  const [mapping, setMapping] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filters, setFilters] = useState({ program_id: '1', academic_year_id: '' });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [allCOs, setAllCOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/structure/programs').catch(() => ({ data: [] })),
      api.get('/structure/academic-years').catch(() => ({ data: [] })),
    ]).then(([p, ay]) => { setPrograms(p.data); setAcademicYears(ay.data); });
  }, []);

  useEffect(() => { fetchAll(); }, [filters]);

  async function fetchAll() {
    setLoading(true);
    const p = { params: filters };
    try {
      const [sum, co, po, map, cos] = await Promise.all([
        api.get('/obe/dashboard', p),
        api.get('/obe/attainment', p),
        api.get('/obe/po-attainment', p),
        api.get('/obe/mapping', p),
        api.get('/obe/course-outcomes', p),
      ]);
      setSummary(sum.data); setCoAttainment(co.data); setPoAttainment(po.data);
      setMapping(map.data); setAllCOs(cos.data);
    } finally { setLoading(false); }
  }

  async function autoCalculate() {
    setCalculating(true);
    try {
      const res = await api.post('/obe/attainment/auto-calculate', filters);
      toast.success(res.data.message);
      fetchAll();
    } catch { toast.error('Auto-calculation failed. Enter marks first.'); }
    finally { setCalculating(false); }
  }

  const canManage = ['admin','hod','registrar','faculty'].includes(user.role);

  const tabs = [
    { id:'dashboard',   label:'Dashboard' },
    { id:'co-attainment', label:'CO Attainment' },
    { id:'po-attainment', label:'PO Attainment' },
    { id:'co-po-map',   label:'CO-PO Matrix' },
    { id:'bloom',       label:"Bloom's Analysis" },
  ];

  // Group COs by course for attainment display
  const cosByCourse = coAttainment.reduce((acc, ca) => {
    const key = ca.course_name;
    if (!acc[key]) acc[key] = { course_name: ca.course_name, course_code: ca.course_code, cos: [] };
    acc[key].cos.push(ca);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">OBE Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Outcome Based Education — Attainment Analysis & Reporting</p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <button onClick={autoCalculate} disabled={calculating}
                className="btn-secondary flex items-center gap-1.5">
                <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
                {calculating ? 'Calculating…' : 'Auto Calculate'}
              </button>
              <button onClick={() => setShowEntryModal(true)} className="btn-primary">
                <Plus className="w-4 h-4" /> Enter Attainment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Program</label>
          <select value={filters.program_id} onChange={e => setFilters(f => ({ ...f, program_id: e.target.value }))} className="select-field w-48">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Academic Year</label>
          <select value={filters.academic_year_id} onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value }))} className="select-field w-44">
            <option value="">All Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-gray-400">
          <div className="w-8 h-8 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading OBE data…
        </div>
      ) : (
        <>
          {/* ── Dashboard tab ── */}
          {activeTab === 'dashboard' && summary && (
            <div className="space-y-6">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Course Outcomes', summary.totalCOs, 'text-msrim-blue', Star],
                  ['Program Outcomes', summary.totalPOs, 'text-msrim-orange', Target],
                  ['Avg CO Attainment', `${summary.avgAttainment}%`, summary.avgAttainment >= 60 ? 'text-green-600' : 'text-red-500', TrendingUp],
                  ['COs Met Target', `${summary.metTarget}/${summary.totalWithAttainment||summary.totalCOs}`, 'text-purple-600', Award],
                ].map(([label, value, color, Icon]) => (
                  <div key={label} className="card p-4 flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl bg-gray-100 ${color}`}><Icon className="w-5 h-5" /></div>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* PO Attainment overview */}
              <div className="card p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-msrim-blue" /> Program Outcome Attainment
                </h3>
                {poAttainment.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {poAttainment.map(po => (
                      <div key={po.id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-msrim-blue flex-shrink-0">{po.code}</span>
                            <span className="text-xs text-gray-500 truncate">{po.description.slice(0, 50)}{po.description.length > 50 ? '…' : ''}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ml-2 ${PO_LEVEL_COLORS[po.level]}`}>
                            {PO_LEVEL_LABELS[po.level]}
                          </span>
                        </div>
                        <HBar
                          value={po.attainment}
                          color={po.attainment >= 70 ? 'bg-green-500' : po.attainment >= 60 ? 'bg-blue-500' : po.attainment > 0 ? 'bg-yellow-500' : 'bg-gray-200'}
                          target={60}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400">
                    <p className="text-sm">No PO attainment data yet.</p>
                    <p className="text-xs mt-1">Enter CO attainment or click "Auto Calculate" to derive PO attainment.</p>
                  </div>
                )}
              </div>

              {/* Bloom's distribution */}
              {summary.bloomDist?.length > 0 && (
                <div className="card p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-msrim-blue" /> Bloom's Taxonomy Distribution
                  </h3>
                  <div className="space-y-2">
                    {summary.bloomDist.map(b => (
                      <div key={b.bloom_level} className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium w-28 flex-shrink-0 ${BLOOM_COLORS[b.bloom_level] || 'bg-gray-100'}`}>{b.bloom_level}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4">
                          <div className="h-4 rounded-full" style={{ width: `${Math.min((b.count / summary.totalCOs) * 100, 100)}%`, backgroundColor: BLOOM_HEX[b.bloom_level] || '#ccc' }} />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-8 text-right">{b.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick CO attainment snapshot */}
              {coAttainment.length > 0 && (
                <div className="card p-0 overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">CO Attainment Snapshot</h3>
                    <button onClick={() => setActiveTab('co-attainment')} className="text-sm text-msrim-blue flex items-center gap-1">View all <ChevronRight className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b"><tr>
                        <th className="table-th">CO</th><th className="table-th">Course</th>
                        <th className="table-th">Bloom's</th>
                        <th className="table-th text-center">Direct %</th>
                        <th className="table-th text-center">Indirect %</th>
                        <th className="table-th text-center">Final %</th>
                        <th className="table-th text-center">Target</th>
                        <th className="table-th text-center">Status</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {coAttainment.slice(0, 8).map(ca => (
                          <tr key={ca.id} className="hover:bg-gray-50">
                            <td className="table-td font-bold text-msrim-blue">{ca.co_code}</td>
                            <td className="table-td text-sm">{ca.course_code}</td>
                            <td className="table-td"><span className={`text-xs px-1.5 py-0.5 rounded ${BLOOM_COLORS[ca.bloom_level] || 'badge-gray'}`}>{ca.bloom_level}</span></td>
                            <td className="table-td text-center font-medium">{ca.direct_attainment}%</td>
                            <td className="table-td text-center text-gray-500">{ca.indirect_attainment}%</td>
                            <td className="table-td text-center">
                              <span className={`font-bold ${ca.final_attainment >= ca.target ? 'text-green-600' : 'text-red-500'}`}>{ca.final_attainment}%</span>
                            </td>
                            <td className="table-td text-center text-gray-400">{ca.target}%</td>
                            <td className="table-td text-center">
                              {ca.final_attainment >= ca.target
                                ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                : <AlertCircle className="w-4 h-4 text-red-400 mx-auto" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── CO Attainment tab ── */}
          {activeTab === 'co-attainment' && (
            <div className="space-y-4">
              {Object.keys(cosByCourse).length > 0 ? (
                Object.values(cosByCourse).map(course => (
                  <div key={course.course_name} className="card p-0 overflow-hidden">
                    <div className="p-3 bg-msrim-blue/5 border-b flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-msrim-blue" />
                      <h3 className="font-semibold text-sm">{course.course_code} — {course.course_name}</h3>
                    </div>
                    <div className="p-4 space-y-3">
                      {course.cos.map(ca => (
                        <div key={ca.id}>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-msrim-blue text-sm">{ca.co_code}</span>
                            <span className="text-xs text-gray-500 flex-1">{ca.description}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${BLOOM_COLORS[ca.bloom_level] || 'badge-gray'}`}>{ca.bloom_level}</span>
                            {ca.final_attainment >= ca.target
                              ? <span className="badge-green">Met Target</span>
                              : <span className="badge-red">Below Target</span>}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Direct (80%)</p>
                              <HBar value={ca.direct_attainment} color="bg-blue-400" target={ca.target} />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Indirect (20%)</p>
                              <HBar value={ca.indirect_attainment} color="bg-indigo-300" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Final Attainment</p>
                              <HBar value={ca.final_attainment} color={ca.final_attainment >= ca.target ? 'bg-green-500' : 'bg-red-400'} target={ca.target} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="card p-12 text-center text-gray-400">
                  <Star className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="font-medium">No CO attainment data</p>
                  <p className="text-sm mt-1">Click "Auto Calculate" to derive from exam marks, or "Enter Attainment" to add manually.</p>
                </div>
              )}
            </div>
          )}

          {/* ── PO Attainment tab ── */}
          {activeTab === 'po-attainment' && (
            <div className="space-y-4">
              <div className="card p-4 bg-blue-50 border-blue-100 text-sm text-blue-700">
                PO attainment is derived from CO attainment weighted by CO-PO mapping strength (1=Low, 2=Medium, 3=High). Level 1: &lt;60% · Level 2: 60–70% · Level 3: ≥70%
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-th">PO Code</th><th className="table-th">Program Outcome</th>
                      <th className="table-th text-center">COs Linked</th>
                      <th className="table-th">Attainment</th>
                      <th className="table-th text-center">Level</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {poAttainment.map(po => (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="table-td font-bold text-msrim-orange">{po.code}</td>
                          <td className="table-td">{po.description}</td>
                          <td className="table-td text-center">{po.co_count}</td>
                          <td className="table-td w-64">
                            <HBar value={po.attainment} color={po.attainment >= 70 ? 'bg-green-500' : po.attainment >= 60 ? 'bg-blue-500' : po.attainment > 0 ? 'bg-yellow-500' : 'bg-gray-200'} target={60} />
                          </td>
                          <td className="table-td text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${PO_LEVEL_COLORS[po.level]}`}>{PO_LEVEL_LABELS[po.level]}</span>
                          </td>
                        </tr>
                      ))}
                      {!poAttainment.length && <tr><td colSpan={5} className="table-td text-center py-10 text-gray-400">No PO data. Enter CO attainment and map COs to POs first.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── CO-PO Matrix tab ── */}
          {activeTab === 'co-po-map' && mapping && (
            <div className="card overflow-x-auto p-5">
              <h3 className="font-semibold mb-2">CO-PO Correlation Matrix</h3>
              <p className="text-xs text-gray-400 mb-4">1 = Low · 2 = Medium · 3 = High correlation</p>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 text-gray-500 min-w-[200px]">Course Outcome</th>
                    {mapping.pos?.map(po => <th key={po.id} className="p-2 text-center text-msrim-blue font-bold min-w-[50px]">{po.code}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {mapping.cos?.map(co => (
                    <tr key={co.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">
                        <p className="font-medium text-msrim-blue">{co.code}</p>
                        <p className="text-xs text-gray-400 max-w-xs truncate">{co.description}</p>
                        <p className="text-xs text-gray-300">{co.course_name}</p>
                      </td>
                      {mapping.pos?.map(po => {
                        const strength = mapping.mapMatrix?.[co.id]?.[po.id] || 0;
                        const cellColors = { 0:'bg-gray-50 text-gray-300', 1:'bg-blue-100 text-blue-600', 2:'bg-blue-300 text-blue-800', 3:'bg-msrim-blue text-white' };
                        return (
                          <td key={po.id} className="p-2 text-center">
                            <span className={`inline-flex w-8 h-8 rounded items-center justify-center text-xs font-bold mx-auto ${cellColors[strength]}`}>
                              {strength || '—'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Bloom's Analysis tab ── */}
          {activeTab === 'bloom' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(BLOOM_COLORS).map(([level, cls]) => {
                  const cos = allCOs.filter(co => co.bloom_level === level);
                  return (
                    <div key={level} className="card p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${cls}`}>{level}</span>
                        <span className="text-2xl font-bold text-gray-800">{cos.length}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${allCOs.length ? (cos.length/allCOs.length*100) : 0}%`, backgroundColor: BLOOM_HEX[level] }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{allCOs.length ? Math.round(cos.length/allCOs.length*100) : 0}% of all COs</p>
                    </div>
                  );
                })}
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b"><h3 className="font-semibold">All Course Outcomes by Bloom's Level</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-th">Code</th><th className="table-th">Description</th>
                      <th className="table-th">Course</th><th className="table-th">Bloom's Level</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {Object.entries(BLOOM_COLORS).map(([level]) =>
                        allCOs.filter(co => co.bloom_level === level).map(co => (
                          <tr key={co.id} className="hover:bg-gray-50">
                            <td className="table-td font-bold text-msrim-blue">{co.code}</td>
                            <td className="table-td text-sm">{co.description}</td>
                            <td className="table-td text-xs text-gray-500">{co.course_name}</td>
                            <td className="table-td"><span className={`text-xs px-2 py-0.5 rounded font-medium ${BLOOM_COLORS[co.bloom_level]||'badge-gray'}`}>{co.bloom_level}</span></td>
                          </tr>
                        ))
                      )}
                      {!allCOs.length && <tr><td colSpan={4} className="table-td text-center py-8 text-gray-400">No COs defined</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Enter Attainment Modal */}
      {showEntryModal && (
        <AttainmentModal
          allCOs={allCOs}
          academicYears={academicYears}
          onClose={() => { setShowEntryModal(false); fetchAll(); }}
        />
      )}
    </div>
  );
}

function AttainmentModal({ allCOs, academicYears, onClose }) {
  const [form, setForm] = useState({ co_id:'', academic_year_id:'', direct_attainment:'', indirect_attainment:'', target:60 });
  const [saving, setSaving] = useState(false);
  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const finalPreview = form.direct_attainment
    ? ((parseFloat(form.direct_attainment)||0)*0.8 + (parseFloat(form.indirect_attainment)||0)*0.2).toFixed(1)
    : '—';

  async function save() {
    if (!form.co_id || form.direct_attainment === '') return toast.error('CO and Direct Attainment are required.');
    setSaving(true);
    try {
      await api.post('/obe/attainment', form);
      toast.success('Attainment saved!');
      setForm({ co_id:'', academic_year_id:'', direct_attainment:'', indirect_attainment:'', target:60 });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg">Enter CO Attainment</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="text-xs text-blue-700 bg-blue-50 rounded-xl p-3">
          Formula: Final = Direct × 80% + Indirect × 20%
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Course Outcome *</label>
            <select value={form.co_id} onChange={e => f('co_id', e.target.value)} className="select-field">
              <option value="">Select CO…</option>
              {allCOs.map(co => <option key={co.id} value={co.id}>{co.code} — {co.description.slice(0,50)} ({co.course_code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Academic Year</label>
            <select value={form.academic_year_id} onChange={e => f('academic_year_id', e.target.value)} className="select-field">
              <option value="">Select year…</option>
              {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Direct Attainment % *</label>
              <input type="number" min="0" max="100" step="0.1" value={form.direct_attainment}
                onChange={e => f('direct_attainment', e.target.value)} className="input-field" placeholder="e.g. 72.5" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Indirect Attainment %</label>
              <input type="number" min="0" max="100" step="0.1" value={form.indirect_attainment}
                onChange={e => f('indirect_attainment', e.target.value)} className="input-field" placeholder="e.g. 68" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target %</label>
              <input type="number" min="0" max="100" value={form.target}
                onChange={e => f('target', e.target.value)} className="input-field" />
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-sm font-medium mb-1 text-gray-400">Final (auto)</label>
              <div className={`input-field font-bold ${parseFloat(finalPreview) >= form.target ? 'text-green-600' : 'text-red-500'}`}>
                {finalPreview}%
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save Attainment'}</button>
          <button onClick={onClose} className="btn-secondary flex-1">Close</button>
        </div>
      </div>
    </div>
  );
}
