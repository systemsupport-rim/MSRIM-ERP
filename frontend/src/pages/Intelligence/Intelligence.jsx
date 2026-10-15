import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Brain, Zap, AlertTriangle, CheckCircle2, Info, Shield, TrendingUp,
  RefreshCw, ChevronRight, GraduationCap, DollarSign, Award, ShoppingCart,
  Activity, Clock, Target, Check, X, BarChart3, Cpu, AlertCircle,
  Users, Wifi, ArrowUpRight, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const agentConfig = {
  student_risk: { name: 'Student Risk Monitor', icon: GraduationCap, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', desc: 'Monitors attendance, fees & academic risk' },
  finance: { name: 'Finance Anomaly Detector', icon: DollarSign, color: 'from-emerald-500 to-teal-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', desc: 'Detects budget anomalies & overruns' },
  naac: { name: 'NAAC Score Optimizer', icon: Award, color: 'from-rose-500 to-pink-600', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', desc: 'Optimizes accreditation scores & criteria' },
  procurement: { name: 'Procurement Intelligence', icon: ShoppingCart, color: 'from-orange-500 to-amber-600', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', desc: 'Tracks inventory, PRs & vendor delivery' },
  campus_pulse: { name: 'Campus Pulse Engine', icon: Activity, color: 'from-purple-500 to-violet-600', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', desc: 'Aggregates all campus health metrics' },
};

const severityConfig = {
  critical: { label: 'Critical', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', icon: AlertCircle, dot: 'bg-red-500', text: 'text-red-600' },
  warning: { label: 'Warning', bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle, dot: 'bg-yellow-500', text: 'text-yellow-600' },
  success: { label: 'Good', bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-100 text-green-700', icon: CheckCircle2, dot: 'bg-green-500', text: 'text-green-600' },
  info: { label: 'Info', bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', icon: Info, dot: 'bg-blue-500', text: 'text-blue-600' },
};

function HealthGauge({ score }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Critical';
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black" style={{ color }}>{score}</span>
          <span className="text-xs font-semibold text-gray-400">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-bold mt-1" style={{ color }}>{label}</span>
      <span className="text-xs text-gray-400">Campus Health</span>
    </div>
  );
}

function PulsingDot({ active }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {active && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? 'bg-green-500' : 'bg-gray-300'}`} />
    </span>
  );
}

export default function Intelligence() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [insights, setInsights] = useState([]);
  const [tab, setTab] = useState('overview');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const intervalRef = useRef(null);
  const isAdmin = ['admin','registrar','hod'].includes(user?.role);

  const loadData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [d, ins] = await Promise.all([
        api.get('/agents/dashboard'),
        api.get('/agents/insights'),
      ]);
      setDashboard(d.data);
      setInsights(ins.data);
      setLastRefresh(new Date());
    } catch { if (!quiet) toast.error('Failed to load intelligence data'); }
    if (!quiet) setLoading(false);
  };

  useEffect(() => {
    loadData();
    intervalRef.current = setInterval(() => loadData(true), 60000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const runAgents = async () => {
    setRunning(true);
    try {
      const res = await api.post('/agents/run');
      toast.success(res.data.message);
      await loadData(true);
    } catch { toast.error('Failed to run agents'); }
    setRunning(false);
  };

  const resolveInsight = async (id) => {
    try {
      await api.put(`/agents/insights/${id}/resolve`);
      setInsights(prev => prev.filter(i => i.id !== id));
      toast.success('Marked as resolved');
    } catch { toast.error('Failed to resolve'); }
  };

  const filteredInsights = insights.filter(i => {
    if (filterAgent && i.agent_type !== filterAgent) return false;
    if (filterSeverity && i.severity !== filterSeverity) return false;
    return true;
  });

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header — AI Command Center */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' }}>
        {/* Animated grid */}
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        {/* Glow effects */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-10" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-purple-500 rounded-full filter blur-3xl opacity-10" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2.5 border border-white/20">
                <Brain className="w-6 h-6 text-blue-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/10 border border-white/20 text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">AI INTELLIGENCE CENTER</span>
                <span className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 text-green-300 text-xs font-semibold px-3 py-1 rounded-full">
                  <PulsingDot active={true} /> LIVE
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
              MSRIM Campus Intelligence
            </h1>
            <p className="text-blue-200/80 text-sm max-w-lg">5 AI agents running continuously — student risk monitoring, finance anomaly detection, NAAC optimization, procurement intelligence, and campus pulse analysis.</p>
            <p className="text-blue-300/50 text-xs mt-2 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Last refreshed: {lastRefresh.toLocaleTimeString()} · Auto-refresh every 60s
            </p>
          </div>
          <div className="hidden md:flex flex-col gap-2 items-end">
            {dashboard && <HealthGauge score={dashboard.healthScore} />}
            {isAdmin && (
              <button onClick={runAgents} disabled={running} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
                {running ? 'Running...' : 'Run All Agents'}
              </button>
            )}
          </div>
        </div>

        {/* Agent Status Strip */}
        {dashboard && (
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(agentConfig).map(([type, cfg]) => {
              const runInfo = dashboard.recentRuns?.find(r => r.agent_type === type);
              const insightCount = dashboard.byAgent?.find(a => a.agent_type === type)?.c || 0;
              return (
                <div key={type} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all cursor-pointer" onClick={() => { setFilterAgent(type); setTab('alerts'); }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`bg-gradient-to-r ${cfg.color} p-1.5 rounded-lg`}><cfg.icon className="w-3.5 h-3.5 text-white" /></div>
                    <PulsingDot active={true} />
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{cfg.name.replace(' Intelligence','').replace(' Engine','').replace(' Monitor','').replace(' Detector','').replace(' Optimizer','')}</p>
                  <p className="text-xs text-white/40 mt-0.5">{insightCount} active insight{insightCount !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats Row */}
        {dashboard && (
          <div className="relative mt-4 flex flex-wrap gap-3">
            {[
              { label: 'Critical', value: dashboard.critical, color: 'text-red-400', bg: 'bg-red-500/10 border-red-400/20' },
              { label: 'Warnings', value: dashboard.warning, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-400/20' },
              { label: 'Good Signals', value: dashboard.success, color: 'text-green-400', bg: 'bg-green-500/10 border-green-400/20' },
              { label: 'Informational', value: dashboard.info, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-400/20' },
              { label: 'Resolved', value: dashboard.resolved, color: 'text-gray-400', bg: 'bg-white/5 border-white/10' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${bg}`}>
                <span className={`text-lg font-bold ${color}`}>{value}</span>
                <span className="text-white/50 text-xs">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile run button */}
      {isAdmin && (
        <div className="md:hidden flex gap-2">
          <button onClick={runAgents} disabled={running} className="btn-primary flex-1">
            <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Running Agents...' : 'Run All Agents Now'}
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {['overview','alerts','agents'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'alerts' && dashboard?.critical > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{dashboard.critical}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-spin border-t-indigo-600" />
            <Brain className="absolute inset-0 m-auto w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-gray-400 text-sm">Intelligence agents analyzing campus data...</p>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && dashboard && (
            <div className="space-y-4">
              {/* Priority Alerts */}
              {dashboard.recentInsights?.filter(i => i.severity === 'critical').length > 0 && (
                <div className="card border-l-4 border-red-500 bg-red-50">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <h3 className="font-bold text-red-800">Critical Alerts Requiring Immediate Action</h3>
                  </div>
                  <div className="space-y-2">
                    {dashboard.recentInsights.filter(i => i.severity === 'critical').map(ins => {
                      const cfg = agentConfig[ins.agent_type] || {};
                      return (
                        <div key={ins.id} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-red-100">
                          <div className="bg-red-100 rounded-lg p-2 flex-shrink-0">{cfg.icon ? <cfg.icon className="w-4 h-4 text-red-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-red-800">{ins.title}</p>
                            <p className="text-xs text-red-600 mt-0.5 line-clamp-2">{ins.description}</p>
                          </div>
                          {ins.action_url && <a href={ins.action_url} className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 flex-shrink-0">Fix →</a>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Insights */}
                <div className="card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Latest Intelligence</h3>
                  <div className="space-y-2">
                    {dashboard.recentInsights?.slice(0, 6).map(ins => {
                      const sev = severityConfig[ins.severity];
                      const agCfg = agentConfig[ins.agent_type] || {};
                      return (
                        <div key={ins.id} className={`flex items-start gap-3 p-3 rounded-xl border ${sev.border} ${sev.bg}`}>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${sev.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${sev.text}`}>{ins.title}</p>
                            <p className="text-xs text-gray-400 capitalize">{agCfg.name || ins.agent_type}</p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${sev.badge}`}>{sev.label}</span>
                        </div>
                      );
                    })}
                    {!dashboard.recentInsights?.length && (
                      <div className="text-center py-6">
                        <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">All clear! No active alerts.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent Performance */}
                <div className="card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-indigo-500" /> Agent Performance</h3>
                  <div className="space-y-3">
                    {Object.entries(agentConfig).map(([type, cfg]) => {
                      const runInfo = dashboard.recentRuns?.find(r => r.agent_type === type);
                      const insightCount = dashboard.byAgent?.find(a => a.agent_type === type)?.c || 0;
                      return (
                        <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className={`bg-gradient-to-r ${cfg.color} p-2 rounded-lg flex-shrink-0`}>
                            <cfg.icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{cfg.name}</p>
                            <p className="text-xs text-gray-400">{insightCount} active · {runInfo?.last_ran ? `Last: ${new Date(runInfo.last_ran).toLocaleTimeString()}` : 'Running...'}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <PulsingDot active={true} />
                            <span className="text-xs text-green-600 font-medium">Active</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {tab === 'alerts' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3 items-center">
                <h3 className="font-semibold text-gray-700 flex-shrink-0">All Alerts ({filteredInsights.length})</h3>
                <div className="flex gap-2 flex-wrap">
                  <select className="select-field text-sm w-auto" value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
                    <option value="">All Agents</option>
                    {Object.entries(agentConfig).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                  </select>
                  <select className="select-field text-sm w-auto" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
                    <option value="">All Severities</option>
                    {Object.entries(severityConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {(filterAgent || filterSeverity) && (
                    <button onClick={() => { setFilterAgent(''); setFilterSeverity(''); }} className="text-sm text-msrim-blue hover:underline">Clear filters</button>
                  )}
                </div>
              </div>

              {filteredInsights.length === 0 ? (
                <div className="card text-center py-16">
                  <CheckCircle2 className="w-14 h-14 text-green-400 mx-auto mb-3" />
                  <h3 className="font-bold text-gray-700 text-lg">All Clear!</h3>
                  <p className="text-gray-400 text-sm mt-1">No active alerts matching your filters. The AI agents are continuously monitoring.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInsights.map(ins => {
                    const sev = severityConfig[ins.severity];
                    const agCfg = agentConfig[ins.agent_type] || {};
                    const SevIcon = sev.icon;
                    return (
                      <div key={ins.id} className={`card p-4 border-l-4 hover:shadow-md transition-all ${ins.severity === 'critical' ? 'border-red-500' : ins.severity === 'warning' ? 'border-yellow-400' : ins.severity === 'success' ? 'border-green-400' : 'border-blue-400'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-xl flex-shrink-0 ${sev.bg}`}>
                            <SevIcon className={`w-5 h-5 ${sev.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-semibold text-sm">{ins.title}</h4>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${sev.badge}`}>{sev.label}</span>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{ins.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${agCfg.bg || 'bg-gray-100'} ${agCfg.text || 'text-gray-600'} font-medium`}>{agCfg.name || ins.agent_type}</span>
                              <span className="text-xs text-gray-400">{new Date(ins.generated_at).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            {ins.action_url && (
                              <a href={ins.action_url} className="text-xs bg-msrim-blue text-white px-3 py-1.5 rounded-lg hover:bg-msrim-blue-dark flex items-center gap-1">
                                View <ChevronRight className="w-3 h-3" />
                              </a>
                            )}
                            <button onClick={() => resolveInsight(ins.id)} className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-200 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Resolve
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Agents Tab */}
          {tab === 'agents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(agentConfig).map(([type, cfg]) => {
                const runInfo = dashboard?.recentRuns?.find(r => r.agent_type === type);
                const agentInsights = insights.filter(i => i.agent_type === type);
                const critical = agentInsights.filter(i => i.severity === 'critical').length;
                const warning = agentInsights.filter(i => i.severity === 'warning').length;
                const success = agentInsights.filter(i => i.severity === 'success').length;
                return (
                  <div key={type} className="card hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`bg-gradient-to-br ${cfg.color} p-3 rounded-xl shadow-lg`}>
                        <cfg.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                        <PulsingDot active={true} /> Running
                      </div>
                    </div>
                    <h3 className="font-bold text-gray-900">{cfg.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 mb-4">{cfg.desc}</p>

                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-red-600">{critical}</p>
                        <p className="text-xs text-red-400">Critical</p>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-yellow-600">{warning}</p>
                        <p className="text-xs text-yellow-400">Warning</p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-2 text-center">
                        <p className="text-lg font-bold text-green-600">{success}</p>
                        <p className="text-xs text-green-400">Good</p>
                      </div>
                    </div>

                    {agentInsights.slice(0, 3).map(ins => {
                      const sev = severityConfig[ins.severity];
                      return (
                        <div key={ins.id} className={`flex items-center gap-2 p-2 rounded-lg mb-1 ${sev.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sev.dot}`} />
                          <p className="text-xs text-gray-600 truncate flex-1">{ins.title}</p>
                        </div>
                      );
                    })}

                    <div className="flex items-center justify-between mt-4 pt-3 border-t">
                      <div>
                        <p className="text-xs text-gray-400">Last run</p>
                        <p className="text-xs font-medium text-gray-600">{runInfo?.last_ran ? new Date(runInfo.last_ran).toLocaleTimeString() : '—'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setFilterAgent(type); setTab('alerts'); }} className={`text-xs ${cfg.text} ${cfg.bg} ${cfg.border} border px-3 py-1.5 rounded-lg font-medium`}>
                          View All
                        </button>
                        {isAdmin && (
                          <button onClick={async () => {
                            try { await api.post(`/agents/run/${type}`); toast.success('Agent run complete'); loadData(true); }
                            catch { toast.error('Failed'); }
                          }} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-medium hover:bg-gray-200">
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
