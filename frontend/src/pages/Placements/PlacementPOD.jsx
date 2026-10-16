import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  ArrowLeft, BarChart2, Zap, MessageSquare, FileText,
  CheckCircle, XCircle, ChevronRight, ChevronLeft, ChevronDown, ChevronUp,
  Upload, TrendingUp, Users, Briefcase, Award, Star, RefreshCw,
  Home, CalendarDays, Network, ScrollText, Inbox, MessagesSquare,
  UserCircle2, Settings, Shield, GraduationCap,
} from 'lucide-react';

const PIE_COLORS = ['#1a56db', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444'];

const INTERVIEW_QB = {
  'Marketing & Sales': [
    { q: 'How would you design a go-to-market strategy for a new product?', a: 'Start with market research to identify target segments, define the value proposition, select distribution channels, set pricing, and build a launch timeline with KPIs.' },
    { q: 'Explain the concept of Customer Lifetime Value (CLV) and why it matters.', a: 'CLV is the total revenue a business can expect from a single customer over their entire relationship. It guides acquisition spend decisions and retention prioritisation.' },
    { q: 'What is the difference between push and pull marketing strategies?', a: 'Push strategy targets intermediaries to push products to consumers (trade promotions, in-store displays). Pull strategy targets end consumers to create demand (advertising, social media).' },
    { q: 'How would you handle a situation where a client\'s KPIs are not being met?', a: 'Diagnose root causes first — analyse data, speak with the client, review the campaign. Then revise strategy, communicate transparently, and set realistic revised targets.' },
    { q: 'Describe a digital marketing funnel and how you would optimise each stage.', a: 'Awareness → Interest → Decision → Action. Optimise awareness with SEO/ads, interest with content/email, decision with reviews/demos, action with UX/CTA improvements.' },
  ],
  'Finance & Accounts': [
    { q: 'Walk me through a DCF valuation model.', a: 'Project free cash flows over a forecast period, discount them at the WACC to get PV, add terminal value (Gordon Growth or exit multiple), sum to get enterprise value.' },
    { q: 'What is the difference between EBITDA and Net Income?', a: 'EBITDA excludes interest, taxes, depreciation and amortisation — it approximates operating cash generation. Net income is the bottom-line profit after all expenses.' },
    { q: 'How do you analyse a company\'s liquidity position?', a: 'Use Current Ratio (CA/CL), Quick Ratio (liquid assets/CL), Cash Ratio, and operating cash flow trends. Compare against industry benchmarks.' },
    { q: 'Explain Working Capital Management and its importance.', a: 'WCM involves optimising the cash conversion cycle — managing receivables, inventory, and payables to ensure sufficient liquidity without tying up excess capital.' },
    { q: 'What is the significance of the Capital Asset Pricing Model (CAPM)?', a: 'CAPM calculates expected return as Risk-free rate + Beta × (Market return − Risk-free rate). It quantifies the cost of equity and helps in investment decision-making.' },
  ],
  'Operations & SCM': [
    { q: 'What is the Bullwhip Effect and how can it be mitigated?', a: 'Demand variability amplifies upstream in the supply chain. Mitigate via information sharing, VMI, order batching reduction, and stable pricing strategies.' },
    { q: 'Explain Lean vs Six Sigma methodologies.', a: 'Lean eliminates waste (MUDA) to improve flow. Six Sigma reduces defects/variation using DMAIC. Lean Six Sigma combines both for comprehensive process improvement.' },
    { q: 'How would you optimise warehouse layout for faster order fulfilment?', a: 'Apply ABC analysis (fast-movers near dispatch), use slotting optimisation, minimise travel paths, implement pick-to-light systems, and cross-docking where possible.' },
    { q: 'What is the Economic Order Quantity (EOQ) model?', a: 'EOQ = √(2DS/H) where D=annual demand, S=ordering cost, H=holding cost per unit. It minimises the total of ordering and holding costs.' },
    { q: 'Describe a situation where you would use a make-or-buy decision framework.', a: 'Compare total cost of in-house production (fixed + variable) vs procurement cost. Factor in quality control, capacity, IP risks, supplier reliability, and strategic considerations.' },
  ],
  'HR & OB': [
    { q: 'How would you design an employee onboarding programme?', a: 'Pre-boarding (offer to day 1), structured orientation week, 30-60-90 day goal setting, buddy programme, regular check-ins, and feedback loops with manager.' },
    { q: 'Explain Maslow\'s Hierarchy and its application in employee motivation.', a: 'Physiological → Safety → Social → Esteem → Self-actualisation. HR designs benefits/compensation (lower needs), team culture (social), recognition (esteem), and growth (self-actualisation).' },
    { q: 'What is HR Analytics and how does it add value?', a: 'Using data to improve hiring quality, predict attrition, measure training ROI, and optimise workforce planning — turning HR from intuition-driven to evidence-based.' },
    { q: 'Describe the difference between performance management and performance appraisal.', a: 'Performance management is an ongoing process (goal setting, coaching, feedback). Appraisal is a periodic formal assessment — a component of the broader PM cycle.' },
    { q: 'How do you handle conflict between two high-performing employees?', a: 'Address early, hold separate conversations, identify root cause, facilitate a mediated discussion, agree on norms, and follow up. Avoid taking sides.' },
  ],
  'Business Analytics': [
    { q: 'What is the difference between supervised and unsupervised learning?', a: 'Supervised learning trains on labelled data to predict outputs (regression, classification). Unsupervised finds hidden patterns in unlabelled data (clustering, dimensionality reduction).' },
    { q: 'Explain a situation where correlation does not imply causation.', a: 'Ice cream sales and drowning rates are correlated — both driven by hot weather (confounding variable). Establishing causation requires controlled experiments or causal inference methods.' },
    { q: 'How would you handle missing data in a dataset?', a: 'Assess missingness pattern (MCAR/MAR/MNAR). Options: listwise deletion, mean/median imputation, KNN imputation, MICE, or model-based imputation — choice depends on percentage and pattern.' },
    { q: 'What is the purpose of A/B testing and what are common pitfalls?', a: 'A/B testing compares two variants to determine which performs better. Pitfalls: peeking at results early, insufficient sample size, novelty effects, multiple testing bias.' },
    { q: 'Explain the bias-variance tradeoff in machine learning models.', a: 'High bias → underfitting (too simple). High variance → overfitting (too complex). Optimal models balance both — use regularisation, cross-validation, and appropriate model complexity.' },
  ],
  'General Management': [
    { q: 'How do you prioritise tasks when everything seems urgent?', a: 'Use the Eisenhower Matrix (Urgent-Important quadrants). Delegate urgent-not-important tasks, schedule important-not-urgent work, and eliminate low-value activities.' },
    { q: 'Describe your leadership style and give an example.', a: 'Adapt style to context — coaching for new team members, delegating to experienced ones, directive in crises. Example: led a cross-functional team under tight deadline by clear role definition and daily standups.' },
    { q: 'What is Blue Ocean Strategy?', a: 'Creating uncontested market space by innovating value (new demand, irrelevant competition) rather than competing in existing "red ocean" markets where competition is fierce.' },
    { q: 'How would you manage a project that is running over budget?', a: 'Re-baseline the budget, identify scope reduction opportunities, escalate to sponsor, optimise resource allocation, cut non-critical features, and increase monitoring frequency.' },
    { q: 'Tell me about a time you failed and what you learned.', a: 'Structure using STAR: Situation, Task, Action, Result. Be specific, own the failure, highlight the learning, and show how you applied it. Authenticity beats perfection.' },
  ],
};

const ROLES = Object.keys(INTERVIEW_QB);

function Badge({ count, color = 'bg-msrim-blue' }) {
  if (!count) return null;
  return (
    <span className={`ml-auto text-xs text-white font-semibold px-2 py-0.5 rounded-full ${color} min-w-[22px] text-center`}>
      {count}
    </span>
  );
}

// ── POD Sidebar ───────────────────────────────────────────────────────────────
function PodSidebar({ active, setActive, counts }) {
  const [networkOpen, setNetworkOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const networkTotal = (counts.jobs || 0) + (counts.certificates || 0) +
    (counts.messages || 0) + (counts.forums || 0) + (counts.people || 0);

  function NavItem({ id, icon: Icon, label, badge, badgeColor, onClick, indent }) {
    const isActive = active === id;
    return (
      <button
        onClick={() => { onClick ? onClick() : setActive(id); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
          ${indent ? 'pl-9' : ''}
          ${isActive ? 'bg-blue-50 text-msrim-blue font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-msrim-blue' : 'text-gray-400'}`} />
        <span className="flex-1 text-left">{label}</span>
        {badge ? <Badge count={badge} color={badgeColor || 'bg-msrim-blue'} /> : null}
      </button>
    );
  }

  return (
    <div className="w-56 flex-shrink-0 bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col gap-1 self-start sticky top-6">

      {/* Main nav */}
      <NavItem id="home"   icon={Home}          label="Home" />
      <NavItem id="events" icon={CalendarDays}   label="Events"     badge={counts.events} />

      {/* My Network group */}
      <button
        onClick={() => setNetworkOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors
          ${['jobs','certificates','messages','forums','people'].includes(active) ? 'bg-blue-50 text-msrim-blue font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
      >
        <Network className="w-4 h-4 flex-shrink-0 text-gray-400" />
        <span className="flex-1 text-left">My Network</span>
        <Badge count={networkTotal} />
        {networkOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>

      {networkOpen && (
        <div className="flex flex-col gap-0.5 mt-0.5">
          <NavItem id="jobs"         icon={Briefcase}       label="Jobs"         badge={counts.jobs}         indent />
          <NavItem id="certificates" icon={ScrollText}       label="Certificates" badge={counts.certificates} indent />
          <NavItem id="messages"     icon={Inbox}            label="Messages"     badge={counts.messages}     badgeColor="bg-sky-500" indent />
          <NavItem id="forums"       icon={MessagesSquare}   label="Forums"       badge={counts.forums}       badgeColor="bg-purple-500" indent />
          <NavItem id="people"       icon={Users}            label="People"       badge={counts.people}       badgeColor="bg-green-500" indent />
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-gray-100 my-2" />

      {/* Admin Consoles */}
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-3 mb-1">Admin Consoles</p>
      <NavItem id="console"  icon={Shield}    label="Placement Console" badge={counts.console} />
      <button
        onClick={() => setSettingsOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Settings className="w-4 h-4 text-gray-400" />
        <span className="flex-1 text-left">Settings</span>
        {settingsOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </button>
      {settingsOpen && (
        <div className="flex flex-col gap-0.5 pl-6">
          <NavItem id="resume" icon={FileText}       label="Resume Analyser" indent />
          <NavItem id="coach"  icon={MessageSquare}  label="Interview Coach" indent />
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 text-center">Powered by RIM.IT</p>
      </div>
    </div>
  );
}

// ── Analytics (Home) ──────────────────────────────────────────────────────────
function HomeView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/placements/pod/analytics').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="py-20 text-center text-gray-400">Loading analytics…</div>;
  if (!data) return null;
  const { overall, byCompany, statusBreakdown, typeBreakdown, monthly } = data;
  const placed = overall.total_selected || 0;
  const applied = overall.students_applied || 0;
  const rate = applied > 0 ? Math.round((placed / applied) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Drives',     value: overall.total_drives,  icon: Briefcase,  color: 'text-msrim-blue'   },
          { label: 'Students Applied', value: applied,               icon: Users,      color: 'text-sky-600'      },
          { label: 'Students Placed',  value: placed,                icon: CheckCircle,color: 'text-green-600'    },
          { label: 'Placement Rate',   value: rate + '%',            icon: TrendingUp, color: 'text-purple-600'   },
          { label: 'Avg Package',      value: overall.avg_pkg ? '₹' + overall.avg_pkg + ' L' : '—', icon: Award, color: 'text-msrim-orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div><p className="text-xs text-gray-500">{label}</p><p className={`text-xl font-bold ${color}`}>{value ?? '—'}</p></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Top Companies by Selections</h3>
          {byCompany.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byCompany} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="company_name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v, n) => [v, n === 'selected' ? 'Selected' : 'Applied']} />
                <Bar dataKey="applications" fill="#e0e7ff" radius={[4,4,0,0]} name="Applied" />
                <Bar dataKey="selected" fill="#1a56db" radius={[4,4,0,0]} name="Selected" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No placement data yet</p>}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Application Status Breakdown</h3>
          {statusBreakdown.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, percent }) => `${status} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {statusBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No applications yet</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Monthly Drive Trend</h3>
          {monthly.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthly} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="drives" fill="#6366f1" radius={[4,4,0,0]} name="Drives" />
                <Bar dataKey="completed" fill="#10b981" radius={[4,4,0,0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm py-8 text-center">No trend data yet</p>}
        </div>
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Drive Type Breakdown</h3>
          <div className="space-y-4 mt-2">
            {typeBreakdown.length ? typeBreakdown.map(t => (
              <div key={t.type}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium capitalize text-gray-700">{t.type}</span>
                  <span className="text-sm text-gray-500">{t.count} drives{t.avg_pkg ? ` · ₹${t.avg_pkg}L avg` : ''}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-msrim-blue rounded-full" style={{ width: `${Math.min(100, (t.count / (overall.total_drives || 1)) * 100)}%` }} />
                </div>
              </div>
            )) : <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Events ────────────────────────────────────────────────────────────────────
function EventsView() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/placements').then(r => setDrives(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="py-20 text-center text-gray-400">Loading events…</div>;
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Placement Events</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {drives.map(d => (
          <div key={d.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-bold text-gray-900">{d.company_name}</h3>
                <p className="text-gray-500 text-sm">{d.job_role}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.status==='upcoming'?'bg-blue-100 text-blue-700':d.status==='completed'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{d.status}</span>
            </div>
            {d.package_lpa && <p className="text-green-600 font-semibold">₹{d.package_lpa} LPA</p>}
            <div className="flex gap-3 mt-2 text-xs text-gray-400 flex-wrap">
              {d.location && <span>📍 {d.location}</span>}
              {d.drive_date && <span>📅 {new Date(d.drive_date).toLocaleDateString()}</span>}
              <span>{d.total_applications || 0} applied</span>
            </div>
          </div>
        ))}
        {!drives.length && <div className="card text-center py-12 text-gray-400 col-span-2">No placement events listed</div>}
      </div>
    </div>
  );
}

// ── Job Match ─────────────────────────────────────────────────────────────────
function JobsView() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  useEffect(() => { api.get('/placements/pod/matches').then(r => setDrives(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="py-20 text-center text-gray-400">Analysing your profile…</div>;
  function matchColor(s) { return s>=80?'text-green-700 bg-green-50 border-green-200':s>=65?'text-yellow-700 bg-yellow-50 border-yellow-200':'text-red-700 bg-red-50 border-red-200'; }
  function matchBar(s) { return s>=80?'bg-green-500':s>=65?'bg-yellow-400':'bg-red-400'; }
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Job Match AI</h2>
      <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <Zap className="w-5 h-5 text-msrim-blue flex-shrink-0" />
        <p className="text-sm text-blue-800">Matches are calculated based on your academic profile, PGDM specialisation, and drive requirements.</p>
      </div>
      {drives.map(d => (
        <div key={d.id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setExpanded(expanded===d.id?null:d.id)}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{d.company_name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{d.type}</span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">{d.job_role}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {d.package_lpa && <span className="text-green-600 font-semibold text-sm">₹{d.package_lpa} LPA</span>}
                {d.location && <span className="text-gray-400 text-xs">📍 {d.location}</span>}
                {d.drive_date && <span className="text-gray-400 text-xs">📅 {new Date(d.drive_date).toLocaleDateString()}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className={`px-3 py-1.5 rounded-full border text-sm font-bold ${matchColor(d.match_score)}`}>{d.match_score}% Match</div>
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-1.5 rounded-full ${matchBar(d.match_score)}`} style={{ width: d.match_score+'%' }} />
              </div>
            </div>
          </div>
          {expanded===d.id && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Why this matches you</p>
              <ul className="space-y-1.5">
                {d.match_reasons.map((r,i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{r}
                  </li>
                ))}
              </ul>
              {d.description && <p className="text-sm text-gray-600 mt-3 leading-relaxed">{d.description}</p>}
            </div>
          )}
        </div>
      ))}
      {!drives.length && <div className="card text-center py-16 text-gray-400">No upcoming drives at the moment</div>}
    </div>
  );
}

// ── Certificates ──────────────────────────────────────────────────────────────
function CertificatesView() {
  const certs = [
    { title: 'PGDM Programme Certificate', issuer: 'MS Ramaiah Institute of Management', date: '2026', status: 'In Progress', color: 'bg-blue-50 border-blue-200' },
    { title: 'Business Analytics Certification', issuer: 'MSRIM · RIM.IT', date: '2025', status: 'Completed', color: 'bg-green-50 border-green-200' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Certificates</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {certs.map((c,i) => (
          <div key={i} className={`card border-2 ${c.color}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border"><GraduationCap className="w-5 h-5 text-msrim-blue" /></div>
              <div>
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                <p className="text-sm text-gray-500">{c.issuer} · {c.date}</p>
                <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${c.status==='Completed'?'bg-green-100 text-green-700':'bg-blue-100 text-blue-700'}`}>{c.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Messages ──────────────────────────────────────────────────────────────────
function MessagesView() {
  const msgs = [
    { from: 'Placement Cell', subject: 'Amazon India drive shortlist released', time: '2h ago', unread: true },
    { from: 'MSRIM Admin', subject: 'Pre-placement talk — Deloitte on 28 Oct', time: '1d ago', unread: false },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Messages</h2>
      <div className="card p-0 overflow-hidden divide-y divide-gray-50">
        {msgs.map((m,i) => (
          <div key={i} className={`flex items-start gap-4 p-4 hover:bg-gray-50 cursor-pointer ${m.unread?'bg-blue-50/40':''}`}>
            <div className="w-9 h-9 rounded-full bg-msrim-blue flex items-center justify-center text-white text-sm font-bold flex-shrink-0">{m.from[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm text-gray-900">{m.from}</p>
                <span className="text-xs text-gray-400">{m.time}</span>
              </div>
              <p className="text-sm text-gray-600 truncate">{m.subject}</p>
            </div>
            {m.unread && <div className="w-2 h-2 rounded-full bg-msrim-blue mt-1.5 flex-shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Forums ────────────────────────────────────────────────────────────────────
function ForumsView() {
  const threads = [
    { title: 'Tips for Deloitte case interview round?', replies: 12, views: 84, tag: 'Interview Prep', time: '3h ago' },
    { title: 'Amazon Operations Manager — what to expect?', replies: 8,  views: 56, tag: 'Company Prep',   time: '1d ago' },
    { title: 'Best resources for KPMG Business Analyst role', replies: 5,  views: 30, tag: 'Resources',     time: '2d ago' },
    { title: 'Resume review — anyone willing to help?', replies: 20, views: 110, tag: 'Resume Help',   time: '4d ago' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">Forums</h2>
      <div className="space-y-3">
        {threads.map((t,i) => (
          <div key={i} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">{t.tag}</span>
                <h3 className="font-semibold text-gray-900 mt-1.5">{t.title}</h3>
                <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                  <span>{t.replies} replies</span><span>{t.views} views</span><span>{t.time}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── People ────────────────────────────────────────────────────────────────────
function PeopleView() {
  const people = [
    { name: 'Aarav Mehta',  role: 'PGDM Student · Batch 2024', dept: 'Business Analytics', status: 'Placed — Amazon India' },
    { name: 'Diya Sharma',  role: 'PGDM Student · Batch 2024', dept: 'Marketing',           status: 'Seeking Opportunities' },
    { name: 'Rohan Patel',  role: 'PGDM Student · Batch 2024', dept: 'Finance',             status: 'Placed — KPMG India' },
    { name: 'Sneha Reddy',  role: 'PGDM Student · Batch 2024', dept: 'Operations',          status: 'Seeking Opportunities' },
  ];
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900">People</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {people.map((p,i) => (
          <div key={i} className="card flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-msrim-blue to-purple-500 flex items-center justify-center text-white font-bold flex-shrink-0">{p.name[0]}</div>
            <div>
              <h3 className="font-semibold text-gray-900">{p.name}</h3>
              <p className="text-xs text-gray-500">{p.role}</p>
              <p className="text-xs text-gray-400">{p.dept}</p>
              <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${p.status.startsWith('Placed')?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>{p.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Placement Console (Admin) ─────────────────────────────────────────────────
function ConsoleView() {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/placements').then(r => setDrives(r.data)).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="py-20 text-center text-gray-400">Loading…</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Placement Console</h2>
        <Link to="/placements" className="btn-primary text-sm">Manage Drives</Link>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-th">Company</th><th className="table-th">Role</th>
              <th className="table-th">Package</th><th className="table-th">Drive Date</th>
              <th className="table-th">Applications</th><th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drives.map(d => (
              <tr key={d.id} className="hover:bg-gray-50">
                <td className="table-td font-semibold">{d.company_name}</td>
                <td className="table-td">{d.job_role}</td>
                <td className="table-td text-green-600 font-medium">{d.package_lpa ? `₹${d.package_lpa}L` : '—'}</td>
                <td className="table-td">{d.drive_date ? new Date(d.drive_date).toLocaleDateString() : '—'}</td>
                <td className="table-td">{d.total_applications}</td>
                <td className="table-td">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${d.status==='upcoming'?'bg-blue-100 text-blue-700':d.status==='completed'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{d.status}</span>
                </td>
              </tr>
            ))}
            {!drives.length && <tr><td colSpan={6} className="table-td text-center py-8 text-gray-400">No drives</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Interview Coach ───────────────────────────────────────────────────────────
function CoachView() {
  const [role, setRole] = useState(ROLES[0]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState([]);
  const questions = INTERVIEW_QB[role];
  const q = questions[idx];
  const progress = Math.round((done.length / questions.length) * 100);
  function handleNext() { if (!done.includes(idx)) setDone(d => [...d, idx]); setRevealed(false); setIdx(i => Math.min(i+1, questions.length-1)); }
  function handleRole(r) { setRole(r); setIdx(0); setRevealed(false); setDone([]); }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Interview Coach</h2>
      <div className="flex flex-wrap gap-2">
        {ROLES.map(r => (
          <button key={r} onClick={() => handleRole(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${role===r?'bg-msrim-blue text-white border-msrim-blue':'bg-white text-gray-600 border-gray-200 hover:border-msrim-blue hover:text-msrim-blue'}`}>
            {r}
          </button>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>Question {idx+1} of {questions.length}</span>
          <span>{done.length} answered · {progress}% complete</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-1.5 bg-msrim-blue rounded-full" style={{ width: progress+'%' }} />
        </div>
      </div>
      <div className="card">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-msrim-blue text-white flex items-center justify-center text-sm font-bold flex-shrink-0">Q</div>
          <p className="text-gray-900 font-medium leading-relaxed text-lg">{q.q}</p>
        </div>
        {!revealed ? (
          <button onClick={() => setRevealed(true)} className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm hover:border-msrim-blue hover:text-msrim-blue transition-colors">
            Tap to reveal model answer
          </button>
        ) : (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Model Answer</span>
            </div>
            <p className="text-gray-800 text-sm leading-relaxed">{q.a}</p>
          </div>
        )}
        <div className="flex items-center justify-between mt-4">
          <button onClick={() => { setRevealed(false); setIdx(i => Math.max(i-1,0)); }} disabled={idx===0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button onClick={handleNext} disabled={idx===questions.length-1}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-msrim-blue text-white hover:bg-blue-800 disabled:opacity-40 transition-colors">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((_,i) => (
          <button key={i} onClick={() => { setIdx(i); setRevealed(false); }}
            className={`h-2 rounded-full transition-colors ${i===idx?'bg-msrim-blue':done.includes(i)?'bg-green-400':'bg-gray-200'}`} />
        ))}
      </div>
    </div>
  );
}

// ── Resume Analyser ───────────────────────────────────────────────────────────
function ResumeView() {
  const [file, setFile] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [result, setResult] = useState(null);
  const CHECKS = [
    { key: 'contact',    label: 'Contact Information',    weight: 10 },
    { key: 'summary',    label: 'Professional Summary',   weight: 10 },
    { key: 'education',  label: 'Education & CGPA',       weight: 15 },
    { key: 'experience', label: 'Work / Internship Exp.', weight: 20 },
    { key: 'skills',     label: 'Skills & Certifications',weight: 20 },
    { key: 'projects',   label: 'Projects & Achievements',weight: 15 },
    { key: 'format',     label: 'ATS-Friendly Formatting',weight: 10 },
  ];
  function analyse() {
    if (!file) return; setAnalysing(true);
    setTimeout(() => {
      const seed = file.name.split('').reduce((a,c) => a+c.charCodeAt(0), 0);
      const scores = CHECKS.map((c,i) => ({ ...c, score: Math.min(100, 55+((seed*(i+3)*7)%46)) }));
      const ats = Math.round(scores.reduce((a,s) => a+(s.score/100)*s.weight, 0));
      const tips = []; const map = { contact:'Add LinkedIn URL, city, and a professional email.', summary:'Include a 2–3 line career objective tailored to your target role.', education:'List CGPA, relevant coursework, and honours.', experience:'Use action verbs and quantify impact.', skills:'Separate technical and soft skills; add certifications.', projects:'Describe project impact with metrics.', format:'Use a single-column layout and standard fonts.' };
      scores.forEach(s => { if (s.score<70) tips.push(map[s.key]); });
      setResult({ scores, ats, tips }); setAnalysing(false);
    }, 2200);
  }
  function scoreColor(s) { return s>=80?'text-green-600':s>=60?'text-yellow-600':'text-red-500'; }
  function barColor(s)   { return s>=80?'bg-green-500':s>=60?'bg-yellow-400':'bg-red-400'; }
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Resume Analyser</h2>
      {!result ? (
        <>
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-msrim-blue transition-colors cursor-pointer" onClick={() => document.getElementById('resume-file').click()}>
            <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-700">Drop your resume here or click to upload</p>
            <p className="text-sm text-gray-400 mt-1">PDF or DOCX — max 5 MB</p>
            {file && <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full text-msrim-blue text-sm font-medium"><FileText className="w-4 h-4" />{file.name}</div>}
            <input id="resume-file" type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </div>
          <button onClick={analyse} disabled={!file||analysing} className="w-full btn-primary py-3 disabled:opacity-50">
            {analysing ? <span className="flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" />Analysing…</span> : 'Analyse Resume'}
          </button>
        </>
      ) : (
        <>
          <div className="card bg-gradient-to-br from-msrim-blue to-blue-800 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-200 text-sm">Overall ATS Score</p>
                <p className="text-5xl font-bold mt-1">{result.ats}<span className="text-2xl text-blue-200">/100</span></p>
                <p className="text-blue-200 text-sm mt-1">{result.ats>=80?'Excellent — highly ATS-compatible':result.ats>=60?'Good — minor improvements needed':'Needs improvement before applying'}</p>
              </div>
              <Star className="w-14 h-14 text-yellow-300" fill="currentColor" />
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Section Analysis</h3>
            <div className="space-y-3">
              {result.scores.map(s => (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{s.label}</span>
                    <span className={`text-sm font-bold ${scoreColor(s.score)}`}>{s.score}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-2 rounded-full ${barColor(s.score)}`} style={{ width: s.score+'%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {result.tips.length>0 && (
            <div className="card border-l-4 border-msrim-orange">
              <h3 className="font-semibold text-gray-700 mb-3">Improvement Tips</h3>
              <ul className="space-y-2">
                {result.tips.map((tip,i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700"><XCircle className="w-4 h-4 text-msrim-orange flex-shrink-0 mt-0.5" />{tip}</li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={() => { setResult(null); setFile(null); }} className="btn-secondary w-full">Analyse Another Resume</button>
        </>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PlacementPOD() {
  const [active, setActive] = useState('home');
  const [counts, setCounts] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/placements'),
      api.get('/placements/pod/analytics'),
    ]).then(([plc, pod]) => {
      const upcoming = plc.data.filter(d => d.status === 'upcoming').length;
      const total    = plc.data.length;
      setCounts({
        events:       total,
        jobs:         upcoming,
        certificates: 1,
        messages:     2,
        forums:       30,
        people:       6,
        console:      total,
      });
    }).catch(() => {});
  }, []);

  const views = {
    home:         <HomeView />,
    events:       <EventsView />,
    jobs:         <JobsView />,
    certificates: <CertificatesView />,
    messages:     <MessagesView />,
    forums:       <ForumsView />,
    people:       <PeopleView />,
    console:      <ConsoleView />,
    coach:        <CoachView />,
    resume:       <ResumeView />,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/placements" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-msrim-blue to-purple-600 flex items-center justify-center">
            <span className="text-white text-xs font-black tracking-tight">POD</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">RIM Placement Management</h1>
            <p className="text-sm text-gray-500">AI-powered placement intelligence · Powered by RIM.IT</p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        <PodSidebar active={active} setActive={setActive} counts={counts} />
        <div className="flex-1 min-w-0">
          {views[active] || <HomeView />}
        </div>
      </div>
    </div>
  );
}
