import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  ClipboardCheck, Users, TrendingUp, CheckCircle, XCircle, Clock,
  AlertTriangle, ChevronLeft, ChevronRight, Save, Search, Filter,
  LogIn, LogOut, RotateCcw, Calendar, BarChart3, RefreshCw, X
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'present',  label: 'Present',   color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  { value: 'absent',   label: 'Absent',    color: 'bg-red-100 text-red-700',      dot: 'bg-red-500' },
  { value: 'late',     label: 'Late',      color: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-500' },
  { value: 'half_day', label: 'Half Day',  color: 'bg-orange-100 text-orange-700',dot: 'bg-orange-400' },
  { value: 'on_leave', label: 'On Leave',  color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  { value: 'od',       label: 'On Duty',   color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
  { value: 'holiday',  label: 'Holiday',   color: 'bg-gray-100 text-gray-500',    dot: 'bg-gray-400' },
];
const statusCfg = Object.fromEntries(STATUS_OPTIONS.map(s => [s.value, s]));

const pctColor = p => p >= 90 ? 'text-green-600' : p >= 75 ? 'text-blue-600' : p >= 60 ? 'text-yellow-600' : 'text-red-500';
const pctBg    = p => p >= 90 ? 'bg-green-500' : p >= 75 ? 'bg-blue-500' : p >= 60 ? 'bg-yellow-500' : 'bg-red-500';

export default function StaffAttendance() {
  const { user } = useAuth();
  const canManage = ['admin','registrar','hod'].includes(user.role);
  const [tab, setTab] = useState(canManage ? 'mark' : 'my-attendance');

  const tabs = [
    { id: 'mark',          label: 'Mark Attendance',   show: canManage },
    { id: 'my-attendance', label: 'My Attendance',      show: true },
    { id: 'summary',       label: 'Staff Summary',      show: canManage },
    { id: 'regularize',    label: 'Regularization',     show: true },
  ].filter(t => t.show);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-msrim-blue" /> Staff Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">Track, mark & manage attendance for all faculty and staff</p>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'mark'          && <MarkAttendance />}
      {tab === 'my-attendance' && <MyAttendance />}
      {tab === 'summary'       && <StaffSummary />}
      {tab === 'regularize'    && <Regularization />}
    </div>
  );
}

// ── Mark Attendance (Admin / HOD) ─────────────────────────────────────────────
function MarkAttendance() {
  const today = new Date().toISOString().split('T')[0];
  const [date,       setDate]       = useState(today);
  const [department, setDepartment] = useState('');
  const [depts,      setDepts]      = useState([]);
  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState('');

  useEffect(() => { api.get('/staff-attendance/departments').then(r => setDepts(r.data)); }, []);
  useEffect(() => { if (date) loadStaff(); }, [date, department]);

  async function loadStaff() {
    setLoading(true);
    const params = { department };
    const r = await api.get(`/staff-attendance/daily/${date}`, { params });
    setStaff(r.data); setLoading(false);
  }

  const toggleStatus = (userId) => setStaff(s => s.map(m =>
    m.user_id === userId ? { ...m, status: nextStatus(m.status) } : m));

  const nextStatus = s => {
    const order = ['present','absent','late','half_day','on_leave','od','holiday'];
    const idx = order.indexOf(s);
    return order[(idx + 1) % order.length];
  };

  const setAllStatus = (status) => setStaff(s => s.map(m => ({ ...m, status })));

  async function saveAttendance() {
    setSaving(true);
    try {
      await api.post('/staff-attendance/bulk', { date, records: staff.map(s => ({ user_id: s.user_id, status: s.status, check_in: s.check_in, check_out: s.check_out })) });
      toast.success(`Attendance saved for ${staff.length} staff!`);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  const filtered = search ? staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase())) : staff;
  const counts = STATUS_OPTIONS.map(s => ({ ...s, count: staff.filter(m => m.status === s.value).length })).filter(s => s.count > 0);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={today} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
            <select value={department} onChange={e => setDepartment(e.target.value)} className="select-field w-48">
              <option value="">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input className="input-field pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." /></div>
          </div>
        </div>
      </div>

      {/* Status summary */}
      {!loading && staff.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {counts.map(s => (
              <div key={s.value} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium ${s.color}`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}: {s.count}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Mark all:</span>
            {['present','absent','holiday'].map(s => (
              <button key={s} onClick={() => setAllStatus(s)} className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors ${statusCfg[s]?.color || ''}`}>
                {s}
              </button>
            ))}
            <button onClick={saveAttendance} disabled={saving} className="btn-primary py-1.5 ml-2">
              <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Attendance'}
            </button>
          </div>
        </div>
      )}

      {/* Staff table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-th">#</th><th className="table-th">Name</th>
              <th className="table-th">Role / Dept</th>
              <th className="table-th">Check In</th><th className="table-th">Check Out</th>
              <th className="table-th">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="py-10 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              : filtered.map((s, i) => {
                const cfg = statusCfg[s.status] || statusCfg.absent;
                return (
                  <tr key={s.user_id} className={`transition-colors ${s.status === 'absent' ? 'bg-red-50/30' : s.status === 'late' ? 'bg-yellow-50/30' : ''}`}>
                    <td className="table-td text-gray-400 text-xs">{i + 1}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full ${cfg.dot} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {s.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-sm">{s.name}</span>
                      </div>
                    </td>
                    <td className="table-td text-xs text-gray-500 capitalize">{s.role}<br/><span className="text-gray-400">{s.department}</span></td>
                    <td className="table-td">
                      <input type="time" value={s.check_in || ''} onChange={e => setStaff(st => st.map(m => m.user_id === s.user_id ? { ...m, check_in: e.target.value } : m))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-msrim-blue w-24" />
                    </td>
                    <td className="table-td">
                      <input type="time" value={s.check_out || ''} onChange={e => setStaff(st => st.map(m => m.user_id === s.user_id ? { ...m, check_out: e.target.value } : m))}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-msrim-blue w-24" />
                    </td>
                    <td className="table-td">
                      <button onClick={() => toggleStatus(s.user_id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${cfg.color} min-w-24`}>
                        {cfg.label}
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && !filtered.length && <p className="text-center py-10 text-gray-400">No staff found</p>}
      </div>
    </div>
  );
}

// ── My Attendance ─────────────────────────────────────────────────────────────
function MyAttendance() {
  const { user } = useAuth();
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [checkIn,  setCheckIn]  = useState(null);
  const [checkOut, setCheckOut] = useState(null);

  const load = async () => {
    setLoading(true);
    const r = await api.get(`/staff-attendance/summary/${user.id}`, { params: { month: String(month).padStart(2,'0'), year } });
    setSummary(r.data);
    // Today's record
    const today = new Date().toISOString().split('T')[0];
    const todayRec = r.data.records.find(rec => rec.date === today);
    setCheckIn(todayRec?.check_in || null);
    setCheckOut(todayRec?.check_out || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, [month, year]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const today = new Date().toISOString().split('T')[0];

  const recordMap = {};
  summary?.records.forEach(r => { recordMap[r.date] = r; });

  return (
    <div className="space-y-6">
      {/* Self check-in/out */}
      <div className="card bg-gradient-to-r from-msrim-blue/5 to-msrim-blue-light/5 border-msrim-blue/20 border">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-semibold">Today — {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</h3>
            <div className="flex items-center gap-4 mt-1 text-sm">
              {checkIn ? <span className="text-green-600 font-medium flex items-center gap-1"><LogIn className="w-3.5 h-3.5" /> In: {checkIn}</span> : <span className="text-gray-400">Not checked in</span>}
              {checkOut && <span className="text-blue-600 font-medium flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> Out: {checkOut}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={async () => {
              try { const r = await api.post('/staff-attendance/checkin'); setCheckIn(r.data.time); toast.success(`Checked in at ${r.data.time}`); }
              catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
            }} disabled={!!checkIn} className="btn-primary disabled:opacity-50 flex items-center gap-2"><LogIn className="w-4 h-4" /> Check In</button>
            <button onClick={async () => {
              try { const r = await api.post('/staff-attendance/checkout'); setCheckOut(r.data.time); toast.success(`Checked out at ${r.data.time}`); }
              catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
            }} disabled={!checkIn || !!checkOut} className="btn-secondary disabled:opacity-50 flex items-center gap-2"><LogOut className="w-4 h-4" /> Check Out</button>
          </div>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (month === 1) { setMonth(12); setYear(y => y-1); } else setMonth(m => m-1); }} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-bold text-lg w-36 text-center">{new Date(year, month-1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</span>
          <button onClick={() => { if (month === 12) { setMonth(1); setYear(y => y+1); } else setMonth(m => m+1); }} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {summary && (
          <div className="flex items-center gap-3 flex-wrap">
            {[['Present',summary.summary.present,'text-green-600'],['Absent',summary.summary.absent,'text-red-500'],['Late',summary.summary.late,'text-yellow-600'],['On Leave',summary.summary.on_leave,'text-blue-600']].map(([l,v,c]) => (
              <div key={l} className="text-center"><p className={`text-xl font-bold ${c}`}>{v}</p><p className="text-xs text-gray-400">{l}</p></div>
            ))}
            <div className="text-center border-l border-gray-200 pl-3">
              <p className={`text-2xl font-black ${pctColor(parseFloat(summary.summary.attendancePct))}`}>{summary.summary.attendancePct}%</p>
              <p className="text-xs text-gray-400">Attendance</p>
            </div>
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-xs font-semibold text-gray-400 text-center py-1">{d}</div>)}
        </div>
        {loading ? <div className="text-center py-10"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div> : (
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const d = i + 1;
              const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const rec = recordMap[dateStr];
              const isToday = dateStr === today;
              const cfg = rec ? statusCfg[rec.status] : null;
              const isFuture = dateStr > today;
              return (
                <div key={d} className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs transition-all
                  ${isToday ? 'ring-2 ring-msrim-blue ring-offset-1' : ''}
                  ${cfg ? cfg.color : isFuture ? 'text-gray-300' : 'bg-gray-50 text-gray-400'}`}>
                  <span className="font-semibold">{d}</span>
                  {rec && <span className="text-[9px] leading-tight hidden sm:block">{cfg?.label?.slice(0,3)}</span>}
                </div>
              );
            })}
          </div>
        )}
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
          {STATUS_OPTIONS.slice(0, 6).map(s => (
            <div key={s.value} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-3 h-3 rounded-sm ${s.dot}`} />{s.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Staff Summary ─────────────────────────────────────────────────────────────
function StaffSummary() {
  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [month,      setMonth]      = useState(new Date().getMonth() + 1);
  const [year,       setYear]       = useState(new Date().getFullYear());
  const [department, setDepartment] = useState('');
  const [depts,      setDepts]      = useState([]);
  const [search,     setSearch]     = useState('');

  useEffect(() => { api.get('/staff-attendance/departments').then(r => setDepts(r.data)); }, []);
  useEffect(() => { load(); }, [month, year, department]);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/staff-attendance/summary-all', { params: { month: String(month).padStart(2,'0'), year, department } });
    setStaff(r.data); setLoading(false);
  };

  const filtered = search ? staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase())) : staff;
  const avgPct = staff.length ? (staff.reduce((sum, s) => sum + parseFloat(s.pct || 0), 0) / staff.length).toFixed(1) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[['Staff Tracked', staff.length, 'text-msrim-blue'],['Avg Attendance', `${avgPct}%`, 'text-emerald-600'],['Below 75%', staff.filter(s=>parseFloat(s.pct)<75).length, 'text-red-500'],['Perfect (100%)', staff.filter(s=>parseFloat(s.pct)>=100).length, 'text-purple-600']].map(([l,v,c]) => (
          <div key={l} className="card"><p className="text-xs text-gray-500">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); }} className="btn-secondary p-2"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-semibold text-sm w-32 text-center">{new Date(year,month-1).toLocaleDateString('en-IN',{month:'long',year:'numeric'})}</span>
          <button onClick={() => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); }} className="btn-secondary p-2"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <select className="select-field w-48" value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff..." />
        </div>
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-th">Staff</th><th className="table-th text-center">Present</th>
              <th className="table-th text-center">Absent</th><th className="table-th text-center">Late</th>
              <th className="table-th text-center">On Leave</th><th className="table-th text-center">OD</th>
              <th className="table-th">Attendance %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="py-10 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              : filtered.sort((a,b)=>parseFloat(a.pct??100)-parseFloat(b.pct??100)).map(s => {
                const pct = parseFloat(s.pct ?? 100);
                return (
                  <tr key={s.id} className={`hover:bg-gray-50 ${pct < 75 ? 'bg-red-50/30' : ''}`}>
                    <td className="table-td"><p className="font-medium text-sm">{s.name}</p><p className="text-xs text-gray-400 capitalize">{s.role} · {s.department}</p></td>
                    <td className="table-td text-center text-green-600 font-semibold">{s.present || 0}</td>
                    <td className="table-td text-center text-red-500 font-semibold">{s.absent || 0}</td>
                    <td className="table-td text-center text-yellow-600 font-semibold">{s.late || 0}</td>
                    <td className="table-td text-center text-blue-600 font-semibold">{s.on_leave || 0}</td>
                    <td className="table-td text-center text-purple-600 font-semibold">{s.od || 0}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2 min-w-28">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full transition-all ${pctBg(pct)}`} style={{ width: `${Math.min(pct,100)}%` }} />
                        </div>
                        <span className={`text-sm font-bold w-12 text-right ${pctColor(pct)}`}>{s.total_records > 0 ? `${pct}%` : '—'}</span>
                      </div>
                      {s.total_records > 0 && pct < 75 && <span className="text-xs text-red-500 font-medium">Below threshold</span>}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
        {!loading && !filtered.length && <p className="text-center py-10 text-gray-400">No records for this period</p>}
      </div>
    </div>
  );
}

// ── Regularization ────────────────────────────────────────────────────────────
function Regularization() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const canApprove = ['admin','registrar','hod'].includes(user.role);

  const load = async () => { setLoading(true); const r = await api.get('/staff-attendance/regularization'); setRequests(r.data); setLoading(false); };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Request correction of wrong attendance entries</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><RotateCcw className="w-4 h-4" /> Request Regularization</button>
      </div>
      <div className="space-y-3">
        {loading ? <div className="card text-center py-10"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
          : requests.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  {canApprove && <p className="font-bold text-sm">{r.name}</p>}
                  <p className="text-sm text-gray-600 mt-0.5">Date: <strong>{new Date(r.date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</strong> → Change to: <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusCfg[r.requested_status]?.color || 'bg-gray-100 text-gray-600'}`}>{statusCfg[r.requested_status]?.label || r.requested_status}</span></p>
                  <p className="text-sm text-gray-500 mt-1">Reason: {r.reason}</p>
                  {r.remarks && <p className="text-xs text-gray-400 mt-1">Remarks: {r.remarks}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${r.status==='pending'?'bg-yellow-100 text-yellow-700 border-yellow-200':r.status==='approved'?'bg-green-100 text-green-700 border-green-200':'bg-red-100 text-red-700 border-red-200'}`}>{r.status}</span>
                  {canApprove && r.status === 'pending' && (
                    <>
                      <button onClick={async () => { await api.put(`/staff-attendance/regularization/${r.id}`, { status:'approved' }); toast.success('Approved'); load(); }} className="btn-primary py-1 px-3 text-xs"><CheckCircle className="w-3 h-3" /> Approve</button>
                      <button onClick={async () => { const rem = window.prompt('Rejection reason:') || ''; await api.put(`/staff-attendance/regularization/${r.id}`, { status:'rejected', remarks: rem }); toast.success('Rejected'); load(); }} className="btn-danger py-1 px-3 text-xs"><XCircle className="w-3 h-3" /> Reject</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        {!loading && !requests.length && <div className="card text-center py-10 text-gray-400">No regularization requests</div>}
      </div>
      {showAdd && <RegularizationModal onClose={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function RegularizationModal({ onClose }) {
  const [form, setForm] = useState({ date:'', requested_status:'present', reason:'' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/staff-attendance/regularization', form); toast.success('Request submitted'); onClose(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Request Attendance Correction</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Date *</label><input required type="date" value={form.date} onChange={e => set('date', e.target.value)} max={new Date().toISOString().split('T')[0]} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Correct Status *</label>
            <select value={form.requested_status} onChange={e => set('requested_status', e.target.value)} className="select-field">
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Reason *</label><textarea required value={form.reason} onChange={e => set('reason', e.target.value)} className="input-field" rows={3} placeholder="Explain why attendance needs correction..." /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Request'}</button></div>
        </form>
      </div>
    </div>
  );
}
