import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Award, CheckCircle2, Target, TrendingUp, Calendar, BarChart3, Plus, Shield, Star, AlertCircle, FileText, Check, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';

const cycleStatus = { planning: 'badge-gray', in_progress: 'badge-blue', submitted: 'badge-yellow', completed: 'badge-green' };
const criteriaStatus = { not_started: 'badge-gray', in_progress: 'badge-yellow', completed: 'badge-blue', verified: 'badge-green' };

export default function Accreditation() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [cycleForm, setCycleForm] = useState({ name: '', body: 'NAAC', start_date: '', end_date: '', target_grade: '', status: 'planning' });
  const [criteriaForm, setCriteriaForm] = useState({ cycle_id: '', criterion_number: '', criterion_name: '', max_score: '100', weightage: '1' });
  const [meetingForm, setMeetingForm] = useState({ date: '', venue: '', status: 'scheduled' });

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (selectedCycle) {
      api.get(`/accreditation/criteria?cycle_id=${selectedCycle}`).then(r => setCriteria(r.data)).catch(() => {});
    } else {
      api.get('/accreditation/criteria').then(r => setCriteria(r.data)).catch(() => {});
    }
  }, [selectedCycle]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st, cy, cr, ind, mtg] = await Promise.all([
        api.get('/accreditation/stats'),
        api.get('/accreditation/cycles'),
        api.get('/accreditation/criteria'),
        api.get('/accreditation/indicators'),
        api.get('/accreditation/meetings'),
      ]);
      setStats(st.data); setCycles(cy.data); setCriteria(cr.data); setIndicators(ind.data); setMeetings(mtg.data);
    } catch { toast.error('Failed to load accreditation data'); }
    setLoading(false);
  };

  const submitCycle = async () => {
    if (!cycleForm.name) return toast.error('Name required');
    try { await api.post('/accreditation/cycles', cycleForm); toast.success('Accreditation cycle created!'); setShowCycleModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitCriteria = async () => {
    if (!criteriaForm.cycle_id || !criteriaForm.criterion_number || !criteriaForm.criterion_name) return toast.error('Fill all required fields');
    try { await api.post('/accreditation/criteria', criteriaForm); toast.success('Criterion added!'); setShowCriteriaModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitMeeting = async () => {
    if (!meetingForm.date) return toast.error('Date required');
    try { await api.post('/accreditation/meetings', meetingForm); toast.success('Meeting scheduled!'); setShowMeetingModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const updateCriteriaStatus = async (id, status) => {
    try { await api.put(`/accreditation/criteria/${id}`, { status }); toast.success('Updated!'); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const isAdmin = ['admin','registrar','hod'].includes(user?.role);
  const overallProgress = stats?.totalCriteria > 0 ? Math.round((stats?.completedCriteria / stats?.totalCriteria) * 100) : 0;

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-900 via-red-900 to-orange-900 p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #ef4444 0%, transparent 50%), radial-gradient(circle at 75% 50%, #f97316 0%, transparent 50%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 rounded-xl p-2.5"><Award className="w-6 h-6" /></div>
              <span className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">NAAC · NBA · ISO · QUALITY MANAGEMENT</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Accreditation & Quality Assurance</h1>
            <p className="text-rose-200 text-sm max-w-lg">SAP QM-grade quality management — NAAC criteria tracking, quality indicators, IQAC meetings, and evidence-based accreditation excellence for MSRIM.</p>
          </div>
          {isAdmin && (
            <div className="hidden md:flex gap-2">
              <button onClick={() => setShowCycleModal(true)} className="bg-white text-rose-900 hover:bg-rose-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> New Cycle</button>
              <button onClick={() => setShowMeetingModal(true)} className="bg-white/20 hover:bg-white/30 font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"><Calendar className="w-4 h-4" /> IQAC Meeting</button>
            </div>
          )}
        </div>
        {stats && (
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Cycles', value: stats.activeCycles, icon: Shield, color: 'text-rose-300' },
              { label: 'Overall Score', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'text-orange-300' },
              { label: 'Criteria Completed', value: `${stats.completedCriteria}/${stats.totalCriteria}`, icon: CheckCircle2, color: 'text-yellow-300' },
              { label: 'Indicators Verified', value: `${stats.verifiedIndicators}/${stats.totalIndicators}`, icon: Target, color: 'text-amber-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-rose-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overall Progress Ring */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-rose-600" /> Overall Accreditation Progress</h3>
            <p className="text-xs text-gray-400 mt-0.5">{stats?.completedCriteria || 0} of {stats?.totalCriteria || 0} criteria completed</p>
          </div>
          <span className="text-3xl font-bold text-rose-600">{overallProgress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden">
          <div className="h-5 rounded-full bg-gradient-to-r from-rose-500 via-red-500 to-orange-500 transition-all duration-700 flex items-center justify-end pr-2"
            style={{ width: `${overallProgress}%` }}>
            {overallProgress > 15 && <span className="text-white text-xs font-bold">{overallProgress}%</span>}
          </div>
        </div>
        <div className="flex gap-4 mt-3">
          {[
            ['Not Started', (stats?.totalCriteria||0) - (stats?.completedCriteria||0), 'bg-gray-200'],
            ['Completed', stats?.completedCriteria||0, 'bg-rose-400'],
            ['Verified Indicators', stats?.verifiedIndicators||0, 'bg-orange-400'],
          ].map(([l, v, c]) => (
            <div key={l} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${c}`} />
              <span className="text-xs text-gray-500">{l}: <strong>{v}</strong></span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {['dashboard','cycles','criteria','indicators','meetings'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          {/* Dashboard */}
          {tab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="font-semibold mb-4">Criteria Progress</h3>
                  <div className="space-y-3">
                    {stats?.criteriaProgress?.slice(0, 7).map(c => {
                      const pct = c.max_score > 0 ? (c.current_score / c.max_score) * 100 : 0;
                      return (
                        <div key={c.criterion_number}>
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-medium truncate flex-1 mr-2">{c.criterion_number}. {c.criterion_name}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">{c.current_score}/{c.max_score}</span>
                              <span className={criteriaStatus[c.status]}>{c.status.replace('_',' ')}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct,100)}%`, backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                          </div>
                        </div>
                      );
                    })}
                    {!stats?.criteriaProgress?.length && <p className="text-gray-400 text-sm text-center py-4">No criteria defined yet</p>}
                  </div>
                </div>
                <div className="card">
                  <h3 className="font-semibold mb-4">Active Cycles</h3>
                  {stats?.cycleStatus?.map(cy => (
                    <div key={cy.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl mb-2">
                      <div>
                        <p className="font-medium text-sm">{cy.name}</p>
                        <p className="text-xs text-gray-400">{cy.body} · Target: {cy.target_grade || 'TBD'}</p>
                      </div>
                      <span className={cycleStatus[cy.status]}>{cy.status.replace('_',' ')}</span>
                    </div>
                  ))}
                  {!stats?.cycleStatus?.length && <p className="text-gray-400 text-sm text-center py-4">No accreditation cycles</p>}
                  {stats?.upcomingMeetings > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-blue-50 rounded-xl p-3">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-blue-700 font-medium">{stats.upcomingMeetings} IQAC meeting{stats.upcomingMeetings > 1 ? 's' : ''} scheduled</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Cycles */}
          {tab === 'cycles' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Accreditation Cycles ({cycles.length})</h3>
                {isAdmin && <button onClick={() => setShowCycleModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New Cycle</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cycles.map(cy => (
                  <div key={cy.id} className="card hover:shadow-md transition-shadow border-l-4 border-rose-400">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-rose-100 rounded-xl p-3"><Award className="w-5 h-5 text-rose-600" /></div>
                      <span className={cycleStatus[cy.status]}>{cy.status.replace('_',' ')}</span>
                    </div>
                    <h3 className="text-lg font-bold">{cy.name}</h3>
                    <p className="text-sm text-gray-500 font-medium">{cy.body}</p>
                    {cy.target_grade && <p className="text-sm text-rose-600 font-semibold mt-1">Target: Grade {cy.target_grade}</p>}
                    <div className="flex gap-4 mt-3 text-xs text-gray-400">
                      {cy.start_date && <span>From: {cy.start_date}</span>}
                      {cy.end_date && <span>To: {cy.end_date}</span>}
                    </div>
                  </div>
                ))}
                {cycles.length === 0 && (
                  <div className="col-span-2 card text-center py-12">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No accreditation cycles defined yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Criteria */}
          {tab === 'criteria' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <h3 className="font-semibold text-gray-700 flex-shrink-0">Quality Criteria</h3>
                  <select className="select-field w-48" value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}>
                    <option value="">All Cycles</option>
                    {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {isAdmin && <button onClick={() => setShowCriteriaModal(true)} className="btn-primary text-sm flex-shrink-0"><Plus className="w-4 h-4" /> Add Criterion</button>}
              </div>
              <div className="space-y-3">
                {criteria.map(c => {
                  const pct = c.max_score > 0 ? (c.current_score / c.max_score) * 100 : 0;
                  return (
                    <div key={c.id} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="bg-rose-100 text-rose-700 font-bold rounded-xl px-3 py-1.5 text-sm flex-shrink-0">{c.criterion_number}</div>
                          <div>
                            <h3 className="font-semibold">{c.criterion_name}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Responsible: {c.responsible_name || 'Not assigned'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-rose-600">{c.current_score}/{c.max_score}</span>
                          <span className={criteriaStatus[c.status]}>{c.status.replace('_',' ')}</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
                        <div className="h-3 rounded-full transition-all" style={{ width: `${Math.min(pct,100)}%`, backgroundColor: pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-400">{pct.toFixed(1)}% · Weightage: {c.weightage}x</p>
                        {isAdmin && (
                          <div className="flex gap-1">
                            {['not_started','in_progress','completed','verified'].map(s => (
                              <button key={s} onClick={() => updateCriteriaStatus(c.id, s)}
                                className={`text-xs px-2 py-1 rounded-lg transition-all ${c.status === s ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {s.replace('_',' ')}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {c.notes && <p className="text-xs text-gray-400 mt-2 italic">{c.notes}</p>}
                    </div>
                  );
                })}
                {criteria.length === 0 && (
                  <div className="card text-center py-12">
                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No criteria defined. Create an accreditation cycle first.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Indicators */}
          {tab === 'indicators' && (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>{['Code','Indicator','Criteria','Target','Achieved','Unit','Source','Verified'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {indicators.map(i => (
                      <tr key={i.id} className="hover:bg-gray-50">
                        <td className="table-td font-mono text-xs text-rose-600">{i.indicator_code}</td>
                        <td className="table-td font-medium">{i.indicator_name}</td>
                        <td className="table-td text-xs text-gray-400">{i.criterion_name}</td>
                        <td className="table-td">{i.target_value ?? '—'}</td>
                        <td className="table-td font-semibold">{i.achieved_value ?? '—'}</td>
                        <td className="table-td text-gray-400">{i.unit || '—'}</td>
                        <td className="table-td text-xs">{i.data_source || '—'}</td>
                        <td className="table-td">{i.verified ? <span className="badge-green">Yes</span> : <span className="badge-gray">No</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {indicators.length === 0 && <div className="text-center py-8 text-gray-400">No indicators defined</div>}
              </div>
            </div>
          )}

          {/* IQAC Meetings */}
          {tab === 'meetings' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">IQAC Meetings ({meetings.length})</h3>
                {isAdmin && <button onClick={() => setShowMeetingModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Schedule Meeting</button>}
              </div>
              <div className="space-y-3">
                {meetings.map(m => (
                  <div key={m.id} className="card hover:shadow-md transition-shadow border-l-4 border-blue-400">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 rounded-xl p-3"><ClipboardList className="w-5 h-5 text-blue-600" /></div>
                        <div>
                          <h3 className="font-semibold">{m.meeting_number || 'IQAC Meeting'}</h3>
                          <p className="text-xs text-gray-400">{m.date} · {m.venue || 'Venue TBD'}</p>
                        </div>
                      </div>
                      <span className={{ scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' }[m.status]}>{m.status}</span>
                    </div>
                    {m.minutes && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{m.minutes}</p>}
                    <p className="text-xs text-gray-400 mt-2">Created by {m.created_by_name}</p>
                  </div>
                ))}
                {meetings.length === 0 && (
                  <div className="card text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No IQAC meetings scheduled</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Cycle Modal */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-rose-500" /> New Accreditation Cycle</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Name *</label><input className="input-field" placeholder="e.g. NAAC 2026" value={cycleForm.name} onChange={e => setCycleForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Body</label>
                  <select className="select-field" value={cycleForm.body} onChange={e => setCycleForm(p => ({ ...p, body: e.target.value }))}>
                    {['NAAC','NBA','AICTE','ISO','Internal'].map(b => <option key={b}>{b}</option>)}
                  </select></div>
                <div><label className="text-sm font-medium block mb-1">Target Grade</label><input className="input-field" placeholder="A, A+, A++ " value={cycleForm.target_grade} onChange={e => setCycleForm(p => ({ ...p, target_grade: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Start Date</label><input className="input-field" type="date" value={cycleForm.start_date} onChange={e => setCycleForm(p => ({ ...p, start_date: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">End Date</label><input className="input-field" type="date" value={cycleForm.end_date} onChange={e => setCycleForm(p => ({ ...p, end_date: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitCycle} className="btn-primary flex-1">Create</button>
              <button onClick={() => setShowCycleModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Criteria Modal */}
      {showCriteriaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Add Quality Criterion</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Accreditation Cycle *</label>
                <select className="select-field" value={criteriaForm.cycle_id} onChange={e => setCriteriaForm(p => ({ ...p, cycle_id: e.target.value }))}>
                  <option value="">Select cycle...</option>
                  {cycles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Criterion # *</label><input className="input-field" placeholder="1.1" value={criteriaForm.criterion_number} onChange={e => setCriteriaForm(p => ({ ...p, criterion_number: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Max Score</label><input className="input-field" type="number" value={criteriaForm.max_score} onChange={e => setCriteriaForm(p => ({ ...p, max_score: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Criterion Name *</label><input className="input-field" placeholder="e.g. Curricular Aspects" value={criteriaForm.criterion_name} onChange={e => setCriteriaForm(p => ({ ...p, criterion_name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Weightage</label><input className="input-field" type="number" step="0.1" value={criteriaForm.weightage} onChange={e => setCriteriaForm(p => ({ ...p, weightage: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitCriteria} className="btn-primary flex-1">Add</button>
              <button onClick={() => setShowCriteriaModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Schedule IQAC Meeting</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Date *</label><input className="input-field" type="date" value={meetingForm.date} onChange={e => setMeetingForm(p => ({ ...p, date: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Status</label>
                  <select className="select-field" value={meetingForm.status} onChange={e => setMeetingForm(p => ({ ...p, status: e.target.value }))}>
                    <option value="scheduled">Scheduled</option><option value="completed">Completed</option>
                  </select></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Venue</label><input className="input-field" value={meetingForm.venue} onChange={e => setMeetingForm(p => ({ ...p, venue: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitMeeting} className="btn-primary flex-1">Schedule</button>
              <button onClick={() => setShowMeetingModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
