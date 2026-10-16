import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Users, TrendingUp, AlertCircle, CheckCircle, BarChart3, Calendar } from 'lucide-react';

export default function AttendanceConsole() {
  const [data, setData] = useState(null);
  const [studentStats, setStudentStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0,7));

  useEffect(() => {
    fetchData();
  }, [month]);

  async function fetchData() {
    setLoading(true);
    try {
      const [att, staff, students] = await Promise.all([
        api.get('/attendance', { params: { month } }).catch(() => ({ data: [] })),
        api.get('/staff-attendance', { params: { month } }).catch(() => ({ data: [] })),
        api.get('/students').catch(() => ({ data: [] })),
      ]);

      const studentAttendance = att.data || [];
      const staffAttendance   = staff.data || [];

      const totalStudentDays  = studentAttendance.length;
      const presentStudents   = studentAttendance.filter(a => a.status === 'present').length;
      const totalStaffDays    = staffAttendance.length;
      const presentStaff      = staffAttendance.filter(a => a.status === 'present').length;

      setData({
        studentTotal: totalStudentDays,
        studentPresent: presentStudents,
        studentPct: totalStudentDays > 0 ? Math.round((presentStudents / totalStudentDays) * 100) : 0,
        staffTotal: totalStaffDays,
        staffPresent: presentStaff,
        staffPct: totalStaffDays > 0 ? Math.round((presentStaff / totalStaffDays) * 100) : 0,
      });

      // Per-student summary
      const byStudent = studentAttendance.reduce((acc, r) => {
        if (!acc[r.student_id]) acc[r.student_id] = { name: r.student_name || r.name, total: 0, present: 0 };
        acc[r.student_id].total++;
        if (r.status === 'present') acc[r.student_id].present++;
        return acc;
      }, {});

      const summary = Object.entries(byStudent)
        .map(([id, v]) => ({ id, ...v, pct: Math.round((v.present / v.total) * 100) }))
        .sort((a, b) => a.pct - b.pct)
        .slice(0, 20);
      setStudentStats(summary);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Attendance Console</h1>
          <p className="text-gray-500 text-sm mt-1">Consolidated attendance dashboard for students and staff</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <input type="month" value={month} onChange={e => setMonth(e.target.value)} className="input-field w-40" />
        </div>
      </div>

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            ['Student Attendance', `${data.studentPct}%`, data.studentPresent + ' / ' + data.studentTotal + ' present', data.studentPct >= 75 ? 'text-green-600' : 'text-red-600'],
            ['Staff Attendance', `${data.staffPct}%`, data.staffPresent + ' / ' + data.staffTotal + ' present', data.staffPct >= 75 ? 'text-green-600' : 'text-red-600'],
            ['Low Attendance', studentStats.filter(s => s.pct < 75).length, 'Students below 75%', 'text-orange-600'],
          ].map(([l, v, sub, c]) => (
            <div key={l} className="card p-4">
              <p className="text-gray-400 text-sm">{l}</p>
              <p className={`text-3xl font-bold ${c}`}>{v}</p>
              <p className="text-xs text-gray-400 mt-1">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && studentStats.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <h3 className="font-semibold">Students Sorted by Attendance (Lowest First)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">#</th><th className="table-th">Student</th>
                <th className="table-th text-center">Present</th><th className="table-th text-center">Total</th>
                <th className="table-th text-center">Attendance %</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {studentStats.map((s, i) => (
                  <tr key={s.id} className={`hover:bg-gray-50 ${s.pct < 75 ? 'bg-red-50/30' : ''}`}>
                    <td className="table-td text-gray-400">{i + 1}</td>
                    <td className="table-td font-medium">{s.name || 'Student ' + s.id}</td>
                    <td className="table-td text-center text-green-600 font-bold">{s.present}</td>
                    <td className="table-td text-center">{s.total}</td>
                    <td className="table-td text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[60px]">
                          <div className={`h-2 rounded-full ${s.pct >= 75 ? 'bg-green-500' : s.pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${s.pct}%`}} />
                        </div>
                        <span className={`text-xs font-bold w-10 ${s.pct >= 75 ? 'text-green-600' : s.pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>{s.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <div className="p-8 text-center text-gray-400">Loading attendance data…</div>}
      {!loading && !studentStats.length && <div className="card p-8 text-center text-gray-400">No attendance data for this period.</div>}
    </div>
  );
}
