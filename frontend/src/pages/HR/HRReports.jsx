import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart3, Users, Calendar, ClipboardList, TrendingUp, Download } from 'lucide-react';

export default function HRReports() {
  const [stats, setStats] = useState(null);
  const [leaveStats, setLeaveStats] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get('/hr/stats'),
      api.get('/leaves', { params: { limit: 200 } }).catch(() => ({ data: [] })),
      api.get('/staff-attendance', { params: { month: new Date().toISOString().slice(0,7) } }).catch(() => ({ data: [] })),
    ]).then(([s, l, a]) => {
      setStats(s.data);
      const byType = l.data.reduce((acc, r) => { acc[r.leave_type] = (acc[r.leave_type]||0)+1; return acc; }, {});
      setLeaveStats(Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a,b)=>b.count-a.count));
      const byDept = a.data.reduce((acc, r) => {
        if (!acc[r.department]) acc[r.department] = { total:0, present:0 };
        acc[r.department].total++;
        if (r.status === 'present') acc[r.department].present++;
        return acc;
      }, {});
      setAttendanceStats(Object.entries(byDept).map(([dept,v]) => ({ dept, ...v, pct: v.total>0?Math.round(v.present/v.total*100):0 })).sort((a,b)=>b.pct-a.pct));
    }).finally(() => setLoading(false));
  }, []);

  const reports = [
    { id:'overview',    label:'HR Overview',      icon: BarChart3 },
    { id:'leave',       label:'Leave Report',      icon: Calendar },
    { id:'attendance',  label:'Attendance Report', icon: ClipboardList },
  ];

  if (loading) return <div className="p-8 text-center text-gray-400">Loading reports…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">HR Reports</h1>
        <p className="text-gray-500 text-sm mt-1">Attendance, leave and workforce analytics</p>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
        {reports.map(r => (
          <button key={r.id} onClick={() => setActiveReport(r.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${activeReport===r.id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            <r.icon className="w-4 h-4" />{r.label}
          </button>
        ))}
      </div>

      {activeReport === 'overview' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['Total Staff', stats.totalStaff||0,'text-msrim-blue'],['Faculty',stats.byRole?.find(r=>r.role==='faculty')?.count||0,'text-green-600'],['Admin Staff',stats.byRole?.find(r=>r.role==='staff')?.count||0,'text-orange-600'],['Pending Leaves',stats.pendingLeaves||0,'text-yellow-600']].map(([l,v,c])=>(
              <div key={l} className="card p-4"><p className="text-gray-400 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
            ))}
          </div>
          {stats.byRole && (
            <div className="card p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-msrim-blue" />Staff by Role</h3>
              <div className="space-y-2">
                {stats.byRole.map(r => (
                  <div key={r.role} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-24 capitalize">{r.role}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-msrim-blue h-2 rounded-full" style={{width:`${Math.min((r.count/(stats.totalStaff||1))*100,100)}%`}} />
                    </div>
                    <span className="text-sm font-bold text-gray-800 w-8 text-right">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeReport === 'leave' && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b"><h3 className="font-semibold">Leave Applications by Type</h3></div>
            <div className="p-4 space-y-3">
              {leaveStats.length > 0 ? leaveStats.map(l => (
                <div key={l.type} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-40 capitalize">{l.type?.replace(/_/g,' ')}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3">
                    <div className="bg-msrim-orange h-3 rounded-full" style={{width:`${Math.min((l.count/Math.max(...leaveStats.map(x=>x.count)))*100,100)}%`}} />
                  </div>
                  <span className="text-sm font-bold w-8 text-right">{l.count}</span>
                </div>
              )) : <p className="text-gray-400 text-sm">No leave data available.</p>}
            </div>
          </div>
        </div>
      )}

      {activeReport === 'attendance' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold">Attendance by Department — {new Date().toLocaleString('default',{month:'long',year:'numeric'})}</h3></div>
          {attendanceStats.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="table-th">Department</th><th className="table-th text-center">Total Days</th>
                  <th className="table-th text-center">Present</th><th className="table-th text-center">Attendance %</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {attendanceStats.map(d => (
                    <tr key={d.dept} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{d.dept}</td>
                      <td className="table-td text-center">{d.total}</td>
                      <td className="table-td text-center text-green-600 font-bold">{d.present}</td>
                      <td className="table-td text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${d.pct>=75?'bg-green-100 text-green-700':d.pct>=50?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{d.pct}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="p-6 text-gray-400 text-sm">No attendance data for this month.</p>}
        </div>
      )}
    </div>
  );
}
