import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
  ClipboardCheck, CheckCircle, XCircle, AlertCircle, Save,
  Search, Filter, TrendingDown, TrendingUp, Users, ChevronDown, ChevronUp,
  AlertTriangle, Award, Clock
} from 'lucide-react';

const pctColor = (p) => p >= 85 ? '#10b981' : p >= 75 ? '#3b82f6' : p >= 65 ? '#f59e0b' : '#ef4444';
const pctBg = (p) => p >= 85 ? 'bg-green-500' : p >= 75 ? 'bg-blue-500' : p >= 65 ? 'bg-yellow-500' : 'bg-red-500';
const pctBadge = (p) => p >= 85 ? 'badge-green' : p >= 75 ? 'badge-blue' : p >= 65 ? 'badge-yellow' : 'badge-red';
const pctLabel = (p) => p >= 85 ? 'Excellent' : p >= 75 ? 'Good' : p >= 65 ? 'Low' : 'Critical';

export default function Attendance() {
  const { user } = useAuth();
  if (user.role === 'student') return <StudentAttendance />;
  if (user.role === 'faculty') return <FacultyAttendance />;
  return <AdminAttendance />;
}

// ── Student View ─────────────────────────────────────────────────────────────
function StudentAttendance() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/attendance/summary').then(r => setSummary(r.data)).finally(() => setLoading(false));
  }, []);

  const overall = summary.length > 0
    ? (summary.reduce((s, c) => s + (c.percentage || 0), 0) / summary.length).toFixed(1)
    : 0;
  const totalClasses = summary.reduce((s, c) => s + c.total_classes, 0);
  const totalAttended = summary.reduce((s, c) => s + c.attended, 0);

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <p className="text-gray-500 text-sm mt-1">{totalAttended} / {totalClasses} classes attended</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card text-center col-span-1">
          <div className="relative w-24 h-24 mx-auto mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none" stroke={pctColor(parseFloat(overall))} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - parseFloat(overall) / 100)}`}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-black" style={{ color: pctColor(parseFloat(overall)) }}>{overall}%</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700">Overall</p>
          {parseFloat(overall) < 75 && (
            <p className="text-red-500 text-xs mt-1 font-medium flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Below 75% minimum
            </p>
          )}
        </div>

        {[
          { label: 'Total Classes', value: totalClasses, color: 'text-msrim-blue' },
          { label: 'Attended', value: totalAttended, color: 'text-green-600' },
          { label: 'Absent', value: totalClasses - totalAttended, color: 'text-red-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      {parseFloat(overall) < 75 && (
        <div className="card border-l-4 border-red-500 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Attendance Deficiency Warning</p>
              <p className="text-sm text-red-600">Your attendance is below the 75% minimum requirement. You need to attend more classes to avoid academic consequences.</p>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold mb-4">Course-wise Attendance Breakdown</h3>
        {loading ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div> : (
          <div className="space-y-4">
            {summary.map(c => (
              <div key={c.course_id} className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm">{c.course_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{c.course_code}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: pctColor(c.percentage) }}>{c.percentage}%</p>
                    <span className={pctBadge(c.percentage)}>{pctLabel(c.percentage)}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                  <div className={`h-2.5 rounded-full transition-all duration-700 ${pctBg(c.percentage)}`}
                    style={{ width: `${Math.min(100, c.percentage)}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{c.attended} present / {c.total_classes - c.attended} absent</span>
                  <span>{c.total_classes} total classes</span>
                </div>
              </div>
            ))}
            {summary.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No attendance records yet</p>}
          </div>
        )}
      </div>

      {summary.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-4">Visual Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={summary} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="course_code" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={v => [`${v}%`, 'Attendance']} />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]}>
                {summary.map((s, i) => <Cell key={i} fill={pctColor(s.percentage)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2 flex-wrap">
            {[['#10b981','≥ 85% Excellent'],['#3b82f6','≥ 75% Good'],['#f59e0b','≥ 65% Low'],['#ef4444','< 65% Critical']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c }} />{l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin / HOD View ──────────────────────────────────────────────────────────
function AdminAttendance() {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('percentage');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/attendance/student-summary'),
      api.get('/attendance/stats'),
      api.get('/courses'),
    ]).then(([s, st, c]) => {
      setStudents(s.data);
      setStats(st.data);
      setCourses(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const reload = async () => {
    setLoading(true);
    const params = {};
    if (filterCourse) params.course_id = filterCourse;
    const [s, st] = await Promise.all([
      api.get('/attendance/student-summary', { params }),
      api.get('/attendance/stats'),
    ]);
    setStudents(s.data);
    setStats(st.data);
    setLoading(false);
  };

  useEffect(() => { reload(); }, [filterCourse]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const filtered = students
    .filter(s => {
      if (search && !s.name?.toLowerCase().includes(search.toLowerCase()) && !s.enrollment_number?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterSection && s.section !== filterSection) return false;
      if (filterStatus === 'critical' && (s.percentage ?? 0) >= 65) return false;
      if (filterStatus === 'low' && ((s.percentage ?? 0) < 65 || (s.percentage ?? 0) >= 75)) return false;
      if (filterStatus === 'good' && (s.percentage ?? 0) < 75) return false;
      return true;
    })
    .sort((a, b) => {
      let av = a[sortBy] ?? 0, bv = b[sortBy] ?? 0;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

  const sections = [...new Set(students.map(s => s.section).filter(Boolean))].sort();
  const SortIcon = ({ col }) => sortBy === col
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />)
    : <ChevronDown className="w-3 h-3 inline ml-1 opacity-30" />;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-msrim-blue" /> Attendance Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time attendance tracking for all students</p>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Students Tracked', value: stats.total_students || 0, icon: Users, color: 'text-msrim-blue', bg: 'bg-blue-50' },
            { label: 'Avg Attendance', value: `${stats.avg_pct || 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Critical (<65%)', value: stats.critical || 0, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Low (65–74%)', value: stats.low || 0, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Good (≥75%)', value: stats.good || 0, icon: Award, color: 'text-green-600', bg: 'bg-green-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`card ${bg} border-0`}>
              <Icon className={`w-5 h-5 ${color} mb-2`} />
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input className="input-field pl-9" placeholder="Search by name or enrollment number..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select-field w-36" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
            <option value="">All Sections</option>
            {sections.map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
          <select className="select-field w-44" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
          </select>
          <select className="select-field w-40" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="critical">Critical (&lt;65%)</option>
            <option value="low">Low (65–74%)</option>
            <option value="good">Good (≥75%)</option>
          </select>
          {(search || filterSection || filterCourse || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterSection(''); setFilterCourse(''); setFilterStatus(''); }} className="btn-secondary text-sm">Clear</button>
          )}
        </div>
      </div>

      {/* Student Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Calculating attendance for all students...</p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="px-6 py-3 bg-gray-50 border-b flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Showing {filtered.length} of {students.length} students</p>
            <div className="flex gap-2 text-xs">
              {[['#10b981','≥85%'],['#3b82f6','≥75%'],['#f59e0b','≥65%'],['#ef4444','<65%']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: c }} />{l}</span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('name')}>Student <SortIcon col="name" /></th>
                  <th className="table-th cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('enrollment_number')}>Enrollment <SortIcon col="enrollment_number" /></th>
                  <th className="table-th">Sec</th>
                  <th className="table-th cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('total_classes')}>Classes <SortIcon col="total_classes" /></th>
                  <th className="table-th cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('attended')}>Present <SortIcon col="attended" /></th>
                  <th className="table-th cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('absents')}>Absent <SortIcon col="absents" /></th>
                  <th className="table-th cursor-pointer hover:bg-gray-100" onClick={() => toggleSort('percentage')}>Attendance % <SortIcon col="percentage" /></th>
                  <th className="table-th">Course Breakup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(s => {
                  const pct = parseFloat(s.percentage ?? 0);
                  const isExpanded = expandedId === s.student_id;
                  return (
                    <>
                      <tr key={s.student_id} className={`hover:bg-gray-50 transition-colors ${pct < 65 ? 'bg-red-50/40' : pct < 75 ? 'bg-yellow-50/40' : ''}`}>
                        <td className="table-td">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: pctColor(pct) }}>
                              {s.name?.charAt(0)}
                            </div>
                            <span className="font-medium text-sm">{s.name}</span>
                          </div>
                        </td>
                        <td className="table-td font-mono text-xs text-gray-500">{s.enrollment_number}</td>
                        <td className="table-td text-center">
                          <span className="badge-gray">{s.section || '—'}</span>
                        </td>
                        <td className="table-td text-center font-medium">{s.total_classes || 0}</td>
                        <td className="table-td text-center">
                          <span className="text-green-600 font-semibold">{s.attended || 0}</span>
                        </td>
                        <td className="table-td text-center">
                          <span className="text-red-500 font-semibold">{s.absents || 0}</span>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-2 min-w-32">
                            <div className="flex-1 bg-gray-100 rounded-full h-2">
                              <div className="h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pctColor(pct) }} />
                            </div>
                            <span className="text-sm font-bold w-12 text-right" style={{ color: pctColor(pct) }}>
                              {s.total_classes > 0 ? `${pct}%` : '—'}
                            </span>
                          </div>
                          {s.total_classes > 0 && <span className={`${pctBadge(pct)} text-xs mt-1 inline-block`}>{pctLabel(pct)}</span>}
                        </td>
                        <td className="table-td">
                          <button onClick={() => setExpandedId(isExpanded ? null : s.student_id)}
                            className="text-xs text-msrim-blue hover:underline flex items-center gap-1">
                            {s.courses?.length || 0} courses
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${s.student_id}-expand`} className="bg-gray-50">
                          <td colSpan={8} className="px-6 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                              {s.courses?.length > 0 ? s.courses.map(c => (
                                <div key={c.course_code} className="bg-white rounded-xl p-3 border border-gray-200">
                                  <div className="flex justify-between items-start mb-1.5">
                                    <div>
                                      <p className="text-xs font-semibold">{c.course_name}</p>
                                      <p className="text-xs text-gray-400 font-mono">{c.course_code}</p>
                                    </div>
                                    <span className="text-base font-black" style={{ color: pctColor(c.pct) }}>{c.pct}%</span>
                                  </div>
                                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                                    <div className="h-1.5 rounded-full" style={{ width: `${Math.min(c.pct, 100)}%`, backgroundColor: pctColor(c.pct) }} />
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">{c.attended}/{c.total} classes</p>
                                </div>
                              )) : (
                                <p className="text-xs text-gray-400 col-span-3">No attendance records for this student</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400">No students match your filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Faculty View ──────────────────────────────────────────────────────────────
function FacultyAttendance() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [courseSummary, setCourseSummary] = useState([]);
  const [tab, setTab] = useState('mark');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    Promise.all([
      api.get(`/attendance/course/${selectedCourse}/date/${date}`),
      api.get('/attendance/student-summary', { params: { course_id: selectedCourse } }),
    ]).then(([att, sum]) => {
      setStudents(att.data);
      setCourseSummary(sum.data);
    }).finally(() => setLoading(false));
  }, [selectedCourse, date]);

  const toggleStatus = (id) => setStudents(s => s.map(st => st.student_id === id
    ? { ...st, status: st.status === 'present' ? 'absent' : st.status === 'absent' ? 'late' : 'present' }
    : st));

  const markAll = (status) => setStudents(s => s.map(st => ({ ...st, status })));

  const saveAttendance = async () => {
    if (!selectedCourse) return;
    setSaving(true);
    try {
      await api.post('/attendance/bulk', { course_id: selectedCourse, date, records: students.map(s => ({ student_id: s.student_id, status: s.status })) });
      toast.success(`Attendance saved for ${students.length} students!`);
      // Refresh summary
      const sum = await api.get('/attendance/student-summary', { params: { course_id: selectedCourse } });
      setCourseSummary(sum.data);
    } catch { toast.error('Failed to save attendance'); }
    finally { setSaving(false); }
  };

  const present = students.filter(s => s.status === 'present').length;
  const late = students.filter(s => s.status === 'late').length;
  const absent = students.filter(s => s.status === 'absent').length;

  return (
    <div className="space-y-5 fade-in">
      <h1 className="text-2xl font-bold">Attendance Management</h1>
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="select-field">
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-field" max={new Date().toISOString().split('T')[0]} />
          </div>
        </div>
      </div>

      {selectedCourse && (
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {['mark','summary'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
              {t === 'mark' ? 'Mark Attendance' : 'Student Summary'}
            </button>
          ))}
        </div>
      )}

      {selectedCourse && tab === 'mark' && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium text-green-700">Present: {present}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-700">Late: {late}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">Absent: {absent}</span>
              </div>
              {students.length > 0 && <span className="text-sm text-gray-400">{students.length > 0 ? Math.round(((present + late) / students.length) * 100) : 0}% today</span>}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => markAll('present')} className="btn-secondary py-1.5 px-3 text-xs">All Present</button>
              <button onClick={() => markAll('absent')} className="btn-secondary py-1.5 px-3 text-xs">All Absent</button>
              <button onClick={saveAttendance} disabled={saving} className="btn-primary py-1.5">
                <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">#</th><th className="table-th">Roll</th>
                  <th className="table-th">Student Name</th><th className="table-th">Section</th>
                  <th className="table-th">Today</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={5} className="py-8 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                  : students.map((s, i) => (
                    <tr key={s.student_id} className={`hover:bg-gray-50 ${s.status === 'present' ? '' : s.status === 'late' ? 'bg-yellow-50/30' : 'bg-red-50/30'}`}>
                      <td className="table-td text-gray-400 text-xs">{i + 1}</td>
                      <td className="table-td font-mono text-xs text-gray-500">{s.roll_number}</td>
                      <td className="table-td font-medium">{s.name}</td>
                      <td className="table-td">{s.section}</td>
                      <td className="table-td">
                        <button onClick={() => toggleStatus(s.student_id)}
                          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all min-w-24 justify-center
                            ${s.status === 'present' ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : s.status === 'late' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                          {s.status === 'present' ? <CheckCircle className="w-3.5 h-3.5" /> : s.status === 'late' ? <Clock className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!loading && students.length === 0 && <p className="text-center py-8 text-gray-400">No students enrolled</p>}
          </div>
        </>
      )}

      {selectedCourse && tab === 'summary' && (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Student</th><th className="table-th">Enrollment</th>
                  <th className="table-th">Section</th><th className="table-th">Classes</th>
                  <th className="table-th">Attended</th><th className="table-th">Absent</th>
                  <th className="table-th">Attendance %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courseSummary.sort((a, b) => (a.percentage ?? 0) - (b.percentage ?? 0)).map(s => {
                  const pct = parseFloat(s.percentage ?? 0);
                  const courseData = s.courses?.[0];
                  const total = courseData?.total ?? s.total_classes ?? 0;
                  const attended = courseData?.attended ?? s.attended ?? 0;
                  const cpct = courseData ? parseFloat(courseData.pct) : pct;
                  return (
                    <tr key={s.student_id} className={`hover:bg-gray-50 ${cpct < 65 ? 'bg-red-50/40' : cpct < 75 ? 'bg-yellow-50/30' : ''}`}>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: pctColor(cpct) }}>{s.name?.charAt(0)}</div>
                          <span className="font-medium text-sm">{s.name}</span>
                        </div>
                      </td>
                      <td className="table-td font-mono text-xs text-gray-400">{s.enrollment_number}</td>
                      <td className="table-td text-center"><span className="badge-gray">{s.section || '—'}</span></td>
                      <td className="table-td text-center font-medium">{total}</td>
                      <td className="table-td text-center text-green-600 font-semibold">{attended}</td>
                      <td className="table-td text-center text-red-500 font-semibold">{total - attended}</td>
                      <td className="table-td">
                        <div className="flex items-center gap-2 min-w-28">
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(cpct, 100)}%`, backgroundColor: pctColor(cpct) }} />
                          </div>
                          <span className="text-sm font-bold w-12 text-right" style={{ color: pctColor(cpct) }}>
                            {total > 0 ? `${cpct}%` : '—'}
                          </span>
                        </div>
                        {total > 0 && <span className={`${pctBadge(cpct)} text-xs mt-1 inline-block`}>{pctLabel(cpct)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {courseSummary.length === 0 && <p className="text-center py-8 text-gray-400">No attendance data for this course yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}
