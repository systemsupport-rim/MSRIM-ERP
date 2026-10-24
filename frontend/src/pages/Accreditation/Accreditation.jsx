import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Award, CheckCircle2, Target, TrendingUp, Calendar, BarChart3, Plus,
  Shield, Star, AlertCircle, FileText, Check, ClipboardList, X, Edit2,
  Trash2, Upload, Eye, RefreshCw, ChevronDown, ChevronRight, AlertTriangle,
  BookOpen, Users, Building2, Layers, Zap, Globe, CheckSquare, Clock
} from 'lucide-react';

const BODIES = ['NAAC','NBA','AACSB','NIRF','EQUIS','AMBA'];
const BODY_COLOR = { NAAC:'bg-blue-600', NBA:'bg-green-600', AACSB:'bg-purple-600', NIRF:'bg-orange-600', EQUIS:'bg-red-600', AMBA:'bg-indigo-600' };
const BODY_LIGHT = { NAAC:'bg-blue-50 border-blue-200 text-blue-700', NBA:'bg-green-50 border-green-200 text-green-700', AACSB:'bg-purple-50 border-purple-200 text-purple-700', NIRF:'bg-orange-50 border-orange-200 text-orange-700', EQUIS:'bg-red-50 border-red-200 text-red-700', AMBA:'bg-indigo-50 border-indigo-200 text-indigo-700' };
const STATUS_BADGE = { not_started:'badge-gray', in_progress:'badge-yellow', completed:'badge-blue', verified:'badge-green', planning:'badge-gray', submitted:'badge-yellow', open:'badge-red', overdue:'badge-red', active:'badge-green', achieved:'badge-green', scheduled:'badge-blue' };
const DOC_TYPES = ['policy','report','data','certificate','photo','mou','minutes','other'];
const VISIT_TYPES = ['peer_team_visit','dvv_validation','pre_visit','mock_audit','follow_up'];
const NIRF_PARAMS = ['TLR','RP','GO','OI','PP'];
const NIRF_PARAM_LABEL = { TLR:'Teaching, Learning & Resources', RP:'Research & Professional Practice', GO:'Graduation Outcomes', OI:'Outreach & Inclusivity', PP:'Peer Perception' };
const NIRF_PARAM_WEIGHT = { TLR:30, RP:30, GO:20, OI:10, PP:10 };
const NIRF_PARAM_COLOR = { TLR:'bg-blue-500', RP:'bg-purple-500', GO:'bg-green-500', OI:'bg-orange-500', PP:'bg-indigo-500' };

const TABS = [
  { id:'overview',   label:'Overview',            icon: BarChart3 },
  { id:'naac',       label:'NAAC',                icon: Award },
  { id:'nba',        label:'NBA',                 icon: CheckSquare },
  { id:'aacsb',      label:'AACSB / AOL',         icon: Globe },
  { id:'nirf',       label:'NIRF',                icon: TrendingUp },
  { id:'evidence',   label:'Evidence Repository', icon: FileText },
  { id:'actions',    label:'Action Plans',        icon: AlertTriangle },
  { id:'visits',     label:'Site Visits',         icon: Building2 },
  { id:'meetings',   label:'IQAC Meetings',       icon: Calendar },
];

function pct(score, max) { return max > 0 ? Math.round((score||0)/max*100) : 0; }
function readinessColor(p) { return p >= 80 ? 'bg-green-500' : p >= 50 ? 'bg-yellow-400' : 'bg-red-400'; }
function readinessText(p)  { return p >= 80 ? 'text-green-600' : p >= 50 ? 'text-yellow-600' : 'text-red-500'; }

export default function Accreditation() {
  const { user } = useAuth();
  const [tab, setTab]           = useState('overview');
  const [cycles, setCycles]     = useState([]);
  const [readiness, setReadiness] = useState([]);
  const [stats, setStats]       = useState(null);
  const [criteria, setCriteria] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [actions, setActions]   = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [visits, setVisits]     = useState([]);
  const [aolGoals, setAolGoals] = useState([]);
  const [nirfData, setNirfData] = useState([]);
  const [nirfScore, setNirfScore] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [faculty, setFaculty]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const [selectedCycle, setSelectedCycle]   = useState('');
  const [expandedCriteria, setExpandedCriteria] = useState(null);
  const [expandedGoal, setExpandedGoal]     = useState(null);
  const [criteriaIndicators, setCriteriaIndicators] = useState({});
  const [criteriaEvidence, setCriteriaEvidence] = useState({});
  const [goalMeasurements, setGoalMeasurements] = useState({});
  const [goalClosings, setGoalClosings]     = useState({});

  // Modals
  const [modal, setModal] = useState(null); // string key
  const [form, setForm]   = useState({});
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  const canManage = ['admin','registrar','hod'].includes(user.role);

  const loadBase = useCallback(async () => {
    setLoading(true);
    try {
      const [cy, rd, st, pr, fa] = await Promise.all([
        api.get('/accreditation/cycles'),
        api.get('/accreditation/readiness'),
        api.get('/accreditation/stats'),
        api.get('/structure/programs'),
        api.get('/faculty'),
      ]);
      setCycles(cy.data||[]); setReadiness(rd.data||[]); setStats(st.data);
      setPrograms(pr.data||[]); setFaculty(fa.data||[]);
      if (!selectedCycle && cy.data?.length) setSelectedCycle(String(cy.data[0].id));
    } catch { toast.error('Failed to load accreditation data'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  useEffect(() => {
    if (!selectedCycle) return;
    api.get(`/accreditation/criteria?cycle_id=${selectedCycle}`).then(r => setCriteria(r.data||[]));
    api.get(`/accreditation/indicators?cycle_id=${selectedCycle}`).then(r => setIndicators(r.data||[]));
  }, [selectedCycle]);

  useEffect(() => {
    if (tab === 'evidence') api.get('/accreditation/evidence').then(r => setEvidence(r.data||[]));
    if (tab === 'actions')  api.get('/accreditation/actions').then(r => setActions(r.data||[]));
    if (tab === 'meetings') api.get('/accreditation/meetings').then(r => setMeetings(r.data||[]));
    if (tab === 'visits')   api.get('/accreditation/visits').then(r => setVisits(r.data||[]));
    if (tab === 'aacsb') {
      const aacsbCycle = cycles.find(c => c.body === 'AACSB');
      if (aacsbCycle) api.get(`/accreditation/aol/goals?cycle_id=${aacsbCycle.id}`).then(r => setAolGoals(r.data||[]));
    }
    if (tab === 'nirf') {
      const nirfCycle = cycles.find(c => c.body === 'NIRF');
      if (nirfCycle) {
        api.get(`/accreditation/nirf?cycle_id=${nirfCycle.id}`).then(r => setNirfData(r.data||[]));
        api.get(`/accreditation/nirf/score?cycle_id=${nirfCycle.id}`).then(r => setNirfScore(r.data));
      }
    }
  }, [tab, cycles]);

  async function expandCriteria(cId) {
    if (expandedCriteria === cId) { setExpandedCriteria(null); return; }
    setExpandedCriteria(cId);
    if (!criteriaIndicators[cId]) {
      const [ind, ev] = await Promise.all([
        api.get(`/accreditation/indicators?criteria_id=${cId}`),
        api.get(`/accreditation/evidence?criteria_id=${cId}`),
      ]);
      setCriteriaIndicators(p => ({...p, [cId]: ind.data||[]}));
      setCriteriaEvidence(p => ({...p, [cId]: ev.data||[]}));
    }
  }

  async function expandGoal(gId) {
    if (expandedGoal === gId) { setExpandedGoal(null); return; }
    setExpandedGoal(gId);
    if (!goalMeasurements[gId]) {
      const [m, cl] = await Promise.all([
        api.get(`/accreditation/aol/measurements?goal_id=${gId}`),
        api.get(`/accreditation/aol/closings?goal_id=${gId}`),
      ]);
      setGoalMeasurements(p => ({...p, [gId]: m.data||[]}));
      setGoalClosings(p => ({...p, [gId]: cl.data||[]}));
    }
  }

  async function submit(endpoint, method='post', id=null, onSuccess) {
    try {
      if (method === 'post') await api.post(`/accreditation/${endpoint}`, form);
      else if (method === 'put') await api.put(`/accreditation/${endpoint}/${id}`, form);
      toast.success('Saved');
      setModal(null); setForm({});
      if (onSuccess) onSuccess();
      loadBase();
    } catch(e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  async function del(endpoint, id, onSuccess) {
    if (!confirm('Delete this item?')) return;
    await api.delete(`/accreditation/${endpoint}/${id}`);
    toast.success('Deleted');
    if (onSuccess) onSuccess();
    loadBase();
  }

  const cycleForBody = (body) => cycles.find(c => c.body === body);
  const criteriaForBody = (body) => {
    const cy = cycleForBody(body);
    return cy ? criteria.filter(c => String(c.cycle_id) === String(cy.id)) : [];
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Accreditation & Quality Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">NAAC · NBA · AACSB · NIRF · EQUIS · AMBA — end-to-end accreditation lifecycle</p>
        </div>
        <div className="flex items-center gap-2">
          {stats?.overdueActions > 0 && (
            <button onClick={() => setTab('actions')} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-300 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100">
              <AlertTriangle className="w-4 h-4"/>{stats.overdueActions} Overdue Actions
            </button>
          )}
          <button onClick={loadBase} className="p-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:border-gray-300">
            <RefreshCw className="w-4 h-4"/>
          </button>
          {canManage && (
            <button onClick={() => { setForm({ body:'NAAC', status:'planning' }); setModal('cycle'); }} className="btn-primary">
              <Plus className="w-4 h-4"/> New Cycle
            </button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-3.5 h-3.5"/>{label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label:'Active Cycles',    value: stats?.activeCycles,       icon:'🔄', color:'bg-blue-500' },
              { label:'Total Criteria',   value: stats?.totalCriteria,      icon:'📋', color:'bg-green-500' },
              { label:'Completed',        value: stats?.completedCriteria,  icon:'✅', color:'bg-teal-500' },
              { label:'Evidence Docs',    value: stats?.totalEvidence,      icon:'📁', color:'bg-purple-500' },
              { label:'Open Actions',     value: stats?.openActions,        icon:'⚠️', color:'bg-orange-500' },
              { label:'IQAC Meetings',    value: stats?.upcomingMeetings,   icon:'📅', color:'bg-indigo-500' },
            ].map(s => (
              <div key={s.label} className="card p-3 flex items-center gap-3">
                <div className={`w-9 h-9 ${s.color} rounded-xl flex items-center justify-center text-sm flex-shrink-0`}>{s.icon}</div>
                <div><p className="text-xs text-gray-400">{s.label}</p><p className="text-xl font-bold text-gray-800">{s.value ?? '—'}</p></div>
              </div>
            ))}
          </div>

          {/* Accreditation body cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readiness.map(r => (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold text-white ${BODY_COLOR[r.body]||'bg-gray-500'}`}>{r.body}</span>
                    <h3 className="font-bold mt-2 text-gray-800 text-sm leading-tight">{r.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Target: <span className="font-semibold text-gray-600">{r.target_grade||'—'}</span></p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${readinessText(r.readiness)}`}>{r.readiness}%</p>
                    <p className="text-xs text-gray-400">readiness</p>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${readinessColor(r.readiness)}`} style={{ width:`${r.readiness}%` }}/>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="font-bold text-gray-700">{r.completed_criteria}/{r.total_criteria}</p>
                    <p className="text-gray-400">Criteria</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="font-bold text-gray-700">{r.evidence_count}</p>
                    <p className="text-gray-400">Evidence</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className={`font-bold ${r.open_actions > 0 ? 'text-orange-600' : 'text-gray-700'}`}>{r.open_actions}</p>
                    <p className="text-gray-400">Actions</p>
                  </div>
                </div>
                {r.next_visit && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-msrim-blue"/>
                    Next visit: <span className="font-semibold">{new Date(r.next_visit).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                  </div>
                )}
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className={`text-xs font-medium ${STATUS_BADGE[r.status]||'badge-gray'} px-2 py-0.5 rounded-full`}>{r.status?.replace('_',' ')}</span>
                  {r.end_date && <p className="text-xs text-gray-400">Valid till {new Date(r.end_date).getFullYear()}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Overall criteria progress */}
          {stats?.criteriaProgress?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-4 text-gray-700">Criteria Progress — All Bodies</h3>
              <div className="space-y-2.5">
                {stats.criteriaProgress.map((c,i) => {
                  const p = pct(c.current_score, c.max_score);
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0 ${BODY_COLOR[c.body]||'bg-gray-500'}`}>{c.body}</span>
                          <span className="text-gray-600 truncate">{c.criterion_number}. {c.criterion_name}</span>
                        </div>
                        <span className={`font-semibold ml-2 flex-shrink-0 ${readinessText(p)}`}>{p}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${readinessColor(p)}`} style={{ width:`${p}%` }}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NAAC ─────────────────────────────────────────────────────────────── */}
      {tab === 'naac' && <CriteriaTab body="NAAC" cycles={cycles} selectedCycle={selectedCycle} setSelectedCycle={setSelectedCycle} criteria={criteriaForBody('NAAC')} indicators={indicators} expandedCriteria={expandedCriteria} expandCriteria={expandCriteria} criteriaIndicators={criteriaIndicators} criteriaEvidence={criteriaEvidence} canManage={canManage} faculty={faculty} reload={() => { api.get(`/accreditation/criteria?cycle_id=${selectedCycle}`).then(r=>setCriteria(r.data||[])); loadBase(); }} modal={modal} setModal={setModal} form={form} setForm={setForm} set={set} submit={submit} del={del} />}

      {/* ── NBA ──────────────────────────────────────────────────────────────── */}
      {tab === 'nba' && <CriteriaTab body="NBA" cycles={cycles} selectedCycle={selectedCycle} setSelectedCycle={setSelectedCycle} criteria={criteriaForBody('NBA')} indicators={indicators} expandedCriteria={expandedCriteria} expandCriteria={expandCriteria} criteriaIndicators={criteriaIndicators} criteriaEvidence={criteriaEvidence} canManage={canManage} faculty={faculty} reload={() => { api.get(`/accreditation/criteria?cycle_id=${selectedCycle}`).then(r=>setCriteria(r.data||[])); loadBase(); }} modal={modal} setModal={setModal} form={form} setForm={setForm} set={set} submit={submit} del={del} programs={programs} />}

      {/* ── AACSB / AOL ──────────────────────────────────────────────────────── */}
      {tab === 'aacsb' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">AACSB Assurance of Learning (AOL)</h2>
              <p className="text-sm text-gray-500">Learning goals → measurement cycles → closing the loop</p>
            </div>
            {canManage && (
              <button onClick={() => { const ac = cycleForBody('AACSB'); setForm({ cycle_id: ac?.id||'', goal_code:'', goal_name:'', program_id:'' }); setModal('aol_goal'); }} className="btn-primary">
                <Plus className="w-4 h-4"/> Add Goal
              </button>
            )}
          </div>
          {aolGoals.length === 0 && (
            <div className="card text-center py-16 text-gray-400">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-30"/>
              <p>No AOL goals defined yet.</p>
              {canManage && <p className="text-sm mt-1">Click "Add Goal" to start defining Assurance of Learning goals.</p>}
            </div>
          )}
          {aolGoals.map(goal => {
            const expanded = expandedGoal === goal.id;
            const measurements = goalMeasurements[goal.id] || [];
            const closings = goalClosings[goal.id] || [];
            const avgAchieved = measurements.filter(m=>m.achieved_pct!=null).reduce((s,m,_,a) => s + m.achieved_pct/a.length, 0);
            return (
              <div key={goal.id} className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => expandGoal(goal.id)}>
                  <div className="flex items-center gap-3">
                    <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-lg text-xs font-bold">{goal.goal_code}</span>
                    <div>
                      <p className="font-semibold text-gray-800">{goal.goal_name}</p>
                      <p className="text-xs text-gray-400">{goal.program_name || 'All Programs'} · {goal.measurement_count} measurements · {goal.closing_count} closings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {measurements.length > 0 && (
                      <div className="text-right">
                        <p className={`text-sm font-bold ${avgAchieved >= 70 ? 'text-green-600' : 'text-red-500'}`}>{avgAchieved.toFixed(0)}% avg</p>
                        <p className="text-xs text-gray-400">achieved</p>
                      </div>
                    )}
                    <span className={`badge-${goal.status==='achieved'?'green':goal.status==='active'?'blue':'gray'}`}>{goal.status}</span>
                    {expanded ? <ChevronDown className="w-4 h-4 text-gray-400"/> : <ChevronRight className="w-4 h-4 text-gray-400"/>}
                  </div>
                </div>
                {expanded && (
                  <div className="border-t px-5 pb-5 pt-4 space-y-4 bg-gray-50">
                    {/* Measurements */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Learning Objectives & Measurements</h4>
                        {canManage && <button onClick={() => { setForm({ goal_id: goal.id, learning_objective:'', measurement_tool:'', target_pct:70, academic_year:'2024-25' }); setModal('aol_measurement'); }} className="text-xs btn-secondary py-1 px-2"><Plus className="w-3 h-3"/> Add</button>}
                      </div>
                      <div className="space-y-2">
                        {measurements.map(m => (
                          <div key={m.id} className="bg-white rounded-xl p-3 border border-gray-100">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800">{m.learning_objective}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Tool: {m.measurement_tool||'—'} · AY: {m.academic_year}</p>
                              </div>
                              <div className="text-right ml-4 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-400">Target: <span className="font-semibold">{m.target_pct}%</span></div>
                                  {m.achieved_pct != null && <div className={`text-sm font-bold ${m.achieved_pct >= m.target_pct ? 'text-green-600' : 'text-red-500'}`}>{m.achieved_pct}%</div>}
                                </div>
                                {m.achieved_pct != null && (
                                  <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                                    <div className={`h-full rounded-full ${m.achieved_pct >= m.target_pct ? 'bg-green-500' : 'bg-red-400'}`} style={{ width:`${Math.min(100,m.achieved_pct)}%` }}/>
                                  </div>
                                )}
                              </div>
                              {canManage && (
                                <button onClick={() => { setForm({ achieved_pct: m.achieved_pct, findings: m.findings, measurement_tool: m.measurement_tool }); setModal(`aol_meas_edit_${m.id}`); }} className="ml-2 p-1 text-gray-400 hover:text-msrim-blue">
                                  <Edit2 className="w-3.5 h-3.5"/>
                                </button>
                              )}
                            </div>
                            {m.findings && <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2 italic">{m.findings}</p>}
                            {modal === `aol_meas_edit_${m.id}` && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div><label className="text-xs font-medium">Achieved %</label><input type="number" value={form.achieved_pct||''} onChange={e=>set('achieved_pct',e.target.value)} className="input-field text-sm mt-0.5"/></div>
                                  <div><label className="text-xs font-medium">Tool</label><input value={form.measurement_tool||''} onChange={e=>set('measurement_tool',e.target.value)} className="input-field text-sm mt-0.5"/></div>
                                </div>
                                <textarea value={form.findings||''} onChange={e=>set('findings',e.target.value)} placeholder="Findings & observations…" rows={2} className="input-field text-sm resize-none"/>
                                <div className="flex gap-2">
                                  <button onClick={() => submit(`aol/measurements`,'put',m.id,()=>{setGoalMeasurements(p=>({...p,[goal.id]:null}));expandGoal(goal.id);})} className="btn-primary text-xs py-1 px-3">Save</button>
                                  <button onClick={() => setModal(null)} className="btn-secondary text-xs py-1 px-3">Cancel</button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {measurements.length === 0 && <p className="text-sm text-gray-400">No measurements yet.</p>}
                      </div>
                    </div>

                    {/* Closing the Loop */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold text-gray-700">Closing the Loop</h4>
                        {canManage && <button onClick={() => { setForm({ goal_id: goal.id, gap_identified:'', action_taken:'', implementation_date:'' }); setModal('aol_closing'); }} className="text-xs btn-secondary py-1 px-2"><Plus className="w-3 h-3"/> Add</button>}
                      </div>
                      {closings.map(cl => (
                        <div key={cl.id} className="bg-white rounded-xl p-3 border border-green-100 mb-2">
                          <p className="text-xs font-semibold text-red-600">Gap: {cl.gap_identified}</p>
                          <p className="text-xs text-gray-700 mt-1">Action: {cl.action_taken}</p>
                          {cl.outcome && <p className="text-xs text-green-600 mt-1">Outcome: {cl.outcome}</p>}
                          <p className="text-xs text-gray-400 mt-1">{cl.implementation_date}</p>
                        </div>
                      ))}
                      {closings.length === 0 && <p className="text-sm text-gray-400">No closing actions yet.</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── NIRF ─────────────────────────────────────────────────────────────── */}
      {tab === 'nirf' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold">NIRF Ranking Data</h2>
              <p className="text-sm text-gray-500">National Institutional Ranking Framework — Management Category</p>
            </div>
            <div className="flex gap-2">
              {canManage && (
                <button onClick={async () => {
                  const c = cycleForBody('NIRF');
                  if (!c) return toast.error('No NIRF cycle found');
                  const r = await api.post('/accreditation/nirf/auto-populate', { cycle_id: c.id, academic_year: '2024-25' });
                  toast.success(`Auto-populated: ${r.data.populated} metrics from ERP data`);
                  api.get(`/accreditation/nirf?cycle_id=${c.id}`).then(res => setNirfData(res.data||[]));
                  api.get(`/accreditation/nirf/score?cycle_id=${c.id}`).then(res => setNirfScore(res.data));
                }} className="btn-secondary text-sm">
                  <RefreshCw className="w-4 h-4"/> Auto-populate from ERP
                </button>
              )}
            </div>
          </div>

          {/* Score card */}
          {nirfScore && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-700">Projected NIRF Score</h3>
                <div className="text-right">
                  <p className="text-4xl font-bold text-msrim-blue">{nirfScore.total}<span className="text-lg text-gray-400 font-normal">/100</span></p>
                  <p className="text-xs text-gray-400">AY {nirfScore.academic_year}</p>
                </div>
              </div>
              <div className="space-y-2">
                {nirfScore.breakdown?.map(b => (
                  <div key={b.parameter}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">{b.parameter} – {NIRF_PARAM_LABEL[b.parameter]} <span className="text-gray-400">({b.weight}%)</span></span>
                      <span className="font-semibold text-gray-700">{b.contribution}/{b.weight}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${NIRF_PARAM_COLOR[b.parameter]||'bg-msrim-blue'}`} style={{ width:`${(b.contribution/b.weight)*100}%` }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parameter-wise data entry */}
          {NIRF_PARAMS.map(param => {
            const metrics = nirfData.filter(d => d.parameter === param);
            return (
              <div key={param} className="card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg ${NIRF_PARAM_COLOR[param]} flex items-center justify-center text-white text-xs font-bold`}>{param}</span>
                    <div>
                      <p className="font-semibold text-sm">{NIRF_PARAM_LABEL[param]}</p>
                      <p className="text-xs text-gray-400">Weightage: {NIRF_PARAM_WEIGHT[param]}%</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <span className="font-bold text-gray-700">{metrics.reduce((s,m)=>s+(m.value||0),0).toFixed(1)}</span>
                    <span className="text-gray-400">/{metrics.reduce((s,m)=>s+m.max_value,0).toFixed(0)} pts</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="text-xs text-gray-400 border-b bg-gray-50">
                      <th className="table-th">Metric</th>
                      <th className="table-th text-center">Max</th>
                      <th className="table-th text-center w-36">Score</th>
                      <th className="table-th">Source</th>
                      <th className="table-th">Notes</th>
                    </tr></thead>
                    <tbody>
                      {metrics.map(m => (
                        <tr key={m.id} className="border-b hover:bg-gray-50">
                          <td className="table-td">
                            <p className="font-medium text-sm text-msrim-blue">{m.metric_code}</p>
                            <p className="text-xs text-gray-500">{m.metric_name}</p>
                          </td>
                          <td className="table-td text-center text-sm font-semibold">{m.max_value}</td>
                          <td className="table-td">
                            {canManage ? (
                              <input type="number" min="0" max={m.max_value} step="0.01"
                                defaultValue={m.value||0}
                                className="input-field text-sm text-center w-full"
                                onBlur={async (e) => {
                                  const c = cycleForBody('NIRF');
                                  if (!c) return;
                                  await api.post('/accreditation/nirf', { cycle_id: c.id, parameter: m.parameter, metric_code: m.metric_code, metric_name: m.metric_name, value: parseFloat(e.target.value)||0, max_value: m.max_value, academic_year: m.academic_year });
                                  api.get(`/accreditation/nirf/score?cycle_id=${c.id}`).then(r=>setNirfScore(r.data));
                                }}
                              />
                            ) : <span className="text-sm font-semibold">{m.value||0}</span>}
                          </td>
                          <td className="table-td"><span className={`text-xs px-1.5 py-0.5 rounded ${m.data_source==='auto'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-600'}`}>{m.data_source}</span></td>
                          <td className="table-td text-xs text-gray-400">{m.notes||'—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EVIDENCE REPOSITORY ───────────────────────────────────────────────── */}
      {tab === 'evidence' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-500">{evidence.length} documents · {evidence.filter(e=>e.verified_at).length} verified</p>
            {canManage && (
              <button onClick={() => { setForm({ body:'NAAC', document_type:'report', academic_year:'2024-25' }); setModal('evidence'); }} className="btn-primary">
                <Plus className="w-4 h-4"/> Add Evidence
              </button>
            )}
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Title</th>
                <th className="table-th">Body</th>
                <th className="table-th">Criterion</th>
                <th className="table-th">Type</th>
                <th className="table-th">AY</th>
                <th className="table-th">Uploaded By</th>
                <th className="table-th">Status</th>
                {canManage && <th className="table-th"/>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {evidence.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <p className="font-medium text-sm">{e.title}</p>
                      {e.description && <p className="text-xs text-gray-400 truncate max-w-xs">{e.description}</p>}
                      {e.file_name && <p className="text-xs text-msrim-blue">{e.file_name}</p>}
                    </td>
                    <td className="table-td"><span className={`text-xs font-bold px-2 py-0.5 rounded text-white ${BODY_COLOR[e.acc_body||e.body]||'bg-gray-500'}`}>{e.acc_body||e.body}</span></td>
                    <td className="table-td text-xs text-gray-500">{e.criterion_number ? `${e.criterion_number}. ${e.criterion_name}` : '—'}</td>
                    <td className="table-td"><span className="badge-gray text-xs">{e.document_type}</span></td>
                    <td className="table-td text-sm">{e.academic_year||'—'}</td>
                    <td className="table-td text-sm text-gray-500">{e.uploaded_by_name}</td>
                    <td className="table-td">
                      {e.verified_at ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs"><CheckCircle2 className="w-3 h-3"/>Verified</span>
                      ) : (
                        <span className="text-xs text-yellow-600">Pending</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="table-td">
                        <div className="flex gap-1">
                          {!e.verified_at && <button onClick={async()=>{await api.put(`/accreditation/evidence/${e.id}/verify`);toast.success('Verified');api.get('/accreditation/evidence').then(r=>setEvidence(r.data||[]));}} className="p-1 text-gray-400 hover:text-green-600" title="Verify"><Check className="w-3.5 h-3.5"/></button>}
                          <button onClick={()=>del('evidence',e.id,()=>api.get('/accreditation/evidence').then(r=>setEvidence(r.data||[])))} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {evidence.length === 0 && <tr><td colSpan={8} className="table-td text-center py-12 text-gray-400">No evidence documents uploaded yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ACTION PLANS ─────────────────────────────────────────────────────── */}
      {tab === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">{actions.length} total actions</p>
              {actions.filter(a=>a.status==='overdue').length > 0 && (
                <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                  <AlertTriangle className="w-3 h-3"/>{actions.filter(a=>a.status==='overdue').length} overdue
                </span>
              )}
            </div>
            {canManage && (
              <button onClick={() => { setForm({ body:'NAAC', priority:'medium', status:'open' }); setModal('action'); }} className="btn-primary">
                <Plus className="w-4 h-4"/> Add Action
              </button>
            )}
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Gap / Issue</th>
                <th className="table-th">Body / Criterion</th>
                <th className="table-th">Action Planned</th>
                <th className="table-th">Responsible</th>
                <th className="table-th">Target Date</th>
                <th className="table-th">Priority</th>
                <th className="table-th">Status</th>
                {canManage && <th className="table-th"/>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {actions.map(a => (
                  <tr key={a.id} className={`hover:bg-gray-50 ${a.status==='overdue'?'bg-red-50/30':''}`}>
                    <td className="table-td max-w-xs">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{a.gap_description}</p>
                    </td>
                    <td className="table-td">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${BODY_COLOR[a.body]||'bg-gray-500'}`}>{a.body}</span>
                      {a.criterion_ref && <p className="text-xs text-gray-400 mt-0.5">{a.criterion_ref}</p>}
                    </td>
                    <td className="table-td text-sm text-gray-600 max-w-xs"><p className="line-clamp-2">{a.action_planned}</p></td>
                    <td className="table-td text-sm text-gray-500">{a.responsible_name||'Unassigned'}</td>
                    <td className="table-td text-sm">{a.target_date ? new Date(a.target_date).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) : '—'}</td>
                    <td className="table-td"><span className={`badge-${a.priority==='high'?'red':a.priority==='medium'?'yellow':'gray'} text-xs`}>{a.priority}</span></td>
                    <td className="table-td"><span className={`${STATUS_BADGE[a.status]||'badge-gray'} text-xs`}>{a.status?.replace('_',' ')}</span></td>
                    {canManage && (
                      <td className="table-td">
                        <div className="flex gap-1">
                          <select defaultValue={a.status} onChange={async(e)=>{await api.put(`/accreditation/actions/${a.id}`,{...a,status:e.target.value});toast.success('Updated');api.get('/accreditation/actions').then(r=>setActions(r.data||[]));}} className="text-xs border rounded px-1 py-0.5 text-gray-600">
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button onClick={()=>del('actions',a.id,()=>api.get('/accreditation/actions').then(r=>setActions(r.data||[])))} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {actions.length === 0 && <tr><td colSpan={8} className="table-td text-center py-12 text-gray-400">No action plans yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SITE VISITS ──────────────────────────────────────────────────────── */}
      {tab === 'visits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{visits.length} visits recorded</p>
            {canManage && (
              <button onClick={() => { setForm({ visit_type:'peer_team_visit', status:'scheduled', cycle_id: cycles[0]?.id||'' }); setModal('visit'); }} className="btn-primary">
                <Plus className="w-4 h-4"/> Schedule Visit
              </button>
            )}
          </div>
          <div className="space-y-3">
            {visits.map(v => (
              <div key={v.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${BODY_COLOR[v.body]||'bg-gray-500'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>{v.body}</div>
                    <div>
                      <p className="font-semibold">{v.visit_type?.replace(/_/g,' ')?.replace(/\b\w/g,c=>c.toUpperCase())}</p>
                      <p className="text-sm text-gray-500">{v.cycle_name}</p>
                      <p className="text-sm text-gray-600 mt-1">📅 {v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString('en-IN',{day:'2-digit',month:'long',year:'numeric'}) : '—'}</p>
                      {v.peer_team && <p className="text-xs text-gray-400 mt-1">Team: {v.peer_team}</p>}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`${STATUS_BADGE[v.status]||'badge-gray'}`}>{v.status}</span>
                    {v.grade_awarded && <span className="text-sm font-bold text-green-600">Grade: {v.grade_awarded}</span>}
                    {canManage && (
                      <button onClick={() => del('visits', v.id, ()=>api.get('/accreditation/visits').then(r=>setVisits(r.data||[])))} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                    )}
                  </div>
                </div>
                {v.observations && <div className="mt-3 pt-3 border-t text-sm text-gray-600"><span className="font-medium">Observations: </span>{v.observations}</div>}
                {v.outcome && <div className="mt-1 text-sm text-green-700"><span className="font-medium">Outcome: </span>{v.outcome}</div>}
              </div>
            ))}
            {visits.length === 0 && (
              <div className="card text-center py-16 text-gray-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30"/>
                <p>No site visits scheduled yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── IQAC MEETINGS ────────────────────────────────────────────────────── */}
      {tab === 'meetings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{meetings.length} meetings recorded</p>
            {canManage && (
              <button onClick={() => { setForm({ date:'', venue:'Conference Room', status:'scheduled', meeting_number:`IQAC-${meetings.length+1}` }); setModal('meeting'); }} className="btn-primary">
                <Plus className="w-4 h-4"/> Schedule Meeting
              </button>
            )}
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Meeting No.</th>
                <th className="table-th">Date</th>
                <th className="table-th">Venue</th>
                <th className="table-th">Status</th>
                <th className="table-th">Action Items</th>
                {canManage && <th className="table-th"/>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {meetings.map(m => {
                  const items = (() => { try { return JSON.parse(m.action_items)||[]; } catch { return []; } })();
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="table-td font-mono text-sm font-semibold text-msrim-blue">{m.meeting_number}</td>
                      <td className="table-td">{m.date ? new Date(m.date).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
                      <td className="table-td text-sm text-gray-600">{m.venue||'—'}</td>
                      <td className="table-td"><span className={`${STATUS_BADGE[m.status]||'badge-gray'}`}>{m.status}</span></td>
                      <td className="table-td text-sm text-gray-500">{items.length} items</td>
                      {canManage && (
                        <td className="table-td">
                          <button onClick={()=>del('meetings',m.id,()=>api.get('/accreditation/meetings').then(r=>setMeetings(r.data||[])))} className="p-1 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {meetings.length === 0 && <tr><td colSpan={6} className="table-td text-center py-12 text-gray-400">No IQAC meetings yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}
      {modal === 'cycle' && (
        <Modal title="New Accreditation Cycle" onClose={() => setModal(null)} onSave={() => submit('cycles','post',null,loadBase)}>
          <div className="space-y-3">
            <div><label className="label-sm">Cycle Name *</label><input value={form.name||''} onChange={e=>set('name',e.target.value)} className="input-field" placeholder="e.g. NAAC 4th Cycle 2024-29"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Body *</label><select value={form.body||'NAAC'} onChange={e=>set('body',e.target.value)} className="select-field">{BODIES.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="label-sm">Status</label><select value={form.status||'planning'} onChange={e=>set('status',e.target.value)} className="select-field"><option value="planning">Planning</option><option value="in_progress">In Progress</option><option value="submitted">Submitted</option><option value="completed">Completed</option></select></div>
              <div><label className="label-sm">Start Date</label><input type="date" value={form.start_date||''} onChange={e=>set('start_date',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">End Date</label><input type="date" value={form.end_date||''} onChange={e=>set('end_date',e.target.value)} className="input-field"/></div>
            </div>
            <div><label className="label-sm">Target Grade</label><input value={form.target_grade||''} onChange={e=>set('target_grade',e.target.value)} className="input-field" placeholder="e.g. A++, Accredited, Top 100"/></div>
          </div>
        </Modal>
      )}

      {modal === 'evidence' && (
        <Modal title="Add Evidence Document" onClose={() => setModal(null)} onSave={() => submit('evidence','post',null,()=>api.get('/accreditation/evidence').then(r=>setEvidence(r.data||[])))}>
          <div className="space-y-3">
            <div><label className="label-sm">Title *</label><input value={form.title||''} onChange={e=>set('title',e.target.value)} className="input-field" placeholder="Document title"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Accreditation Body</label><select value={form.body||'NAAC'} onChange={e=>set('body',e.target.value)} className="select-field">{BODIES.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="label-sm">Document Type</label><select value={form.document_type||'report'} onChange={e=>set('document_type',e.target.value)} className="select-field">{DOC_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div><label className="label-sm">Academic Year</label><input value={form.academic_year||''} onChange={e=>set('academic_year',e.target.value)} className="input-field" placeholder="2024-25"/></div>
              <div><label className="label-sm">File Name</label><input value={form.file_name||''} onChange={e=>set('file_name',e.target.value)} className="input-field" placeholder="document.pdf"/></div>
            </div>
            <div><label className="label-sm">Criterion (optional)</label><select value={form.criteria_id||''} onChange={e=>set('criteria_id',e.target.value)} className="select-field"><option value="">Not linked to a criterion</option>{criteria.map(c=><option key={c.id} value={c.id}>{c.criterion_number}. {c.criterion_name}</option>)}</select></div>
            <div><label className="label-sm">Description</label><textarea value={form.description||''} onChange={e=>set('description',e.target.value)} rows={2} className="input-field resize-none"/></div>
          </div>
        </Modal>
      )}

      {modal === 'action' && (
        <Modal title="Add Action Plan" onClose={() => setModal(null)} onSave={() => submit('actions','post',null,()=>api.get('/accreditation/actions').then(r=>setActions(r.data||[])))}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Body</label><select value={form.body||'NAAC'} onChange={e=>set('body',e.target.value)} className="select-field">{BODIES.map(b=><option key={b}>{b}</option>)}</select></div>
              <div><label className="label-sm">Priority</label><select value={form.priority||'medium'} onChange={e=>set('priority',e.target.value)} className="select-field"><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
            </div>
            <div><label className="label-sm">Criterion Reference</label><input value={form.criterion_ref||''} onChange={e=>set('criterion_ref',e.target.value)} className="input-field" placeholder="e.g. 3.1.2"/></div>
            <div><label className="label-sm">Gap / Issue *</label><textarea value={form.gap_description||''} onChange={e=>set('gap_description',e.target.value)} rows={2} className="input-field resize-none" placeholder="Describe the gap or non-compliance…"/></div>
            <div><label className="label-sm">Action Planned *</label><textarea value={form.action_planned||''} onChange={e=>set('action_planned',e.target.value)} rows={2} className="input-field resize-none" placeholder="What action will be taken?"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Responsible Person</label><select value={form.responsible_person||''} onChange={e=>set('responsible_person',e.target.value)} className="select-field"><option value="">Select…</option>{faculty.map(f=><option key={f.id} value={f.user_id}>{f.name}</option>)}</select></div>
              <div><label className="label-sm">Target Date</label><input type="date" value={form.target_date||''} onChange={e=>set('target_date',e.target.value)} className="input-field"/></div>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'visit' && (
        <Modal title="Schedule Site Visit" onClose={() => setModal(null)} onSave={() => submit('visits','post',null,()=>api.get('/accreditation/visits').then(r=>setVisits(r.data||[])))}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Cycle *</label><select value={form.cycle_id||''} onChange={e=>set('cycle_id',e.target.value)} className="select-field"><option value="">Select…</option>{cycles.map(c=><option key={c.id} value={c.id}>{c.body}: {c.name}</option>)}</select></div>
              <div><label className="label-sm">Visit Type</label><select value={form.visit_type||'peer_team_visit'} onChange={e=>set('visit_type',e.target.value)} className="select-field">{VISIT_TYPES.map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}</select></div>
              <div><label className="label-sm">Scheduled Date *</label><input type="date" value={form.scheduled_date||''} onChange={e=>set('scheduled_date',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Status</label><select value={form.status||'scheduled'} onChange={e=>set('status',e.target.value)} className="select-field"><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="postponed">Postponed</option><option value="cancelled">Cancelled</option></select></div>
            </div>
            <div><label className="label-sm">Peer Review Team</label><input value={form.peer_team||''} onChange={e=>set('peer_team',e.target.value)} className="input-field" placeholder="Names of peer reviewers…"/></div>
            <div><label className="label-sm">Agenda</label><textarea value={form.agenda||''} onChange={e=>set('agenda',e.target.value)} rows={2} className="input-field resize-none"/></div>
          </div>
        </Modal>
      )}

      {modal === 'meeting' && (
        <Modal title="Schedule IQAC Meeting" onClose={() => setModal(null)} onSave={() => submit('meetings','post',null,()=>api.get('/accreditation/meetings').then(r=>setMeetings(r.data||[])))}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Meeting No.</label><input value={form.meeting_number||''} onChange={e=>set('meeting_number',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Date *</label><input type="date" value={form.date||''} onChange={e=>set('date',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Venue</label><input value={form.venue||''} onChange={e=>set('venue',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Status</label><select value={form.status||'scheduled'} onChange={e=>set('status',e.target.value)} className="select-field"><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
            </div>
            <div><label className="label-sm">Minutes</label><textarea value={form.minutes||''} onChange={e=>set('minutes',e.target.value)} rows={3} className="input-field resize-none"/></div>
          </div>
        </Modal>
      )}

      {modal === 'aol_goal' && (
        <Modal title="Add AOL Goal" onClose={() => setModal(null)} onSave={() => { const ac = cycleForBody('AACSB'); submit('aol/goals','post',null,()=>{ if(ac) api.get(`/accreditation/aol/goals?cycle_id=${ac.id}`).then(r=>setAolGoals(r.data||[])); }); }}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Goal Code *</label><input value={form.goal_code||''} onChange={e=>set('goal_code',e.target.value)} className="input-field" placeholder="e.g. LG1"/></div>
              <div><label className="label-sm">Program</label><select value={form.program_id||''} onChange={e=>set('program_id',e.target.value)} className="select-field"><option value="">All Programs</option>{programs.map(p=><option key={p.id} value={p.id}>{p.code} – {p.name}</option>)}</select></div>
            </div>
            <div><label className="label-sm">Goal Name *</label><input value={form.goal_name||''} onChange={e=>set('goal_name',e.target.value)} className="input-field" placeholder="e.g. Critical Thinking & Analytical Skills"/></div>
            <div><label className="label-sm">Description</label><textarea value={form.description||''} onChange={e=>set('description',e.target.value)} rows={2} className="input-field resize-none"/></div>
          </div>
        </Modal>
      )}

      {modal === 'aol_measurement' && (
        <Modal title="Add Learning Objective & Measurement" onClose={() => setModal(null)} onSave={() => submit('aol/measurements','post',null,()=>{setGoalMeasurements(p=>({...p,[form.goal_id]:null}));if(expandedGoal)expandGoal(expandedGoal);})}>
          <div className="space-y-3">
            <div><label className="label-sm">Learning Objective *</label><input value={form.learning_objective||''} onChange={e=>set('learning_objective',e.target.value)} className="input-field" placeholder="Students will be able to…"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Measurement Tool</label><input value={form.measurement_tool||''} onChange={e=>set('measurement_tool',e.target.value)} className="input-field" placeholder="Rubric / Exam / Survey"/></div>
              <div><label className="label-sm">Target %</label><input type="number" value={form.target_pct||70} onChange={e=>set('target_pct',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Academic Year</label><input value={form.academic_year||'2024-25'} onChange={e=>set('academic_year',e.target.value)} className="input-field"/></div>
            </div>
          </div>
        </Modal>
      )}

      {modal === 'aol_closing' && (
        <Modal title="Close the Loop" onClose={() => setModal(null)} onSave={() => submit('aol/closings','post',null,()=>{setGoalClosings(p=>({...p,[form.goal_id]:null}));if(expandedGoal)expandGoal(expandedGoal);})}>
          <div className="space-y-3">
            <div><label className="label-sm">Gap Identified *</label><textarea value={form.gap_identified||''} onChange={e=>set('gap_identified',e.target.value)} rows={2} className="input-field resize-none"/></div>
            <div><label className="label-sm">Action Taken *</label><textarea value={form.action_taken||''} onChange={e=>set('action_taken',e.target.value)} rows={2} className="input-field resize-none"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Implementation Date</label><input type="date" value={form.implementation_date||''} onChange={e=>set('implementation_date',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Next Review Date</label><input type="date" value={form.next_review_date||''} onChange={e=>set('next_review_date',e.target.value)} className="input-field"/></div>
            </div>
            <div><label className="label-sm">Outcome</label><input value={form.outcome||''} onChange={e=>set('outcome',e.target.value)} className="input-field" placeholder="Result after implementing the action…"/></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Criteria Tab (shared for NAAC & NBA) ──────────────────────────────────────
function CriteriaTab({ body, cycles, selectedCycle, setSelectedCycle, criteria, indicators, expandedCriteria, expandCriteria, criteriaIndicators, criteriaEvidence, canManage, faculty, reload, modal, setModal, form, setForm, set, submit, del, programs }) {
  const cycle = cycles.find(c => c.body === body);
  const totalScore = criteria.reduce((s,c) => s+(c.max_score||0), 0);
  const achievedScore = criteria.reduce((s,c) => s+(c.current_score||0), 0);
  const overallPct = pct(achievedScore, totalScore);

  return (
    <div className="space-y-4">
      {/* Cycle selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} className="select-field text-sm w-64">
            {cycles.filter(c => c.body === body).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {cycle && <span className={`${STATUS_BADGE[cycle.status]||'badge-gray'}`}>{cycle.status?.replace('_',' ')}</span>}
          {cycle?.target_grade && <span className="text-sm text-gray-500">Target: <span className="font-semibold">{cycle.target_grade}</span></span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-400">Overall Score</p>
            <p className={`text-xl font-bold ${readinessText(overallPct)}`}>{achievedScore.toFixed(0)}/{totalScore} <span className="text-sm">({overallPct}%)</span></p>
          </div>
          {canManage && <button onClick={() => { setForm({ cycle_id: cycle?.id||'', criterion_number:'', criterion_name:'', max_score:'100', weightage:'1' }); setModal('criteria_add'); }} className="btn-primary text-sm"><Plus className="w-4 h-4"/> Add Criterion</button>}
        </div>
      </div>

      {/* Grade legend for NAAC */}
      {body === 'NAAC' && (
        <div className="flex gap-2 flex-wrap text-xs">
          {[['A++','3.76-4.0','bg-green-600'],['A+','3.51-3.75','bg-green-500'],['A','3.26-3.50','bg-blue-500'],['B++','3.01-3.25','bg-yellow-500'],['B+','2.76-3.00','bg-orange-500'],['B','2.51-2.75','bg-red-500']].map(([g,r,c])=>(
            <span key={g} className={`${c} text-white px-2 py-0.5 rounded-full font-medium`}>{g} ({r})</span>
          ))}
        </div>
      )}

      {/* Criteria list */}
      {criteria.length === 0 && (
        <div className="card text-center py-16 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30"/>
          <p>No criteria for this cycle yet.</p>
        </div>
      )}
      {criteria.map(c => {
        const p = pct(c.current_score, c.max_score);
        const expanded = expandedCriteria === c.id;
        const inds = criteriaIndicators[c.id] || [];
        const evs  = criteriaEvidence[c.id]  || [];
        return (
          <div key={c.id} className="card p-0 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50" onClick={() => expandCriteria(c.id)}>
              <div className={`w-10 h-10 rounded-xl ${readinessColor(p).replace('bg-','bg-')} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}
                style={{ backgroundColor: p>=80?'#22c55e':p>=50?'#eab308':'#ef4444' }}>
                {c.criterion_number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{c.criterion_name}</p>
                  <span className={`${STATUS_BADGE[c.status]||'badge-gray'} text-xs`}>{c.status?.replace('_',' ')}</span>
                  {c.open_actions > 0 && <span className="badge-red text-xs">{c.open_actions} actions</span>}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${readinessColor(p)}`} style={{ width:`${p}%` }}/>
                  </div>
                  <span className={`text-sm font-bold ${readinessText(p)} flex-shrink-0`}>{c.current_score||0}/{c.max_score}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{c.responsible_name||'No owner'} · {c.evidence_count||0} docs · {inds.length} indicators</p>
              </div>
              {expanded ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0"/> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0"/>}
            </div>

            {expanded && (
              <div className="border-t bg-gray-50 px-5 pb-5 pt-4 space-y-4">
                {/* Score update */}
                {canManage && (
                  <div className="flex items-center gap-3 bg-white rounded-xl p-3 border">
                    <span className="text-sm font-medium text-gray-700">Update Score:</span>
                    <input type="number" min="0" max={c.max_score} defaultValue={c.current_score||0}
                      className="input-field text-sm w-24"
                      onBlur={async(e) => { await api.put(`/accreditation/criteria/${c.id}`, { current_score: parseFloat(e.target.value)||0, status: c.status, notes: c.notes, responsible_person: c.responsible_person }); toast.success('Score updated'); reload(); }}
                    />
                    <span className="text-sm text-gray-400">/ {c.max_score}</span>
                    <select defaultValue={c.status} onChange={async(e)=>{await api.put(`/accreditation/criteria/${c.id}`,{current_score:c.current_score,status:e.target.value,notes:c.notes});toast.success('Status updated');reload();}} className="select-field text-sm w-36">
                      <option value="not_started">Not Started</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="verified">Verified</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                {c.notes && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 italic">{c.notes}</div>}

                {/* Indicators */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Key Performance Indicators</h4>
                    {canManage && <button onClick={()=>{setForm({criteria_id:c.id,indicator_code:'',indicator_name:'',target_value:'',unit:'',data_source:''});setModal('indicator_add');}} className="text-xs btn-secondary py-1 px-2"><Plus className="w-3 h-3"/> Add KPI</button>}
                  </div>
                  {inds.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-xs text-gray-400 border-b"><th className="pb-1 text-left">Code</th><th className="pb-1 text-left">Indicator</th><th className="pb-1 text-right">Target</th><th className="pb-1 text-right">Achieved</th><th className="pb-1 text-center">Verified</th></tr></thead>
                        <tbody>
                          {inds.map(ind => (
                            <tr key={ind.id} className="border-b border-gray-100">
                              <td className="py-1.5 font-mono text-xs text-msrim-blue">{ind.indicator_code}</td>
                              <td className="py-1.5 text-gray-700">{ind.indicator_name}</td>
                              <td className="py-1.5 text-right text-gray-500">{ind.target_value||'—'} {ind.unit}</td>
                              <td className="py-1.5 text-right">
                                {canManage ? (
                                  <input type="number" defaultValue={ind.achieved_value||0} className="w-20 border rounded px-1 py-0.5 text-xs text-right"
                                    onBlur={async(e)=>{await api.put(`/accreditation/indicators/${ind.id}`,{achieved_value:parseFloat(e.target.value)||0,verified:ind.verified,data_source:ind.data_source});reload();}}/>
                                ) : <span className={`font-semibold ${(ind.achieved_value||0)>=(ind.target_value||0)?'text-green-600':'text-red-500'}`}>{ind.achieved_value||0}</span>}
                              </td>
                              <td className="py-1.5 text-center">
                                {canManage ? (
                                  <button onClick={async()=>{await api.put(`/accreditation/indicators/${ind.id}`,{achieved_value:ind.achieved_value,verified:!ind.verified,data_source:ind.data_source});reload();}}>
                                    {ind.verified ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <div className="w-4 h-4 border-2 border-gray-300 rounded-full mx-auto"/>}
                                  </button>
                                ) : ind.verified ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto"/> : <div className="w-4 h-4 border-2 border-gray-200 rounded-full mx-auto"/>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-sm text-gray-400">No KPIs defined.</p>}
                </div>

                {/* Evidence */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Evidence Documents <span className="text-gray-400 font-normal">({evs.length})</span></h4>
                  <div className="flex flex-wrap gap-2">
                    {evs.map(ev => (
                      <div key={ev.id} className="flex items-center gap-1.5 bg-white border rounded-lg px-2.5 py-1.5 text-xs">
                        <FileText className="w-3 h-3 text-msrim-blue flex-shrink-0"/>
                        <span className="text-gray-700">{ev.title}</span>
                        <span className="text-gray-400">{ev.document_type}</span>
                        {ev.verified_at && <CheckCircle2 className="w-3 h-3 text-green-500"/>}
                      </div>
                    ))}
                    {evs.length === 0 && <p className="text-sm text-gray-400">No evidence uploaded.</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Criteria add modal */}
      {modal === 'criteria_add' && (
        <Modal title={`Add ${body} Criterion`} onClose={() => setModal(null)} onSave={() => submit('criteria','post',null,reload)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Criterion Number *</label><input value={form.criterion_number||''} onChange={e=>set('criterion_number',e.target.value)} className="input-field" placeholder="e.g. 1 or 1.1"/></div>
              <div><label className="label-sm">Max Score</label><input type="number" value={form.max_score||100} onChange={e=>set('max_score',e.target.value)} className="input-field"/></div>
            </div>
            <div><label className="label-sm">Criterion Name *</label><input value={form.criterion_name||''} onChange={e=>set('criterion_name',e.target.value)} className="input-field" placeholder="Criterion name…"/></div>
          </div>
        </Modal>
      )}

      {/* Indicator add modal */}
      {modal === 'indicator_add' && (
        <Modal title="Add KPI / Indicator" onClose={() => setModal(null)} onSave={() => submit('indicators','post',null,reload)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Code *</label><input value={form.indicator_code||''} onChange={e=>set('indicator_code',e.target.value)} className="input-field" placeholder="e.g. 1.1.1"/></div>
              <div><label className="label-sm">Unit</label><input value={form.unit||''} onChange={e=>set('unit',e.target.value)} className="input-field" placeholder="%, number, ratio…"/></div>
            </div>
            <div><label className="label-sm">Indicator Name *</label><input value={form.indicator_name||''} onChange={e=>set('indicator_name',e.target.value)} className="input-field" placeholder="Indicator description…"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label-sm">Target Value</label><input type="number" value={form.target_value||''} onChange={e=>set('target_value',e.target.value)} className="input-field"/></div>
              <div><label className="label-sm">Data Source</label><input value={form.data_source||''} onChange={e=>set('data_source',e.target.value)} className="input-field" placeholder="IQAC / Dept records…"/></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Shared Modal ──────────────────────────────────────────────────────────────
function Modal({ title, children, onClose, onSave }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <h3 className="font-bold text-lg">{title}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onSave} className="btn-primary flex-1">Save</button>
        </div>
      </div>
    </div>
  );
}
