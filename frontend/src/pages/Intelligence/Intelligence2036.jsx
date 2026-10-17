import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Brain, Zap, TrendingUp, Target, Users, BookOpen, Award, DollarSign,
  MessageSquare, Send, Sparkles, AlertTriangle, CheckCircle, Clock,
  BarChart3, Globe, Shield, Lightbulb, ArrowUpRight, ChevronRight,
  GraduationCap, FlaskConical, Building2, Activity, RefreshCw, Star
} from 'lucide-react';
import toast from 'react-hot-toast';

// ── Score Ring Component ───────────────────────────────────────────────────────
function ScoreRing({ score, max = 100, size = 100, label, color = '#3b82f6' }) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / max) * circ;
  const pct = Math.round((score / max) * 100);
  const c = score >= 80 ? '#10b981' : score >= 65 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={size*0.08} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={c} strokeWidth={size*0.08}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="text-center -mt-2" style={{ marginTop: -(size*0.85) + 'px', height: size * 0.85, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <p className="font-bold" style={{ fontSize: size * 0.2, color: c }}>{score}</p>
        <p className="text-gray-500" style={{ fontSize: size * 0.1 }}>/{max}</p>
      </div>
      {label && <p className="text-xs text-gray-500 text-center mt-1">{label}</p>}
    </div>
  );
}

// ── Breakdown Bar ─────────────────────────────────────────────────────────────
function BreakdownBar({ label, score, max, value }) {
  const pct = Math.min((score / max) * 100, 100);
  const c = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-500">{score}/{max} {value ? `· ${value}` : ''}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${c} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Intelligence2036() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('executive');
  const [loading, setLoading] = useState(true);

  // Executive dashboard
  const [execData, setExecData] = useState(null);
  // PRI
  const [priData, setPriData] = useState(null);
  const [priClass, setPriClass] = useState(null);
  // FES
  const [fesData, setFesData] = useState(null);
  const [fesAll, setFesAll] = useState(null);
  // Skill gaps
  const [skillGaps, setSkillGaps] = useState(null);
  const [classGaps, setClassGaps] = useState(null);
  // Predictions
  const [predictions, setPredictions] = useState(null);

  // Conversational ERP
  const [chatHistory, setChatHistory] = useState([
    { role: 'ai', text: 'Hello! I\'m the MSRIM AI Assistant. Ask me anything about your institution — admissions, placements, research, rankings, finance, and more.', suggestions: ['Show admissions conversion rate', 'Who are the top faculty?', 'What is the placement rate?', 'Show campus health score'] }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const isMgmt = ['admin', 'hod', 'registrar'].includes(user?.role);
  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const promises = [];
      if (isMgmt) {
        promises.push(
          api.get('/ai/executive-dashboard').then(r => setExecData(r.data)).catch(() => {}),
          api.get('/ai/placement-readiness-class').then(r => setPriClass(r.data)).catch(() => {}),
          api.get('/ai/faculty-effectiveness-all').then(r => setFesAll(r.data)).catch(() => {}),
          api.get('/ai/skill-gaps/class').then(r => setClassGaps(r.data)).catch(() => {}),
          api.get('/ai/predictions').then(r => setPredictions(r.data)).catch(() => {}),
        );
      }
      if (isFaculty) {
        promises.push(
          api.get('/ai/faculty-effectiveness/me').then(r => setFesData(r.data)).catch(() => {}),
        );
      }
      if (isStudent) {
        promises.push(
          api.get('/ai/placement-readiness/me').then(r => setPriData(r.data)).catch(() => {}),
          api.get('/ai/skill-gaps/me').then(r => setSkillGaps(r.data)).catch(() => {}),
        );
        setActiveTab('student');
      }
      await Promise.all(promises);
    } catch (e) { toast.error('Failed to load intelligence data'); }
    setLoading(false);
  };

  const sendQuery = async (q) => {
    const query = q || chatInput.trim();
    if (!query) return;
    setChatInput('');
    setChatHistory(h => [...h, { role: 'user', text: query }]);
    setChatLoading(true);
    try {
      const r = await api.post('/ai/query', { query });
      const d = r.data;
      if (!d.understood) {
        setChatHistory(h => [...h, { role: 'ai', text: 'I didn\'t quite understand that. Here are some things I can help with:', suggestions: d.suggestions }]);
      } else {
        setChatHistory(h => [...h, { role: 'ai', text: d.insight || 'Here are the results:', title: d.title, data: d.data, actionUrl: d.action_url }]);
      }
    } catch { setChatHistory(h => [...h, { role: 'ai', text: 'Something went wrong. Please try again.' }]); }
    setChatLoading(false);
  };

  const tabs = [
    ...(isMgmt ? [{ id: 'executive', label: 'Executive Dashboard', icon: BarChart3 }] : []),
    ...(isStudent ? [{ id: 'student', label: 'My AI Profile', icon: Target }] : []),
    ...(isFaculty ? [{ id: 'faculty', label: 'My Effectiveness', icon: Star }] : []),
    { id: 'conversational', label: 'Ask AI', icon: MessageSquare },
    ...(isMgmt ? [
      { id: 'pri', label: 'Placement Readiness', icon: TrendingUp },
      { id: 'fes', label: 'Faculty Scores', icon: Users },
      { id: 'skills', label: 'Skill Gap Engine', icon: Lightbulb },
      { id: 'predictions', label: 'Predictions', icon: Zap },
    ] : []),
    ...(isStudent ? [{ id: 'skills', label: 'My Skill Gaps', icon: Lightbulb }] : []),
  ];

  const priColor = (pri) => pri >= 80 ? 'text-green-700 bg-green-100' : pri >= 65 ? 'text-blue-700 bg-blue-100' : pri >= 50 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100';

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">MSRIM AI Intelligence</h1>
            <p className="text-gray-500 text-sm">Vision 2036 · Intelligent Decision Engine · Digital Executive Assistant</p>
          </div>
        </div>
        <button onClick={loadAll} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === t.id ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-md' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading AI Intelligence...</p>
          </div>
        </div>
      ) : (

      /* ── EXECUTIVE DASHBOARD ─────────────────────────────────────────── */
      activeTab === 'executive' && execData ? (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Students', value: execData.kpis.students, icon: GraduationCap, color: 'bg-blue-50 text-blue-600' },
              { label: 'Faculty', value: execData.kpis.faculty, icon: Users, color: 'bg-indigo-50 text-indigo-600' },
              { label: 'Avg CGPA', value: execData.kpis.avg_cgpa, icon: Award, color: 'bg-violet-50 text-violet-600' },
              { label: 'Placement %', value: `${execData.kpis.placement_rate}%`, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
              { label: 'Revenue (₹L)', value: execData.kpis.revenue_lakhs, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Publications', value: execData.kpis.publications, icon: BookOpen, color: 'bg-amber-50 text-amber-600' },
              { label: 'NAAC Score', value: `${execData.kpis.naac_score}%`, icon: Shield, color: 'bg-rose-50 text-rose-600' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-2xl border p-4 flex flex-col items-center text-center">
                <div className={`w-9 h-9 rounded-lg ${k.color} flex items-center justify-center mb-2`}>
                  <k.icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              </div>
            ))}
          </div>

          {/* Health + Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-violet-600 to-blue-700 rounded-2xl p-5 text-white flex items-center gap-5">
              <div className="relative">
                <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="45" cy="45" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
                  <circle cx="45" cy="45" r="34" fill="none" stroke="white" strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={2 * Math.PI * 34 * (1 - execData.health_score / 100)}
                    strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s' }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold">{execData.health_score}</span>
                  <span className="text-xs opacity-70">/100</span>
                </div>
              </div>
              <div>
                <p className="text-sm opacity-80">Campus Health Score</p>
                <p className="text-2xl font-bold">{execData.health_score >= 80 ? 'Excellent' : execData.health_score >= 60 ? 'Good' : 'Needs Attention'}</p>
                <p className="text-xs opacity-70 mt-1">{execData.kpis.critical_alerts} critical alerts · {execData.kpis.at_risk_students} at-risk students</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Student Satisfaction</h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-amber-500">{execData.kpis.student_satisfaction}</div>
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${parseFloat(execData.kpis.student_satisfaction) >= s ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />)}
                  </div>
                  <p className="text-xs text-gray-500">Student feedback avg rating</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-2"><p className="text-blue-600 font-semibold">{execData.kpis.active_mous}</p><p className="text-gray-500">Active MOUs</p></div>
                <div className="bg-green-50 rounded-lg p-2"><p className="text-green-600 font-semibold">{execData.kpis.fdp_days}</p><p className="text-gray-500">FDP Days</p></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-5">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Revenue Trend</h3>
              <div className="space-y-2">
                {execData.revenue_trend?.map((r, i) => (
                  <div key={r.month} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-16">{r.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${Math.min((r.amount / (execData.revenue_trend[0]?.amount || 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-700 w-16 text-right">₹{(r.amount/100000).toFixed(1)}L</span>
                  </div>
                ))}
                {!execData.revenue_trend?.length && <p className="text-xs text-gray-400">No revenue data yet.</p>}
              </div>
            </div>
          </div>
        </div>

      /* ── STUDENT AI PROFILE ───────────────────────────────────────────── */
      ) : activeTab === 'student' && priData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-gradient-to-br from-violet-600 to-blue-700 rounded-2xl p-6 text-white flex flex-col items-center text-center">
            <div className="relative mb-4">
              <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="70" cy="70" r="55" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle cx="70" cy="70" r="55" fill="none" stroke="white" strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 55}
                  strokeDashoffset={2 * Math.PI * 55 * (1 - priData.total / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold">{priData.total}</span>
                <span className="text-sm opacity-70">/100</span>
              </div>
            </div>
            <p className="text-lg font-bold">{priData.level}</p>
            <p className="text-sm opacity-80 mt-1">Placement Readiness Index</p>
            <div className="mt-4 bg-white/10 rounded-xl p-3 w-full text-left text-sm">
              {priData.total >= 80 ? '🎯 You are highly competitive for top consulting & strategy roles.' : priData.total >= 65 ? '✅ You are placement-ready. Focus on certifications to stand out.' : priData.total >= 50 ? '📈 Keep improving. 2-3 more certifications will boost your score.' : '⚠️ Action needed. Improve attendance, skills, and LMS engagement.'}
            </div>
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Score Breakdown</h3>
            <div className="space-y-4">
              {Object.values(priData.breakdown).map(b => (
                <BreakdownBar key={b.label} label={b.label} score={b.score} max={b.max} value={b.value} />
              ))}
            </div>
            <div className="mt-5 p-4 bg-blue-50 rounded-xl">
              <p className="text-sm font-semibold text-blue-800 mb-2">AI Career Coach Recommendations</p>
              <ul className="space-y-1.5 text-xs text-blue-700">
                {priData.breakdown.skills.score < priData.breakdown.skills.max * 0.7 && <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />Add more skills to your placement profile — target high-demand skills like AI/ML, Data Analytics</li>}
                {priData.breakdown.certifications.score < priData.breakdown.certifications.max * 0.7 && <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />Earn 1-2 industry certifications (Google Analytics, AWS, CFA Level 1) to boost your PRI</li>}
                {priData.breakdown.attendance.score < priData.breakdown.attendance.max * 0.8 && <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />Improve attendance — recruiters filter on attendance during shortlisting</li>}
                {priData.breakdown.lms.score < priData.breakdown.lms.max * 0.7 && <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />Complete pending LMS assignments — shows academic diligence to recruiters</li>}
                <li className="flex items-start gap-2"><ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />Upload your resume, LinkedIn URL, and project documents to complete your profile</li>
              </ul>
            </div>
          </div>
        </div>

      /* ── FACULTY EFFECTIVENESS ─────────────────────────────────────────── */
      ) : activeTab === 'faculty' && fesData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-teal-600 to-green-700 rounded-2xl p-6 text-white flex flex-col items-center text-center">
            <div className="relative mb-4">
              <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
                <circle cx="60" cy="60" r="46" fill="none" stroke="white" strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 46}
                  strokeDashoffset={2 * Math.PI * 46 * (1 - fesData.total / 100)}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{fesData.total}</span>
                <span className="text-xs opacity-70">/100</span>
              </div>
            </div>
            <p className="text-lg font-bold">{fesData.level}</p>
            <p className="text-sm opacity-80 mt-1">Faculty Effectiveness Score</p>
          </div>
          <div className="md:col-span-2 bg-white rounded-2xl border p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Effectiveness Breakdown</h3>
            <div className="space-y-4">
              {Object.values(fesData.breakdown).map(b => (
                <BreakdownBar key={b.label} label={b.label} score={b.score} max={b.max} value={b.value} />
              ))}
            </div>
            <div className="mt-5 p-4 bg-teal-50 rounded-xl">
              <p className="text-sm font-semibold text-teal-800 mb-2">Recommendations to Improve Your Score</p>
              <ul className="space-y-1.5 text-xs text-teal-700">
                {fesData.breakdown.research.score < 15 && <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />Submit a journal article this semester — Scopus/WoS indexed publications carry highest weight</li>}
                {fesData.breakdown.fdp.score < 10 && <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />Attend or organise 2+ FDP programs this year</li>}
                {fesData.breakdown.engagement.score < 15 && <li className="flex gap-2"><ChevronRight className="w-3 h-3 mt-0.5" />Mark student attendance regularly to improve engagement score</li>}
              </ul>
            </div>
          </div>
        </div>

      /* ── CONVERSATIONAL ERP ───────────────────────────────────────────── */
      ) : activeTab === 'conversational' ? (
        <div className="bg-white rounded-2xl border flex flex-col h-[600px]">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-blue-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">MSRIM AI Assistant</p>
              <p className="text-xs text-gray-500">Ask anything about your institution in plain English</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Online
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'bg-violet-600 text-white rounded-2xl rounded-tr-sm' : 'bg-gray-50 border rounded-2xl rounded-tl-sm'} p-3`}>
                  {msg.role === 'ai' && msg.title && <p className="font-semibold text-gray-900 text-sm mb-1">{msg.title}</p>}
                  <p className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-gray-700'}`}>{msg.text}</p>
                  {msg.data && Object.keys(msg.data).length > 0 && !Array.isArray(msg.data) && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {Object.entries(msg.data).filter(([k]) => k !== 'monthly_trend' && k !== 'by_program' && k !== 'by_department').map(([k, v]) => (
                        <div key={k} className="bg-white rounded-lg p-2 border">
                          <p className="text-xs text-gray-500 capitalize">{k.replace(/_/g,' ')}</p>
                          <p className="text-sm font-semibold text-gray-900">{typeof v === 'object' ? JSON.stringify(v) : v}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {Array.isArray(msg.data) && msg.data.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {msg.data.slice(0, 5).map((item, j) => (
                        <div key={j} className="bg-white rounded-lg p-2 border text-xs">
                          {Object.entries(item).map(([k,v]) => (
                            <span key={k} className="mr-2"><span className="text-gray-500 capitalize">{k.replace(/_/g,' ')}:</span> <span className="font-medium text-gray-900">{v}</span></span>
                          ))}
                        </div>
                      ))}
                      {msg.data.length > 5 && <p className="text-xs text-gray-400">+{msg.data.length - 5} more...</p>}
                    </div>
                  )}
                  {msg.suggestions && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {msg.suggestions.map((s, j) => (
                        <button key={j} onClick={() => sendQuery(s)}
                          className="text-xs bg-white border rounded-full px-3 py-1 text-violet-700 hover:bg-violet-50 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 border rounded-2xl rounded-tl-sm p-3 flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 border-t">
            <form onSubmit={e => { e.preventDefault(); sendQuery(); }} className="flex gap-2">
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                placeholder="Ask anything… 'Show NAAC score', 'Top faculty this semester', 'Placement rate'..."
                className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              <button type="submit" disabled={chatLoading || !chatInput.trim()}
                className="bg-violet-600 text-white rounded-xl px-4 py-2.5 hover:bg-violet-700 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

      /* ── PLACEMENT READINESS — CLASS VIEW ────────────────────────────── */
      ) : activeTab === 'pri' && priClass ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'McKinsey Ready (80+)', value: priClass.distribution.mckinsey, color: 'bg-green-50 text-green-700 border-green-100' },
              { label: 'Placement Ready (65+)', value: priClass.distribution.ready, color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { label: 'Nearly Ready (50+)', value: priClass.distribution.nearly, color: 'bg-amber-50 text-amber-700 border-amber-100' },
              { label: 'Needs Development', value: priClass.distribution.needs, color: 'bg-red-50 text-red-700 border-red-100' },
            ].map(d => (
              <div key={d.label} className={`rounded-xl border p-4 ${d.color}`}>
                <p className="text-2xl font-bold">{d.value}</p>
                <p className="text-xs font-medium mt-0.5">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <p className="font-semibold text-gray-900">Placement Readiness Index — All Students</p>
              <span className="text-sm text-gray-500">Class avg: <strong>{priClass.avg}</strong>/100</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-2">Rank</th>
                  <th className="text-left px-4 py-2">Student</th>
                  <th className="text-left px-4 py-2">Batch</th>
                  <th className="text-left px-4 py-2">CGPA</th>
                  <th className="text-left px-4 py-2">PRI</th>
                  <th className="text-left px-4 py-2">Level</th>
                </tr></thead>
                <tbody className="divide-y">
                  {priClass.students.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400 font-medium">#{i+1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{s.batch_year}</td>
                      <td className="px-4 py-2.5 text-gray-600">{s.cgpa}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${s.pri >= 80 ? 'bg-green-500' : s.pri >= 65 ? 'bg-blue-500' : s.pri >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${s.pri}%` }} />
                          </div>
                          <span className="font-semibold">{s.pri}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priColor(s.pri)}`}>{s.level}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      /* ── FACULTY EFFECTIVENESS — ALL ─────────────────────────────────── */
      ) : activeTab === 'fes' && fesAll ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Faculty', value: fesAll.total },
              { label: 'Average FES', value: fesAll.avg },
              { label: 'Top Scorer', value: fesAll.faculty[0]?.fes || '—' },
            ].map(d => (
              <div key={d.label} className="bg-white border rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{d.value}</p>
                <p className="text-xs text-gray-500 mt-1">{d.label}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b"><p className="font-semibold text-gray-900">Faculty Effectiveness Scores</p></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-2">Rank</th><th className="text-left px-4 py-2">Faculty</th>
                  <th className="text-left px-4 py-2">Department</th><th className="text-left px-4 py-2">FES</th>
                  <th className="text-left px-4 py-2">Level</th>
                </tr></thead>
                <tbody className="divide-y">
                  {fesAll.faculty.map((f, i) => (
                    <tr key={f.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-400">#{i+1}</td>
                      <td className="px-4 py-2.5 font-medium">{f.name}</td>
                      <td className="px-4 py-2.5 text-gray-500">{f.department || '—'}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${f.fes >= 80 ? 'bg-green-500' : f.fes >= 65 ? 'bg-teal-500' : f.fes >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${f.fes}%` }} />
                          </div>
                          <span className="font-semibold">{f.fes}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${f.fes >= 80 ? 'bg-green-100 text-green-700' : f.fes >= 65 ? 'bg-teal-100 text-teal-700' : f.fes >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{f.level}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      /* ── SKILL GAP ENGINE ─────────────────────────────────────────────── */
      ) : activeTab === 'skills' ? (
        <div className="space-y-4">
          {skillGaps && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-gray-900">{skillGaps.coverageScore}%</p><p className="text-xs text-gray-500">Industry Coverage</p></div>
              <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-green-600">{skillGaps.covered}</p><p className="text-xs text-gray-500">Skills Covered</p></div>
              <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-500">{skillGaps.total - skillGaps.covered}</p><p className="text-xs text-gray-500">Skill Gaps</p></div>
            </div>
          )}
          {skillGaps?.recommendations?.length > 0 && (
            <div className="bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-100 rounded-2xl p-5">
              <p className="font-semibold text-violet-900 mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Top Priority Skills to Acquire</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {skillGaps.recommendations.map(r => (
                  <div key={r.skill} className="bg-white rounded-xl p-3 border">
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-gray-900 text-sm">{r.skill}</p>
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{r.demand}% demand</span>
                    </div>
                    <p className="text-xs text-green-600 mt-0.5">{r.growth}</p>
                    <p className="text-xs text-gray-500 mt-1">{r.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b"><p className="font-semibold text-gray-900">Industry Demand vs {isStudent ? 'Your Skills' : 'Student Coverage'}</p></div>
            <div className="p-4 space-y-3">
              {(skillGaps?.gaps || classGaps?.analysis || []).map(g => (
                <div key={g.skill} className="flex items-center gap-3">
                  <div className="w-40 text-xs text-gray-600 truncate">{g.skill}</div>
                  <div className="flex-1 grid grid-cols-2 gap-1">
                    <div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${g.demand}%` }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">Industry {g.demand}%</p>
                    </div>
                    {g.penetration !== undefined && (
                      <div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${g.penetration >= g.demand * 0.7 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${g.penetration}%` }} />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">Students {g.penetration}%</p>
                      </div>
                    )}
                  </div>
                  {g.has !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${g.has ? 'bg-green-100 text-green-700' : g.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
                      {g.has ? '✓ Covered' : g.priority === 'high' ? '⚠ High Priority' : 'Gap'}
                    </span>
                  )}
                  <span className="text-xs text-green-600 w-20 text-right">{g.growth}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      /* ── PREDICTIONS ──────────────────────────────────────────────────── */
      ) : activeTab === 'predictions' && predictions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { key: 'fee_default_risk', label: 'Fee Default Risk', icon: DollarSign, color: 'red', field: 'students' },
            { key: 'placement_risk', label: 'Placement Risk (Low CGPA)', icon: TrendingUp, color: 'amber', field: 'students' },
            { key: 'dropout_risk', label: 'Dropout Risk (Low Attendance)', icon: AlertTriangle, color: 'orange', field: 'students' },
            { key: 'mou_expiry', label: 'MOUs Expiring Soon', icon: Building2, color: 'blue', field: 'items' },
            { key: 'grants_ending', label: 'Grants Ending Soon', icon: FlaskConical, color: 'violet', field: 'items' },
          ].map(({ key, label, icon: Icon, color, field }) => {
            const section = predictions[key];
            const items = section?.[field] || [];
            return (
              <div key={key} className="bg-white rounded-2xl border overflow-hidden">
                <div className={`p-4 border-b flex items-center justify-between bg-${color}-50`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 text-${color}-600`} />
                    <p className="font-semibold text-gray-900 text-sm">{label}</p>
                  </div>
                  <span className={`bg-${color}-100 text-${color}-700 text-xs px-2 py-0.5 rounded-full font-medium`}>{section?.count || 0} affected</span>
                </div>
                <div className="p-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {items.length > 0 ? items.map((item, i) => (
                    <div key={i} className="text-xs text-gray-600 px-2 py-1.5 rounded-lg bg-gray-50 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-${color}-500 flex-shrink-0`} />
                      <span className="font-medium">{item.name || item.partner || item.pi || '—'}</span>
                      {item.enrollment && <span className="text-gray-400">· {item.enrollment}</span>}
                      {item.cgpa && <span className="text-gray-400">· CGPA {item.cgpa}</span>}
                      {item.att && <span className="text-gray-400">· {item.att}</span>}
                      {item.days_left !== undefined && <span className={`ml-auto ${item.days_left <= 30 ? 'text-red-600 font-medium' : 'text-amber-600'}`}>{item.days_left}d left</span>}
                    </div>
                  )) : <p className="text-xs text-gray-400 text-center py-2">No risks detected.</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <Brain className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>Select a tab to view AI insights</p>
          </div>
        </div>
      ))}
    </div>
  );
}
