import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Download, Users, BookOpen, DollarSign, Briefcase, BookMarked } from 'lucide-react';

const COLORS = ['#003087', '#1e56a0', '#f97316', '#10b981', '#6366f1', '#ec4899', '#f59e0b', '#14b8a6'];

const TABS = [
  { id: 'summary', label: 'Summary', icon: BookOpen },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: BookOpen },
  { id: 'results', label: 'Results', icon: BookMarked },
  { id: 'fees', label: 'Fees', icon: DollarSign },
  { id: 'placements', label: 'Placements', icon: Briefcase },
];

export default function Reports() {
  const [tab, setTab] = useState('summary');
  const [studentStats, setStudentStats] = useState(null);
  const [feeStats, setFeeStats] = useState(null);
  const [placementStats, setPlacementStats] = useState(null);
  const [libStats, setLibStats] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Lazy-loaded detail reports
  const [detailData, setDetailData] = useState({});
  const [detailLoading, setDetailLoading] = useState({});

  useEffect(() => {
    Promise.all([
      api.get('/students/stats'), api.get('/fees/stats'),
      api.get('/placements/stats'), api.get('/library/stats')
    ]).then(([s, f, p, l]) => {
      setStudentStats(s.data); setFeeStats(f.data); setPlacementStats(p.data); setLibStats(l.data);
    }).finally(() => setSummaryLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'summary' || detailData[tab] || detailLoading[tab]) return;
    setDetailLoading(d => ({ ...d, [tab]: true }));
    const endpoints = {
      students: '/reports/students',
      attendance: '/reports/attendance?below=75',
      results: '/reports/results',
      fees: '/reports/fees',
      placements: '/reports/placements',
    };
    api.get(endpoints[tab]).then(r => {
      setDetailData(d => ({ ...d, [tab]: r.data }));
    }).catch(() => {}).finally(() => setDetailLoading(d => ({ ...d, [tab]: false })));
  }, [tab]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium ${tab === t.id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        summaryLoading ? <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card bg-gradient-to-br from-msrim-blue to-msrim-blue-light text-white"><p className="text-blue-100 text-sm">Total Students</p><p className="text-3xl font-bold mt-1">{studentStats?.total || 0}</p></div>
              <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white"><p className="text-green-100 text-sm">Fee Collected</p><p className="text-3xl font-bold mt-1">₹{((feeStats?.totalCollected || 0) / 100000).toFixed(1)}L</p></div>
              <div className="card bg-gradient-to-br from-msrim-orange to-orange-600 text-white"><p className="text-orange-100 text-sm">Students Placed</p><p className="text-3xl font-bold mt-1">{placementStats?.totalPlaced || 0}</p></div>
              <div className="card bg-gradient-to-br from-purple-500 to-purple-700 text-white"><p className="text-purple-100 text-sm">Library Books</p><p className="text-3xl font-bold mt-1">{libStats?.totalBooks || 0}</p></div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {studentStats?.byProgram && <div className="card"><h3 className="font-semibold mb-4">Students by Program</h3><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={studentStats.byProgram} dataKey="count" nameKey="code" cx="50%" cy="50%" outerRadius={80} label={({ code, count }) => `${code}: ${count}`}>{studentStats.byProgram.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>}
              {studentStats?.bySemester && <div className="card"><h3 className="font-semibold mb-4">Students by Semester</h3><ResponsiveContainer width="100%" height={220}><BarChart data={studentStats.bySemester}><XAxis dataKey="semester" tickFormatter={v => `Sem ${v}`} tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={v => [v, 'Students']} /><Bar dataKey="count" fill="#003087" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>}
              {feeStats?.byMonth && <div className="card"><h3 className="font-semibold mb-4">Monthly Fee Collection</h3><ResponsiveContainer width="100%" height={220}><LineChart data={feeStats.byMonth}><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`} /><Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Collection']} /><Line type="monotone" dataKey="amount" stroke="#003087" strokeWidth={2} dot={{ fill: '#f97316' }} /></LineChart></ResponsiveContainer></div>}
              {placementStats?.byCompany?.length > 0 && <div className="card"><h3 className="font-semibold mb-4">Top Recruiters</h3><ResponsiveContainer width="100%" height={220}><BarChart data={placementStats.byCompany.slice(0, 8)} layout="vertical"><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="company_name" tick={{ fontSize: 10 }} width={100} /><Tooltip formatter={v => [v, 'Placed']} /><Bar dataKey="placed" fill="#10b981" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>}
            </div>
          </div>
        )
      )}

      {tab === 'students' && <DetailTable tab={tab} data={detailData.students} loading={detailLoading.students}
        columns={[['Name', 'name'], ['Enrollment', 'enrollment_number'], ['Program', 'program_name'], ['Semester', 'semester'], ['Section', 'section'], ['Batch', 'batch_year'], ['Gender', 'gender'], ['Status', 'status']]}
        summary={detailData.students?.summary} />}

      {tab === 'attendance' && (
        <div className="space-y-4">
          {detailLoading.attendance ? <Spinner /> : detailData.attendance ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Total Students', detailData.attendance.summary?.total, 'text-msrim-blue'],
                  ['Below 75%', detailData.attendance.summary?.below75, 'text-red-500'],
                  ['Below 80%', detailData.attendance.summary?.below80, 'text-orange-500'],
                  ['Avg Attendance', `${detailData.attendance.summary?.avgPercentage}%`, 'text-green-600']
                ].map(([l, v, c]) => (
                  <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
                ))}
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b"><h3 className="font-semibold text-red-600">Students Below 75% Attendance</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-th">Student</th><th className="table-th">Enrollment</th><th className="table-th">Program</th>
                      <th className="table-th">Semester</th><th className="table-th">Attended</th><th className="table-th">Attendance %</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailData.attendance.records?.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{r.name}</td>
                          <td className="table-td font-mono text-xs">{r.enrollment_number}</td>
                          <td className="table-td text-xs">{r.program_name}</td>
                          <td className="table-td">Sem {r.semester}</td>
                          <td className="table-td">{r.attended}/{r.total_classes}</td>
                          <td className="table-td"><span className={`font-bold ${parseFloat(r.percentage) < 65 ? 'text-red-600' : 'text-orange-500'}`}>{r.percentage}%</span></td>
                        </tr>
                      ))}
                      {!detailData.attendance.records?.length && <tr><td colSpan={6} className="table-td text-center py-8 text-green-600 font-medium">✓ All students have attendance above 75%</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          {detailLoading.results ? <Spinner /> : detailData.results ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Total Results', detailData.results.summary?.total, 'text-msrim-blue'],
                  ['Passed', detailData.results.summary?.passed, 'text-green-600'],
                  ['Failed', detailData.results.summary?.failed, 'text-red-500'],
                  ['Pass Rate', `${detailData.results.summary?.passRate}%`, 'text-msrim-orange']
                ].map(([l, v, c]) => (
                  <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
                ))}
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-th">Student</th><th className="table-th">Course</th>
                      <th className="table-th">Exam</th><th className="table-th">Marks</th><th className="table-th">Grade</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailData.results.records?.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-td"><p className="font-medium">{r.student_name}</p><p className="text-xs text-gray-400">{r.enrollment_number}</p></td>
                          <td className="table-td text-sm">{r.course_name}</td>
                          <td className="table-td text-xs text-gray-500">{r.exam_name}</td>
                          <td className="table-td font-semibold">{r.marks_obtained}/{r.total_marks}</td>
                          <td className="table-td"><span className={`badge-${r.grade === 'F' ? 'red' : 'green'}`}>{r.grade}</span></td>
                        </tr>
                      ))}
                      {!detailData.results.records?.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No results data</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'fees' && (
        <div className="space-y-4">
          {detailLoading.fees ? <Spinner /> : detailData.fees ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="card"><p className="text-gray-500 text-sm">Total Collected</p><p className="text-2xl font-bold text-green-600">₹{detailData.fees.summary?.totalCollected?.toLocaleString()}</p></div>
                <div className="card"><p className="text-gray-500 text-sm">Transactions</p><p className="text-2xl font-bold text-msrim-blue">{detailData.fees.summary?.transactionCount}</p></div>
                <div className="card"><p className="text-gray-500 text-sm">Fee Defaulters</p><p className="text-2xl font-bold text-red-500">{detailData.fees.summary?.defaulterCount}</p></div>
              </div>
              {detailData.fees.defaulters?.length > 0 && (
                <div className="card">
                  <h3 className="font-semibold text-red-600 mb-3">Fee Defaulters</h3>
                  <div className="space-y-2">
                    {detailData.fees.defaulters.map((d, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <span className="font-medium text-sm">{d.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-gray-500">{d.enrollment_number}</span>
                          <span className="badge-blue text-xs">{d.program_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="card p-0 overflow-hidden">
                <div className="p-4 border-b"><h3 className="font-semibold">Payment Records</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-th">Receipt</th><th className="table-th">Student</th>
                      <th className="table-th">Fee Type</th><th className="table-th">Amount</th>
                      <th className="table-th">Mode</th><th className="table-th">Date</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailData.fees.records?.slice(0, 50).map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-td font-mono text-xs">{r.receipt_number}</td>
                          <td className="table-td"><p className="font-medium text-sm">{r.student_name}</p><p className="text-xs text-gray-400">{r.enrollment_number}</p></td>
                          <td className="table-td text-xs">{r.fee_type}</td>
                          <td className="table-td font-semibold text-green-700">₹{r.amount_paid?.toLocaleString()}</td>
                          <td className="table-td"><span className="badge-blue text-xs">{r.payment_mode}</span></td>
                          <td className="table-td text-xs">{r.payment_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'placements' && (
        <div className="space-y-4">
          {detailLoading.placements ? <Spinner /> : detailData.placements ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['Total Placed', detailData.placements.summary?.totalPlaced, 'text-green-600'],
                  ['Placement %', `${detailData.placements.summary?.placementPercentage}%`, 'text-msrim-blue'],
                  ['Avg Package', `₹${detailData.placements.summary?.avgPackage} LPA`, 'text-msrim-orange'],
                  ['Highest Package', `₹${detailData.placements.summary?.maxPackage} LPA`, 'text-purple-600']
                ].map(([l, v, c]) => (
                  <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
                ))}
              </div>
              <div className="card p-0 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="table-th">Student</th><th className="table-th">Company</th>
                      <th className="table-th">Role</th><th className="table-th">Package</th><th className="table-th">Drive Date</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {detailData.placements.records?.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="table-td"><p className="font-medium">{r.student_name}</p><p className="text-xs text-gray-400">{r.enrollment_number}</p></td>
                          <td className="table-td font-medium">{r.company_name}</td>
                          <td className="table-td text-sm">{r.job_role}</td>
                          <td className="table-td font-semibold text-green-700">₹{r.package_lpa} LPA</td>
                          <td className="table-td text-xs">{r.drive_date}</td>
                        </tr>
                      ))}
                      {!detailData.placements.records?.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No placement records</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function DetailTable({ data, loading, columns, summary }) {
  if (loading) return <Spinner />;
  if (!data) return null;
  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Total</p><p className="text-2xl font-bold text-msrim-blue">{summary.total}</p></div>
          {summary.byProgram && Object.entries(summary.byProgram).map(([k, v]) => (
            <div key={k} className="card"><p className="text-gray-500 text-xs truncate">{k}</p><p className="text-2xl font-bold text-msrim-orange">{v}</p></div>
          ))}
        </div>
      )}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>{columns.map(([l]) => <th key={l} className="table-th">{l}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.students?.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {columns.map(([, k]) => <td key={k} className="table-td text-sm">{row[k] || '—'}</td>)}
                </tr>
              ))}
              {!data.students?.length && <tr><td colSpan={columns.length} className="table-td text-center py-8 text-gray-400">No data</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div>;
}
