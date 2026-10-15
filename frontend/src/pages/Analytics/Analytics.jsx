import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Brain, TrendingUp, AlertCircle } from 'lucide-react';

const COLORS = ['#003087','#1e56a0','#f97316','#10b981','#6366f1','#ec4899','#f59e0b'];

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [exams, setExams] = useState(null);
  const [placement, setPlacement] = useState(null);
  const [fees, setFees] = useState(null);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/attendance-trends'),
      api.get('/analytics/exam-analytics'),
      api.get('/analytics/placement-analytics'),
      api.get('/analytics/fee-analytics'),
      api.get('/analytics/audit-logs')
    ]).then(([ov, att, ex, pl, fe, lg]) => {
      setOverview(ov.data); setAttendance(att.data); setExams(ex.data); setPlacement(pl.data); setFees(fe.data); setLogs(lg.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div>;

  const tabs = ['overview','attendance','examinations','placements','fees','audit-logs'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics & Business Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">Comprehensive data insights for MSRIM</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
        {tabs.map(t => <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 rounded-md text-sm font-medium capitalize ${tab===t?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{t.replace('-',' ')}</button>)}
      </div>

      {tab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[['Students',overview.students,'text-msrim-blue'],['Faculty',overview.faculty,'text-green-600'],['Courses',overview.courses,'text-msrim-orange'],['Placed',overview.placed,'text-purple-600'],['Avg Attend.',`${overview.avgAttendance}%`,'text-indigo-600']].map(([l,v,c]) => (
              <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold mb-2">Campus Activity</h3>
              {[['Fee Collected',`₹${((overview.feeCollected||0)/100000).toFixed(1)}L`],['Library Issued',overview.libraryIssued],['Open Help Tickets',overview.helpOpen],['Feed Posts',overview.feedPosts],['LMS Resources',overview.lmsResources]].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2 border-b last:border-0">
                  <span className="text-sm text-gray-500">{k}</span>
                  <span className="text-sm font-semibold">{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h3 className="font-semibold mb-3">Attendance Alert</h3>
              {attendance?.lowAttendance?.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-600 mb-2"><AlertCircle className="w-4 h-4" /><span className="text-sm font-medium">{attendance.lowAttendance.length} students below 75%</span></div>
                  {attendance.lowAttendance.slice(0,5).map(s => (
                    <div key={s.enrollment_number} className="flex justify-between items-center py-1.5 border-b last:border-0">
                      <div><p className="text-sm font-medium">{s.name}</p><p className="text-xs text-gray-400">{s.enrollment_number}</p></div>
                      <span className="badge-red">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-green-600 text-sm">All students above minimum attendance</p>}
            </div>
          </div>
        </div>
      )}

      {tab === 'attendance' && attendance && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Attendance by Course</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendance.byCourse} layout="vertical">
                <XAxis type="number" domain={[0,100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="code" tick={{ fontSize: 11 }} width={100} />
                <Tooltip formatter={v => [`${v}%`, 'Attendance']} />
                <Bar dataKey="percentage" radius={[0,4,4,0]}>
                  {attendance.byCourse?.map((s,i) => <Cell key={i} fill={s.percentage < 75 ? '#ef4444' : '#003087'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Daily Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendance.byDate?.slice(0,15).reverse()}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis domain={[0,100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [`${v}%`, 'Avg Attendance']} />
                <Line type="monotone" dataKey="percentage" stroke="#003087" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'examinations' && exams && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Grade Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={exams.gradeDistribution}>
                <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [v, 'Students']} />
                <Bar dataKey="count" fill="#003087" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Average Marks by Course</h3>
            {exams.avgByCourse?.map(c => (
              <div key={c.code} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-gray-400">{c.code} · {c.students} students</p></div>
                <span className="font-bold text-msrim-blue">{c.avg_marks}</span>
              </div>
            ))}
            <div className="mt-3 p-3 bg-green-50 rounded-lg"><p className="text-green-700 font-medium">Pass Rate: {exams.passRate?.pass_rate}%</p></div>
          </div>
        </div>
      )}

      {tab === 'placements' && placement && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Application Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={placement.byStatus} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({status, count}) => `${status}: ${count}`}>
                  {placement.byStatus?.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Top Recruiters</h3>
            {placement.byCompany?.map(c => (
              <div key={c.company_name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div><p className="text-sm font-medium">{c.company_name}</p><p className="text-xs text-gray-400">{c.applications} applications</p></div>
                <span className="badge-green">{c.selected} selected</span>
              </div>
            ))}
            {placement.avgPkg && (
              <div className="mt-3 p-3 bg-msrim-blue/5 rounded-lg space-y-1">
                <p className="text-sm"><span className="text-gray-500">Avg Package:</span> <span className="font-bold text-msrim-blue">₹{parseFloat(placement.avgPkg.avg||0).toFixed(2)} LPA</span></p>
                <p className="text-sm"><span className="text-gray-500">Highest:</span> <span className="font-bold text-green-600">₹{placement.avgPkg.max} LPA</span></p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'fees' && fees && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold mb-4">Monthly Fee Collection</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fees.monthly}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Collected']} />
                <Bar dataKey="collected" fill="#003087" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3">Payment by Mode</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={fees.byMode} dataKey="amount" nameKey="payment_mode" cx="50%" cy="50%" outerRadius={70}>
                  {fees.byMode?.map((_,i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Amount']} /><Legend />
              </PieChart>
            </ResponsiveContainer>
            {fees.defaulters?.length > 0 && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-red-600 mb-2">{fees.defaulters.length} Fee Defaulters</p>
                {fees.defaulters.slice(0,3).map(d => <p key={d.enrollment_number} className="text-xs text-gray-500">{d.name} ({d.enrollment_number})</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'audit-logs' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold">System Audit Log</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr><th className="table-th">Action</th><th className="table-th">User</th><th className="table-th">Module</th><th className="table-th">Timestamp</th></tr></thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((l, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{l.action}</td>
                    <td className="table-td">{l.user}</td>
                    <td className="table-td"><span className="badge-blue">{l.module}</span></td>
                    <td className="table-td text-xs text-gray-400">{new Date(l.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
                {!logs.length && <tr><td colSpan={4} className="table-td text-center py-8 text-gray-400">No audit logs</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
