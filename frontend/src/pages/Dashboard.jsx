import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, GraduationCap, BookOpen, Bell, TrendingUp, DollarSign, Library, Briefcase, FileText, Calendar, AlertCircle, CheckCircle } from 'lucide-react';

const COLORS = ['#003087','#1e56a0','#f97316','#10b981','#6366f1','#ec4899'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{value ?? '—'}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );
}

function NoticeCard({ notice }) {
  const colors = { urgent:'badge-red', exam:'badge-yellow', placement:'badge-orange', fee:'badge-blue', general:'badge-gray', event:'badge-green', academic:'badge-blue' };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      {notice.is_pinned ? <AlertCircle className="w-4 h-4 text-msrim-orange mt-0.5 flex-shrink-0" /> : <Bell className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{notice.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{notice.published_by_name} · {new Date(notice.created_at).toLocaleDateString()}</p>
      </div>
      <span className={`flex-shrink-0 ${colors[notice.category] || 'badge-gray'}`}>{notice.category}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const { stats, recentNotices, recentPayments, monthlyFees, recentResults, upcomingExams, placements, courses, studentInfo, facultyInfo } = data || {};

  // Admin / Registrar Dashboard
  if (['admin','registrar'].includes(user.role)) {
    const feeChartData = (monthlyFees || []).map(m => ({ month: MONTHS[parseInt(m.month)-1], amount: m.amount }));
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user.name}. Here's an overview of the campus.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Students" value={stats?.students} icon={GraduationCap} color="bg-msrim-blue" />
          <StatCard label="Faculty Members" value={stats?.faculty} icon={Users} color="bg-msrim-orange" />
          <StatCard label="Active Courses" value={stats?.courses} icon={BookOpen} color="bg-green-500" />
          <StatCard label="Avg Attendance" value={`${stats?.avgAttendance || 0}%`} icon={CheckCircle} color="bg-purple-500" />
          <StatCard label="Fees Collected" value={`₹${((stats?.feeCollected||0)/100000).toFixed(1)}L`} icon={DollarSign} color="bg-indigo-500" sub="This year" />
          <StatCard label="Upcoming Drives" value={stats?.placements} icon={Briefcase} color="bg-pink-500" />
          <StatCard label="Library Issued" value={stats?.libIssued} icon={Library} color="bg-teal-500" />
          <StatCard label="New Notices" value={stats?.newNotices} icon={Bell} color="bg-amber-500" sub="This week" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Monthly Fee Collection (2024)</h3>
            {feeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={feeChartData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
                  <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Amount']} />
                  <Bar dataKey="amount" fill="#003087" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-400 text-sm text-center py-8">No fee data available</p>}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Notices</h3>
            <div className="space-y-0">
              {(recentNotices || []).map(n => <NoticeCard key={n.id} notice={n} />)}
              {!recentNotices?.length && <p className="text-gray-400 text-sm text-center py-4">No notices</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Fee Payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-gray-100">
                <th className="table-th">Student</th><th className="table-th">Enrollment</th>
                <th className="table-th">Fee Type</th><th className="table-th">Amount</th>
                <th className="table-th">Date</th><th className="table-th">Receipt</th>
              </tr></thead>
              <tbody>
                {(recentPayments || []).map(p => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-medium">{p.student_name}</td>
                    <td className="table-td text-gray-500">{p.enrollment_number}</td>
                    <td className="table-td">{p.fee_type}</td>
                    <td className="table-td font-semibold text-green-700">₹{p.amount_paid?.toLocaleString()}</td>
                    <td className="table-td">{new Date(p.payment_date).toLocaleDateString()}</td>
                    <td className="table-td text-xs text-gray-500">{p.receipt_number}</td>
                  </tr>
                ))}
                {!recentPayments?.length && <tr><td colSpan={6} className="table-td text-center text-gray-400">No payments</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Student Dashboard
  if (user.role === 'student') {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-msrim-blue to-msrim-blue-light rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Good day, {user.name.split(' ')[0]}!</h1>
              <p className="text-blue-100 mt-1">{studentInfo?.program_name} · Semester {studentInfo?.semester} · Section {studentInfo?.section}</p>
              <p className="text-blue-200 text-sm mt-1">{studentInfo?.enrollment_number}</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{stats?.attendance}%</p>
              <p className="text-xs text-blue-100">Attendance</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="My Courses" value={stats?.courses} icon={BookOpen} color="bg-msrim-blue" />
          <StatCard label="Attendance" value={`${stats?.attendance}%`} icon={CheckCircle} color={parseFloat(stats?.attendance) < 75 ? 'bg-red-500' : 'bg-green-500'} />
          <StatCard label="Exams Given" value={stats?.examsGiven} icon={FileText} color="bg-purple-500" />
          <StatCard label="Fees Paid" value={`₹${((stats?.feesPaid||0)/1000).toFixed(0)}K`} icon={DollarSign} color="bg-indigo-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-msrim-orange" /> Announcements</h3>
            {(recentNotices || []).map(n => <NoticeCard key={n.id} notice={n} />)}
            {!recentNotices?.length && <p className="text-gray-400 text-sm text-center py-4">No notices</p>}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-msrim-orange" /> Upcoming Exams</h3>
            {(upcomingExams || []).map(e => (
              <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.course_name}</p>
                  <p className="text-xs text-gray-400">{e.name} · {e.exam_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-msrim-blue">{new Date(e.exam_date).toLocaleDateString()}</p>
                  <p className="text-xs text-gray-400">Max: {e.total_marks}</p>
                </div>
              </div>
            ))}
            {!upcomingExams?.length && <p className="text-gray-400 text-sm text-center py-4">No upcoming exams</p>}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-msrim-orange" /> Recent Results</h3>
            {(recentResults || []).map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{r.course_name}</p>
                  <p className="text-xs text-gray-400">{r.exam_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-msrim-blue">{r.grade}</p>
                  <p className="text-xs text-gray-400">{r.marks_obtained}/{r.total_marks}</p>
                </div>
              </div>
            ))}
            {!recentResults?.length && <p className="text-gray-400 text-sm text-center py-4">No results yet</p>}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><Briefcase className="w-4 h-4 text-msrim-orange" /> Placement Opportunities</h3>
            {(placements || []).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{p.company_name}</p>
                  <p className="text-xs text-gray-400">{p.job_role}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-green-600">₹{p.package_lpa} LPA</p>
                  <p className="text-xs text-gray-400">{p.drive_date ? new Date(p.drive_date).toLocaleDateString() : 'TBD'}</p>
                </div>
              </div>
            ))}
            {!placements?.length && <p className="text-gray-400 text-sm text-center py-4">No drives listed</p>}
          </div>
        </div>
      </div>
    );
  }

  // Faculty Dashboard
  if (user.role === 'faculty') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{facultyInfo?.designation} · {facultyInfo?.dept_name}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard label="My Courses" value={stats?.totalCourses} icon={BookOpen} color="bg-msrim-blue" />
          <StatCard label="Total Students" value={stats?.totalStudents} icon={GraduationCap} color="bg-msrim-orange" />
          <StatCard label="Pending Results" value={stats?.pendingResults} icon={FileText} color="bg-red-500" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">My Courses</h3>
            {(courses || []).map(c => (
              <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.code} · Sem {c.semester} · {c.program_name}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.type==='core'?'badge-blue':'badge-orange'}`}>{c.type}</span>
              </div>
            ))}
            {!courses?.length && <p className="text-gray-400 text-sm text-center py-4">No courses assigned</p>}
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Recent Notices</h3>
            {(recentNotices||[]).map(n => <NoticeCard key={n.id} notice={n} />)}
          </div>
        </div>
      </div>
    );
  }

  // Generic dashboard for other roles
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome, {user.name}</h1>
        <p className="text-gray-500 text-sm capitalize mt-1">{user.role} · MSRIM Digital Campus</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(stats || {}).map(([k, v]) => (
          <div key={k} className="card">
            <p className="text-gray-500 text-xs capitalize">{k.replace(/([A-Z])/g,' $1')}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{typeof v === 'number' ? v.toLocaleString() : v}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Notices</h3>
        {(recentNotices||data?.notices||[]).map(n => <NoticeCard key={n.id} notice={n} />)}
      </div>
    </div>
  );
}
