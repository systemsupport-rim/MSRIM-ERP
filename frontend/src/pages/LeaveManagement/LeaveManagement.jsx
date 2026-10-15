import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Calendar, Plus, CheckCircle, XCircle, Clock, AlertCircle,
  Trash2, Settings, Search, Filter, RotateCcw, ChevronDown,
  CalendarDays, Users, TrendingDown, X, Edit2, Sun
} from 'lucide-react';

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  approved:  'bg-green-100 text-green-700 border-green-200',
  rejected:  'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};
const STATUS_ICONS = { pending: Clock, approved: CheckCircle, rejected: XCircle, cancelled: RotateCcw };

export default function LeaveManagement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('my-leaves');
  const canManage = ['admin','registrar','hod'].includes(user.role);
  const isAdmin   = ['admin','registrar'].includes(user.role);

  const tabs = [
    { id: 'my-leaves',  label: 'My Leaves',          show: true },
    { id: 'approvals',  label: 'Pending Approvals',   show: canManage },
    { id: 'all-staff',  label: 'All Staff Leaves',    show: canManage },
    { id: 'balances',   label: 'Leave Balances',      show: canManage },
    { id: 'holidays',   label: 'Holiday Calendar',    show: true },
    { id: 'leave-types',label: 'Leave Types',         show: isAdmin },
  ].filter(t => t.show);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="w-6 h-6 text-msrim-blue" /> Leave Management</h1>
          <p className="text-gray-500 text-sm mt-1">Apply, track & manage all leave for faculty and staff</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'my-leaves'   && <MyLeaves />}
      {tab === 'approvals'   && <PendingApprovals />}
      {tab === 'all-staff'   && <AllStaffLeaves />}
      {tab === 'balances'    && <LeaveBalances />}
      {tab === 'holidays'    && <HolidayCalendar isAdmin={isAdmin} />}
      {tab === 'leave-types' && <LeaveTypes />}
    </div>
  );
}

// ── My Leaves ─────────────────────────────────────────────────────────────────
function MyLeaves() {
  const { user } = useAuth();
  const [leaves,    setLeaves]    = useState([]);
  const [balances,  setBalances]  = useState([]);
  const [leaveTypes,setLeaveTypes]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const load = async () => {
    setLoading(true);
    const [l, b, lt] = await Promise.all([
      api.get('/leaves'),
      api.get('/leaves/balances'),
      api.get('/leaves/types'),
    ]);
    setLeaves(l.data); setBalances(b.data); setLeaveTypes(lt.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const displayed = filterStatus ? leaves.filter(l => l.status === filterStatus) : leaves;
  const onLeaveToday = leaves.find(l => {
    const today = new Date().toISOString().split('T')[0];
    return l.status === 'approved' && l.from_date <= today && l.to_date >= today;
  });

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {balances.map(b => (
          <div key={b.id} className="card p-3 border-t-4" style={{ borderTopColor: b.color }}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{b.code}</p>
            <p className="text-xl font-black mt-1" style={{ color: b.color }}>{b.available}</p>
            <p className="text-xs text-gray-400">of {b.total_days} left</p>
            <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
              <div className="h-1 rounded-full" style={{ width: `${b.total_days > 0 ? (b.used_days / b.total_days) * 100 : 0}%`, backgroundColor: b.color }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{b.used_days} used · {b.pending_days} pending</p>
          </div>
        ))}
      </div>

      {onLeaveToday && (
        <div className="card bg-blue-50 border-blue-200 border flex items-center gap-3">
          <Sun className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">You are currently on <strong>{onLeaveToday.type_name}</strong> leave today.</p>
        </div>
      )}

      {/* Actions & filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          {['','pending','approved','rejected','cancelled'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${filterStatus === s ? 'bg-msrim-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowApply(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Apply Leave
        </button>
      </div>

      {/* Leave history */}
      <div className="space-y-3">
        {loading ? <div className="card text-center py-10"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
          : displayed.map(l => <LeaveCard key={l.id} leave={l} onRefresh={load} showApplicant={false} />)}
        {!loading && !displayed.length && <div className="card text-center py-12 text-gray-400">No leave applications found</div>}
      </div>

      {showApply && <ApplyLeaveModal leaveTypes={leaveTypes} onClose={() => { setShowApply(false); load(); }} />}
    </div>
  );
}

// ── Pending Approvals ─────────────────────────────────────────────────────────
function PendingApprovals() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await api.get('/leaves', { params: { status: 'pending' } });
    setLeaves(r.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600" />
        <h2 className="font-semibold text-gray-800">{leaves.length} pending approval{leaves.length !== 1 ? 's' : ''}</h2>
      </div>
      {loading ? <div className="card text-center py-10"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        : leaves.map(l => <LeaveCard key={l.id} leave={l} onRefresh={load} showApplicant={true} showActions={true} />)}
      {!loading && !leaves.length && <div className="card text-center py-12 text-gray-400 flex flex-col items-center gap-2"><CheckCircle className="w-10 h-10 text-green-300" /><p>No pending approvals — all clear!</p></div>}
    </div>
  );
}

// ── All Staff Leaves ──────────────────────────────────────────────────────────
function AllStaffLeaves() {
  const [leaves,   setLeaves]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [status,   setStatus]   = useState('');
  const [month,    setMonth]    = useState('');

  const load = async () => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (month) params.from_date = `${month}-01`;
    const r = await api.get('/leaves', { params });
    setLeaves(r.data); setLoading(false);
  };
  useEffect(() => { load(); }, [status, month]);

  const filtered = search ? leaves.filter(l => l.applicant_name?.toLowerCase().includes(search.toLowerCase())) : leaves;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-36" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          {['pending','approved','rejected','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="month" className="input-field w-44" value={month} onChange={e => setMonth(e.target.value)} />
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-th">Staff</th><th className="table-th">Leave Type</th>
              <th className="table-th">From</th><th className="table-th">To</th>
              <th className="table-th">Days</th><th className="table-th">Status</th>
              <th className="table-th">Applied On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="py-10 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              : filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium text-sm">{l.applicant_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{l.role} · {l.department}</p>
                  </td>
                  <td className="table-td">
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: l.color || '#6b7280' }}>{l.leave_type}</span>
                  </td>
                  <td className="table-td text-sm">{new Date(l.from_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                  <td className="table-td text-sm">{new Date(l.to_date).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</td>
                  <td className="table-td font-semibold text-center">{l.days}</td>
                  <td className="table-td"><span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[l.status]}`}>{l.status}</span></td>
                  <td className="table-td text-xs text-gray-400">{new Date(l.created_at).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && !filtered.length && <p className="text-center py-10 text-gray-400">No records found</p>}
      </div>
    </div>
  );
}

// ── Leave Balances ────────────────────────────────────────────────────────────
function LeaveBalances() {
  const [staff,    setStaff]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [editing,  setEditing]  = useState(null);
  const [leaveTypes,setLeaveTypes] = useState([]);

  const load = async () => {
    setLoading(true);
    const [s, lt] = await Promise.all([api.get('/leaves/balances/all'), api.get('/leaves/types')]);
    setStaff(s.data); setLeaveTypes(lt.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = search ? staff.filter(s => s.name.toLowerCase().includes(search.toLowerCase())) : staff;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <p className="text-sm text-gray-500">{staff.length} staff members · {leaveTypes.length} leave types</p>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-th min-w-40">Staff Member</th>
                {leaveTypes.filter(lt => lt.is_active).map(lt => (
                  <th key={lt.id} className="table-th text-center min-w-20">
                    <span className="px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: lt.color }}>{lt.code}</span>
                  </th>
                ))}
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={20} className="py-10 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td">
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{s.role}</p>
                    </td>
                    {leaveTypes.filter(lt => lt.is_active).map(lt => {
                      const bal = s.balances?.find(b => b.code === lt.code);
                      const avail = bal ? bal.available : 0;
                      return (
                        <td key={lt.id} className="table-td text-center">
                          {bal ? (
                            <span className={`text-sm font-bold ${avail <= 0 ? 'text-red-500' : avail <= 2 ? 'text-yellow-600' : 'text-gray-700'}`}>
                              {avail}<span className="text-xs text-gray-400">/{bal.total}</span>
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                    <td className="table-td">
                      <button onClick={() => setEditing(s)} className="btn-secondary py-1 px-3 text-xs"><Edit2 className="w-3 h-3" /> Edit</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing && <EditBalanceModal staff={editing} leaveTypes={leaveTypes} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

// ── Holiday Calendar ──────────────────────────────────────────────────────────
function HolidayCalendar({ isAdmin }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = async () => {
    setLoading(true);
    const r = await api.get('/leaves/holidays', { params: { year } });
    setHolidays(r.data); setLoading(false);
  };
  useEffect(() => { load(); }, [year]);

  const typeColor = { public:'bg-red-100 text-red-700', restricted:'bg-yellow-100 text-yellow-700', optional:'bg-blue-100 text-blue-700', institutional:'bg-purple-100 text-purple-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear(y => y-1)} className="btn-secondary py-1 px-3 text-sm">←</button>
          <span className="font-bold text-lg w-16 text-center">{year}</span>
          <button onClick={() => setYear(y => y+1)} className="btn-secondary py-1 px-3 text-sm">→</button>
          <span className="text-gray-500 text-sm">{holidays.length} holidays</span>
        </div>
        {isAdmin && <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Holiday</button>}
      </div>
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr><th className="table-th">Date</th><th className="table-th">Day</th><th className="table-th">Holiday</th><th className="table-th">Type</th>{isAdmin && <th className="table-th">Actions</th>}</tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={5} className="py-10 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              : holidays.map(h => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{new Date(h.date).toLocaleDateString('en-IN',{day:'numeric',month:'long'})}</td>
                  <td className="table-td text-gray-500">{new Date(h.date).toLocaleDateString('en-IN',{weekday:'long'})}</td>
                  <td className="table-td"><p className="font-medium">{h.title}</p>{h.description && <p className="text-xs text-gray-400">{h.description}</p>}</td>
                  <td className="table-td"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeColor[h.type] || 'bg-gray-100 text-gray-600'}`}>{h.type}</span></td>
                  {isAdmin && <td className="table-td"><button onClick={async () => { if (!window.confirm('Remove this holiday?')) return; await api.delete(`/leaves/holidays/${h.id}`); load(); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>}
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && !holidays.length && <p className="text-center py-10 text-gray-400">No holidays added for {year}</p>}
      </div>
      {showAdd && <AddHolidayModal onClose={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

// ── Leave Types Management ────────────────────────────────────────────────────
function LeaveTypes() {
  const [types,   setTypes]   = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => { const r = await api.get('/leaves/types'); setTypes(r.data); };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{types.length} leave types configured</p>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Leave Type</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map(t => (
          <div key={t.id} className={`card border-l-4 ${t.is_active ? '' : 'opacity-50'}`} style={{ borderLeftColor: t.color }}>
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded text-xs font-bold text-white" style={{ backgroundColor: t.color }}>{t.code}</span>
                <h3 className="font-semibold mt-1">{t.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(t)} className="p-1.5 hover:bg-gray-100 rounded-lg"><Edit2 className="w-3.5 h-3.5 text-gray-400" /></button>
                <button onClick={async () => {
                  if (!window.confirm(`Delete "${t.name}" leave type?`)) return;
                  try { await api.delete(`/leaves/types/${t.id}`); toast.success('Deleted'); load(); }
                  catch (e) { toast.error(e.response?.data?.error || 'Cannot delete'); }
                }} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Max Days/Year</p><p className="font-bold">{t.max_days_per_year || 'Unlimited'}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-gray-400">Type</p><p className="font-bold">{t.is_paid ? '💰 Paid' : '⚠️ Unpaid'}</p></div>
              {t.carry_forward ? <div className="bg-gray-50 rounded-lg p-2 col-span-2"><p className="text-gray-400">Carry Forward</p><p className="font-bold">Up to {t.max_carry_forward} days</p></div> : null}
            </div>
            {!t.is_active && <span className="badge-red mt-2 inline-block text-xs">Inactive</span>}
          </div>
        ))}
      </div>
      {showAdd && <LeaveTypeModal onClose={() => { setShowAdd(false); load(); }} />}
      {editing && <LeaveTypeModal type={editing} onClose={() => { setEditing(null); load(); }} />}
    </div>
  );
}

// ── Reusable Leave Card ───────────────────────────────────────────────────────
function LeaveCard({ leave: l, onRefresh, showApplicant, showActions }) {
  const { user } = useAuth();
  const Icon = STATUS_ICONS[l.status] || Clock;
  const canCancel = (l.user_id === user.id || ['admin','registrar'].includes(user.role)) && ['pending','approved'].includes(l.status);

  return (
    <div className={`card border-l-4`} style={{ borderLeftColor: l.color || '#6b7280' }}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1">
          {showApplicant && <p className="font-bold text-gray-800">{l.applicant_name} <span className="text-xs font-normal text-gray-400 capitalize">({l.role})</span></p>}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: l.color || '#6b7280' }}>{l.leave_type} {l.type_name && `— ${l.type_name}`}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${STATUS_COLORS[l.status]}`}>
              <Icon className="w-3 h-3" />{l.status}
            </span>
            <span className="text-sm font-semibold text-gray-700">{l.days} day{l.days !== 1 ? 's' : ''}</span>
            {l.is_paid === 0 && <span className="badge-red text-xs">Unpaid</span>}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            <CalendarDays className="w-3.5 h-3.5 inline mr-1 text-gray-400" />
            {new Date(l.from_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})} — {new Date(l.to_date).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
          </p>
          {l.reason && <p className="text-sm text-gray-500 mt-1 italic">"{l.reason}"</p>}
          {l.remarks && <p className="text-xs text-gray-400 mt-1">Remarks: {l.remarks}</p>}
          {l.approved_by_name && <p className="text-xs text-gray-400 mt-1">Actioned by: {l.approved_by_name}</p>}
        </div>
        <div className="flex flex-col gap-2 items-end">
          {showActions && l.status === 'pending' && (
            <div className="flex gap-2">
              <button onClick={async () => { try { await api.put(`/leaves/${l.id}/action`, { status:'approved' }); toast.success('Leave approved'); onRefresh(); } catch(e) { toast.error(e.response?.data?.error || 'Failed'); } }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                <CheckCircle className="w-3 h-3" /> Approve
              </button>
              <button onClick={async () => { const remarks = window.prompt('Rejection reason (optional):'); await api.put(`/leaves/${l.id}/action`, { status:'rejected', remarks: remarks||'' }); toast.success('Leave rejected'); onRefresh(); }}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </div>
          )}
          {canCancel && (
            <button onClick={async () => { if (!window.confirm('Cancel this leave application?')) return; try { await api.put(`/leaves/${l.id}/cancel`); toast.success('Leave cancelled'); onRefresh(); } catch(e) { toast.error(e.response?.data?.error || 'Failed'); } }}
              className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors">
              <X className="w-3 h-3" /> Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Apply Leave Modal ─────────────────────────────────────────────────────────
function ApplyLeaveModal({ leaveTypes, onClose }) {
  const [form, setForm] = useState({ leave_type:'', from_date:'', to_date:'', days:'1', reason:'' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.from_date && form.to_date) {
      const from = new Date(form.from_date), to = new Date(form.to_date);
      const diff = Math.max(1, Math.round((to - from) / 86400000) + 1);
      set('days', diff.toString());
    }
  }, [form.from_date, form.to_date]);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/leaves', form); toast.success('Leave application submitted!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  const today = new Date().toISOString().split('T')[0];
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Apply for Leave</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type *</label>
            <select required value={form.leave_type} onChange={e => set('leave_type', e.target.value)} className="select-field">
              <option value="">Select leave type</option>
              {leaveTypes.filter(lt => lt.is_active).map(lt => (
                <option key={lt.id} value={lt.code}>{lt.code} — {lt.name} {lt.max_days_per_year > 0 ? `(${lt.max_days_per_year} days/year)` : '(Unlimited)'}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label><input required type="date" min={today} value={form.from_date} onChange={e => set('from_date', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">To Date *</label><input required type="date" min={form.from_date || today} value={form.to_date} onChange={e => set('to_date', e.target.value)} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label><input type="number" step="0.5" min="0.5" value={form.days} onChange={e => set('days', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label><textarea required value={form.reason} onChange={e => set('reason', e.target.value)} className="input-field" rows={3} placeholder="Brief reason for leave..." /></div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Application'}</button></div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Balance Modal ────────────────────────────────────────────────────────
function EditBalanceModal({ staff, leaveTypes, onClose }) {
  const [balances, setBalances] = useState([]);
  const year = new Date().getFullYear();

  useEffect(() => {
    api.get('/leaves/balances', { params: { user_id: staff.id } }).then(r => setBalances(r.data));
  }, [staff.id]);

  async function save(ltId, days) {
    try { await api.put(`/leaves/balances/${staff.id}/${ltId}`, { total_days: days, year }); toast.success('Balance updated'); }
    catch (e) { toast.error('Failed'); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div><h2 className="font-bold text-xl">Edit Leave Balances</h2><p className="text-sm text-gray-500">{staff.name} · {year}</p></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-3">
          {leaveTypes.filter(lt => lt.is_active).map(lt => {
            const bal = balances.find(b => b.code === lt.code);
            return (
              <div key={lt.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <span className="px-2 py-0.5 rounded text-xs font-bold text-white w-12 text-center" style={{ backgroundColor: lt.color }}>{lt.code}</span>
                <span className="flex-1 text-sm font-medium">{lt.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Total:</span>
                  <input type="number" defaultValue={bal?.total_days ?? lt.max_days_per_year} min="0" max="365"
                    onBlur={e => save(lt.id, parseFloat(e.target.value))}
                    className="w-16 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-msrim-blue" />
                  {bal && <span className="text-xs text-gray-400">Used: <strong>{bal.used_days}</strong></span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="p-6 pt-0 flex justify-end"><button onClick={onClose} className="btn-primary">Done</button></div>
      </div>
    </div>
  );
}

// ── Add Holiday Modal ─────────────────────────────────────────────────────────
function AddHolidayModal({ onClose }) {
  const [form, setForm] = useState({ title:'', date:'', type:'public', description:'' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/leaves/holidays', form); toast.success('Holiday added'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Holiday</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e => set('title', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Date *</label><input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className="select-field">
              {['public','restricted','optional','institutional'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Description</label><input value={form.description} onChange={e => set('description', e.target.value)} className="input-field" /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Holiday'}</button></div>
        </form>
      </div>
    </div>
  );
}

// ── Leave Type Modal (add/edit) ───────────────────────────────────────────────
function LeaveTypeModal({ type, onClose }) {
  const [form, setForm] = useState(type ? { ...type } : { code:'', name:'', max_days_per_year:0, is_paid:1, carry_forward:0, max_carry_forward:0, color:'#3b82f6', description:'', applicable_to:'all', is_active:1 });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (type) { await api.put(`/leaves/types/${type.id}`, form); toast.success('Leave type updated'); }
      else { await api.post('/leaves/types', form); toast.success('Leave type created'); }
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">{type ? 'Edit' : 'Add'} Leave Type</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Code * (e.g. CL)</label><input required value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} className="input-field font-mono" disabled={!!type} /></div>
          <div><label className="block text-sm font-medium mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Max Days/Year (0 = unlimited)</label><input type="number" min="0" value={form.max_days_per_year} onChange={e => set('max_days_per_year', parseInt(e.target.value))} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Color</label><div className="flex gap-2"><input type="color" value={form.color} onChange={e => set('color', e.target.value)} className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer" /><input value={form.color} onChange={e => set('color', e.target.value)} className="input-field flex-1 font-mono text-sm" /></div></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><input value={form.description} onChange={e => set('description', e.target.value)} className="input-field" /></div>
          <div className="flex items-center gap-2 col-span-1"><input type="checkbox" id="paid" checked={!!form.is_paid} onChange={e => set('is_paid', e.target.checked ? 1 : 0)} /><label htmlFor="paid" className="text-sm">Paid Leave</label></div>
          <div className="flex items-center gap-2 col-span-1"><input type="checkbox" id="cf" checked={!!form.carry_forward} onChange={e => set('carry_forward', e.target.checked ? 1 : 0)} /><label htmlFor="cf" className="text-sm">Allow Carry Forward</label></div>
          {form.carry_forward ? <div className="col-span-2"><label className="block text-sm font-medium mb-1">Max Carry Forward Days</label><input type="number" min="0" value={form.max_carry_forward} onChange={e => set('max_carry_forward', parseInt(e.target.value))} className="input-field" /></div> : null}
          <div className="flex items-center gap-2 col-span-1"><input type="checkbox" id="active" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked ? 1 : 0)} /><label htmlFor="active" className="text-sm">Active</label></div>
          <div className="col-span-2 flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : (type ? 'Update' : 'Create')}</button></div>
        </form>
      </div>
    </div>
  );
}
