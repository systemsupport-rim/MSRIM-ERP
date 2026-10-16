import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Clock, Save, Download, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat'];
const STATUS_COLORS = { P:'bg-green-100 text-green-700', A:'bg-red-100 text-red-700', HD:'bg-yellow-100 text-yellow-700', L:'bg-blue-100 text-blue-700', WO:'bg-gray-100 text-gray-500' };

export default function AttendanceV2() {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dept, setDept] = useState('');
  const [depts, setDepts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState({});
  const [tab, setTab] = useState('grid');

  useEffect(() => {
    api.get('/students').catch(() => ({ data: [] }));
    api.get('/auth/users').then(r => {
      const all = r.data.filter(u => ['faculty','staff','registrar','hod','accounts','librarian','placement'].includes(u.role) && u.is_active);
      setStaff(all);
      setDepts([...new Set(all.map(u => u.department).filter(Boolean))].sort());
    }).catch(() => {});
    fetchRecords();
  }, [month]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const r = await api.get('/staff-attendance', { params: { month } });
      setRecords(r.data || []);
    } catch { setRecords([]); }
    finally { setLoading(false); }
  }

  const getDays = () => {
    const [y, m] = month.split('-').map(Number);
    const days = [];
    const d = new Date(y, m - 1, 1);
    while (d.getMonth() === m - 1) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const filteredStaff = dept ? staff.filter(s => s.department === dept) : staff;

  const getStatus = (userId, dateStr) => {
    const key = `${userId}_${dateStr}`;
    if (edits[key]) return edits[key];
    const rec = records.find(r => r.user_id === userId && r.date === dateStr);
    return rec?.status || '';
  };

  const setStatus = (userId, dateStr, status) => {
    setEdits(prev => ({ ...prev, [`${userId}_${dateStr}`]: status }));
  };

  async function saveAll() {
    if (!Object.keys(edits).length) return toast.error('No changes to save.');
    setSaving(true);
    try {
      const entries = Object.entries(edits).map(([key, status]) => {
        const [userId, date] = key.split('_');
        return { user_id: parseInt(userId), date, status };
      });
      await api.post('/staff-attendance/bulk', { entries });
      toast.success(`${entries.length} records saved.`);
      setEdits({});
      fetchRecords();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  const days = getDays();
  const canManage = ['admin','registrar','hod'].includes(user.role);

  const summaryData = filteredStaff.map(s => {
    let P=0,A=0,HD=0,L=0;
    days.forEach(d => {
      const st = getStatus(s.id, d.toISOString().slice(0,10));
      if (st==='present') P++; else if (st==='absent') A++; else if (st==='half-day') HD++; else if (st==='leave') L++;
    });
    return { ...s, P, A, HD, L, total: P+A+HD+L, pct: days.length > 0 ? Math.round((P+HD*0.5)/days.length*100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance Management V2</h1>
          <p className="text-gray-500 text-sm mt-1">Monthly staff attendance grid with bulk marking</p>
        </div>
        {canManage && Object.keys(edits).length > 0 && (
          <button onClick={saveAll} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : `Save ${Object.keys(edits).length} changes`}
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input-field w-40" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <select value={dept} onChange={e => setDept(e.target.value)} className="select-field w-52">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          {['grid','summary'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t?'bg-msrim-blue text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t==='grid'?'Attendance Grid':'Summary'}</button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-400 flex gap-4 flex-wrap">
        {[['P','Present','bg-green-100 text-green-700'],['A','Absent','bg-red-100 text-red-700'],['HD','Half Day','bg-yellow-100 text-yellow-700'],['L','Leave','bg-blue-100 text-blue-700'],['WO','Week Off','bg-gray-100 text-gray-500']].map(([k,l,c]) => (
          <span key={k} className={`px-2 py-0.5 rounded font-medium ${c}`}>{k} = {l}</span>
        ))}
      </div>

      {tab === 'grid' ? (
        <div className="card p-0 overflow-auto">
          {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : (
            <table className="text-xs min-w-max">
              <thead className="bg-gray-50 border-b sticky top-0">
                <tr>
                  <th className="table-th sticky left-0 bg-gray-50 z-10 min-w-[160px]">Staff</th>
                  {days.map(d => (
                    <th key={d.toISOString()} className={`table-th text-center min-w-[36px] ${[0,6].includes(d.getDay())?'bg-gray-100':''}`}>
                      <div>{DAYS[(d.getDay()+6)%7]}</div>
                      <div className="font-bold">{d.getDate()}</div>
                    </th>
                  ))}
                  <th className="table-th text-center">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredStaff.slice(0,50).map(s => {
                  let present = 0;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium sticky left-0 bg-white z-10">
                        <p className="truncate max-w-[140px]">{s.name}</p>
                        <p className="text-gray-400 text-xs truncate">{s.department}</p>
                      </td>
                      {days.map(d => {
                        const ds = d.toISOString().slice(0,10);
                        const isWeekend = [0,6].includes(d.getDay());
                        const st = getStatus(s.id, ds);
                        const changed = !!edits[`${s.id}_${ds}`];
                        if (st === 'present') present++;
                        return (
                          <td key={ds} className={`table-td text-center p-1 ${isWeekend?'bg-gray-50':''}`}>
                            {canManage ? (
                              <select value={st} onChange={e => setStatus(s.id, ds, e.target.value)}
                                className={`text-xs border-0 outline-none rounded px-0.5 py-0.5 cursor-pointer ${changed?'ring-1 ring-msrim-orange':''} ${STATUS_COLORS[st==='present'?'P':st==='absent'?'A':st==='half-day'?'HD':st==='leave'?'L':'WO']||'bg-transparent'}`}
                                style={{width:'36px'}}>
                                <option value="">—</option>
                                <option value="present">P</option>
                                <option value="absent">A</option>
                                <option value="half-day">HD</option>
                                <option value="leave">L</option>
                                <option value="week-off">WO</option>
                              </select>
                            ) : (
                              <span className={`px-1 rounded ${STATUS_COLORS[st==='present'?'P':st==='absent'?'A':st==='half-day'?'HD':st==='leave'?'L':'WO']||''}`}>{st==='present'?'P':st==='absent'?'A':st==='half-day'?'HD':st==='leave'?'L':st?'WO':'—'}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="table-td text-center font-bold text-xs">{days.length>0?Math.round(present/days.length*100):0}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="table-th">Staff</th><th className="table-th">Dept</th>
                <th className="table-th text-center text-green-600">Present</th>
                <th className="table-th text-center text-red-600">Absent</th>
                <th className="table-th text-center text-yellow-600">Half Day</th>
                <th className="table-th text-center text-blue-600">Leave</th>
                <th className="table-th text-center">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {summaryData.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td text-xs text-gray-500">{s.department}</td>
                  <td className="table-td text-center font-bold text-green-600">{s.P}</td>
                  <td className="table-td text-center font-bold text-red-600">{s.A}</td>
                  <td className="table-td text-center font-bold text-yellow-600">{s.HD}</td>
                  <td className="table-td text-center font-bold text-blue-600">{s.L}</td>
                  <td className="table-td text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.pct>=75?'bg-green-100 text-green-700':s.pct>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{s.pct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
