import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  BookMarked, ClipboardList, FileText, Plus, Send, X, Award, Megaphone,
  CheckCircle, Clock, AlertTriangle, BarChart3, ChevronRight, Trash2,
  Eye, Edit2, BookOpen, Users, TrendingUp, Bell, Pin, Video,
  Link, FileImage, FileSpreadsheet, Play, Square, RefreshCw
} from 'lucide-react';

// ── Utilities ──────────────────────────────────────────────────────────────────
function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}
function urgencyClass(days) {
  if (days === null) return '';
  if (days < 0) return 'text-red-600 bg-red-50 border-red-200';
  if (days <= 2) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-green-700 bg-green-50 border-green-200';
}
function urgencyLabel(days) {
  if (days === null) return '';
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days}d left`;
}
const RESOURCE_ICONS = {
  document: FileText, pdf: FileImage, video: Video, link: Link,
  presentation: FileSpreadsheet, other: BookOpen
};
const RESOURCE_COLORS = {
  document: 'bg-blue-50 text-blue-600', pdf: 'bg-red-50 text-red-600',
  video: 'bg-purple-50 text-purple-600', link: 'bg-cyan-50 text-cyan-600',
  presentation: 'bg-orange-50 text-orange-600', other: 'bg-gray-50 text-gray-600'
};
const PRIORITY_STYLES = {
  urgent:    'bg-red-100 text-red-700 border-red-200',
  important: 'bg-orange-100 text-orange-700 border-orange-200',
  normal:    'bg-blue-50 text-blue-600 border-blue-100',
};
const STATUS_BADGE = {
  active: 'badge-green', closed: 'badge-red', draft: 'badge-gray',
  submitted: 'badge-blue', graded: 'badge-purple', late: 'badge-orange',
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function LMS() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [myGrades, setMyGrades] = useState(null);
  const [courseFilter, setCourseFilter] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: 'assignment'|'resource'|'quiz'|'announcement'|'grade'|'submissions', data? }

  const isStudent = user.role === 'student';
  const canCreate = ['faculty', 'admin', 'hod'].includes(user.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = courseFilter ? { course_id: courseFilter } : {};
      const [st, ov, as, rs, qz, an] = await Promise.all([
        api.get('/lms/stats'),
        api.get('/lms/overview'),
        api.get('/lms/assignments', { params }),
        api.get('/lms/resources', { params }),
        api.get('/lms/quizzes', { params }),
        api.get('/lms/announcements', { params }),
      ]);
      setStats(st.data); setOverview(ov.data);
      setAssignments(as.data); setResources(rs.data);
      setQuizzes(qz.data); setAnnouncements(an.data);
      if (isStudent) {
        const gr = await api.get('/lms/my-grades');
        setMyGrades(gr.data);
      }
    } catch { toast.error('Failed to load LMS data'); }
    finally { setLoading(false); }
  }, [courseFilter, isStudent]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data || [])).catch(() => {});
  }, []);

  const closeModal = () => { setModal(null); load(); };

  const handleSubmit = async (assignmentId) => {
    try {
      await api.post(`/lms/assignments/${assignmentId}/submit`, { notes: 'Submitted via portal' });
      toast.success('Assignment submitted!'); load();
    } catch(e) { toast.error(e.response?.data?.error || 'Already submitted'); }
  };

  const handleStatusChange = async (type, id, status) => {
    try {
      await api.put(`/lms/${type}/${id}/status`, { status });
      toast.success('Status updated.'); load();
    } catch(e) { toast.error('Failed to update status'); }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Delete this item?')) return;
    try { await api.delete(`/lms/${type}/${id}`); toast.success('Deleted.'); load(); }
    catch(e) { toast.error('Failed to delete'); }
  };

  const tabs = [
    { id: 'overview',      label: 'Overview',      icon: BarChart3 },
    { id: 'assignments',   label: 'Assignments',   icon: ClipboardList, badge: stats?.overdue > 0 ? stats.overdue : null },
    { id: 'resources',     label: 'Resources',     icon: BookMarked },
    { id: 'quizzes',       label: 'Quizzes',       icon: FileText },
    { id: 'announcements', label: 'Announcements', icon: Megaphone },
    ...(isStudent ? [{ id: 'grades', label: 'My Grades', icon: Award }] : []),
    ...(!isStudent ? [{ id: 'submissions', label: 'Submissions', icon: Users, badge: stats?.pendingGrade > 0 ? stats.pendingGrade : null }] : []),
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Learning Management System</h1>
          <p className="text-gray-500 text-sm mt-1">Courses · Assignments · Quizzes · Resources · Announcements</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)} className="select-field text-sm w-44">
            <option value="">All Courses</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
          </select>
          <button onClick={load} className="btn-secondary p-2"><RefreshCw className="w-4 h-4" /></button>
          {canCreate && (
            <>
              <button className="btn-secondary text-sm py-2" onClick={() => setModal({ type: 'resource' })}><Plus className="w-3.5 h-3.5" /> Resource</button>
              <button className="btn-secondary text-sm py-2" onClick={() => setModal({ type: 'announcement' })}><Plus className="w-3.5 h-3.5" /> Announcement</button>
              <button className="btn-secondary text-sm py-2" onClick={() => setModal({ type: 'quiz' })}><Plus className="w-3.5 h-3.5" /> Quiz</button>
              <button className="btn-primary text-sm py-2" onClick={() => setModal({ type: 'assignment' })}><Plus className="w-3.5 h-3.5" /> Assignment</button>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Assignments', val: stats.assignments, color: 'text-msrim-blue' },
            { label: 'Resources',   val: stats.resources,   color: 'text-green-600' },
            { label: 'Quizzes',     val: stats.quizzes,     color: 'text-purple-600' },
            { label: 'Submissions', val: stats.submissions,  color: 'text-cyan-600' },
            { label: 'Announcements', val: stats.announcements, color: 'text-orange-600' },
            { label: 'Pending Grade', val: stats.pendingGrade, color: 'text-amber-600' },
            { label: 'Overdue',    val: stats.overdue,     color: stats.overdue > 0 ? 'text-red-600 font-bold' : 'text-gray-500' },
          ].map(s => (
            <div key={s.label} className="card py-3">
              <p className="text-gray-400 text-xs">{s.label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all relative ${tab===t.id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
            {t.badge > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{t.badge}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center py-20"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : (
        <>
          {/* ── OVERVIEW ── */}
          {tab === 'overview' && overview && (
            <OverviewTab overview={overview} user={user} isStudent={isStudent} onTabSwitch={setTab} />
          )}

          {/* ── ASSIGNMENTS ── */}
          {tab === 'assignments' && (
            <AssignmentsTab
              assignments={assignments} user={user} isStudent={isStudent} canCreate={canCreate}
              onSubmit={handleSubmit} onStatusChange={handleStatusChange} onDelete={handleDelete}
              onViewSubmissions={(a) => setModal({ type: 'submissions', data: a })}
              onAdd={() => setModal({ type: 'assignment' })}
            />
          )}

          {/* ── RESOURCES ── */}
          {tab === 'resources' && (
            <ResourcesTab
              resources={resources} canCreate={canCreate}
              onDelete={(id) => handleDelete('resources', id)}
              onAdd={() => setModal({ type: 'resource' })}
            />
          )}

          {/* ── QUIZZES ── */}
          {tab === 'quizzes' && (
            <QuizzesTab
              quizzes={quizzes} isStudent={isStudent} canCreate={canCreate}
              onStatusChange={handleStatusChange}
              onAttempt={async (id) => {
                try { await api.post(`/lms/quizzes/${id}/attempt`); toast.success('Quiz started!'); load(); }
                catch(e) { toast.error(e.response?.data?.error || 'Failed'); }
              }}
              onAdd={() => setModal({ type: 'quiz' })}
            />
          )}

          {/* ── ANNOUNCEMENTS ── */}
          {tab === 'announcements' && (
            <AnnouncementsTab
              announcements={announcements} canCreate={canCreate}
              onDelete={(id) => handleDelete('announcements', id)}
              onAdd={() => setModal({ type: 'announcement' })}
            />
          )}

          {/* ── MY GRADES (student) ── */}
          {tab === 'grades' && isStudent && myGrades && (
            <GradesTab grades={myGrades} />
          )}

          {/* ── SUBMISSIONS (faculty) ── */}
          {tab === 'submissions' && !isStudent && (
            <SubmissionsTab
              assignments={assignments}
              onGrade={(sub, asgn) => setModal({ type: 'grade', data: { sub, asgn } })}
            />
          )}
        </>
      )}

      {/* Modals */}
      {modal?.type === 'assignment'   && <AddAssignmentModal   courses={courses} onClose={closeModal} />}
      {modal?.type === 'resource'     && <AddResourceModal     courses={courses} onClose={closeModal} />}
      {modal?.type === 'quiz'         && <AddQuizModal         courses={courses} onClose={closeModal} />}
      {modal?.type === 'announcement' && <AddAnnouncementModal courses={courses} onClose={closeModal} />}
      {modal?.type === 'grade'        && <GradeModal sub={modal.data.sub} asgn={modal.data.asgn} onClose={closeModal} />}
      {modal?.type === 'submissions'  && <SubmissionsModal assignment={modal.data} onClose={closeModal} onGrade={(sub) => setModal({ type: 'grade', data: { sub, asgn: modal.data } })} />}
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────
function OverviewTab({ overview, user, isStudent, onTabSwitch }) {
  if (isStudent) {
    const { courses = [], upcoming = [], recentGrades = [] } = overview;
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(c => {
            const pct = c.active_assignments > 0 ? Math.round(100 * c.submitted_count / c.active_assignments) : 100;
            return (
              <div key={c.id} className="card flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div><p className="font-bold">{c.name}</p><p className="text-xs text-gray-400">{c.code}</p></div>
                  <span className="text-xs bg-msrim-blue/10 text-msrim-blue px-2 py-0.5 rounded-full font-medium">{pct}% done</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-msrim-blue transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>📋 {c.active_assignments} assignments</span>
                  <span>📚 {c.resources} resources</span>
                </div>
              </div>
            );
          })}
          {courses.length === 0 && <div className="card col-span-3 text-center py-10 text-gray-400">No courses found for your program &amp; semester.</div>}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-msrim-orange" /> Upcoming Deadlines</h3>
            {upcoming.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No upcoming assignments</p>}
            {upcoming.map(a => {
              const days = daysUntil(a.due_date);
              return (
                <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{a.title}</p>
                    <p className="text-xs text-gray-400">{a.course_name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {a.submitted_id
                      ? <span className="badge-green text-xs">Submitted</span>
                      : <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${urgencyClass(days)}`}>{urgencyLabel(days)}</span>
                    }
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-purple-500" /> Recent Grades</h3>
            {recentGrades.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No grades yet</p>}
            {recentGrades.map((g, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{g.title}</p>
                  <p className="text-xs text-gray-400">{g.course_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-msrim-blue">{g.marks_obtained}/{g.total_marks}</p>
                  <p className="text-xs text-gray-400">{Math.round(100*g.marks_obtained/g.total_marks)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Faculty / Admin overview
  const { courses = [], pendingSubmissions = [], pendingGrade } = overview;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map(c => (
          <div key={c.id} className="card flex flex-col gap-3">
            <div>
              <p className="font-bold">{c.name}</p>
              <p className="text-xs text-gray-400">{c.code} · Semester {c.semester}</p>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="text-center"><p className="font-bold text-msrim-blue">{c.assignments}</p><p className="text-xs text-gray-400">Assignments</p></div>
              <div className="text-center"><p className={`font-bold ${c.pending_grade > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{c.pending_grade}</p><p className="text-xs text-gray-400">To Grade</p></div>
              <div className="text-center"><p className="font-bold text-green-600">{c.resources}</p><p className="text-xs text-gray-400">Resources</p></div>
            </div>
          </div>
        ))}
        {courses.length === 0 && <div className="card col-span-3 text-center py-10 text-gray-400">No courses assigned yet.</div>}
      </div>
      {pendingSubmissions.length > 0 && (
        <div className="card">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Pending Grading ({pendingSubmissions.length})</h3>
          <div className="space-y-2">
            {pendingSubmissions.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium">{s.student_name} <span className="text-gray-400">·</span> <span className="text-gray-500">{s.assignment_title}</span></p>
                  <p className="text-xs text-gray-400">{s.course_name} · {new Date(s.submitted_at).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Assignments Tab ────────────────────────────────────────────────────────────
function AssignmentsTab({ assignments, user, isStudent, canCreate, onSubmit, onStatusChange, onDelete, onViewSubmissions, onAdd }) {
  const [statusFilter, setStatusFilter] = useState('');
  const filtered = statusFilter ? assignments.filter(a => a.status === statusFilter) : assignments;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['', 'active', 'closed', 'draft'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter===s ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {canCreate && <button className="btn-primary text-sm py-2" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> New Assignment</button>}
      </div>

      {filtered.length === 0 && <div className="card text-center py-16 text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No assignments found</p></div>}

      {filtered.map(a => {
        const days = daysUntil(a.due_date);
        const sub = a.my_submission;
        return (
          <div key={a.id} className={`card border-l-4 ${a.is_overdue && a.status === 'active' ? 'border-l-red-400' : a.status === 'active' ? 'border-l-green-400' : a.status === 'closed' ? 'border-l-gray-300' : 'border-l-yellow-300'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-gray-900">{a.title}</h3>
                  <span className={STATUS_BADGE[a.status] || 'badge-gray'}>{a.status}</span>
                  <span className="badge-blue">{a.type}</span>
                  {a.is_overdue && a.status === 'active' && <span className="badge-red">Overdue</span>}
                </div>
                <p className="text-sm text-gray-500">{a.course_name} · <span className="text-gray-400">By {a.faculty_name}</span></p>
                {a.description && <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">{a.description}</p>}
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  {a.due_date && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${urgencyClass(days)}`}>
                      📅 {new Date(a.due_date).toLocaleDateString()} · {urgencyLabel(days)}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">Max: {a.total_marks} marks</span>
                  {!isStudent && <span className="text-xs text-gray-400">📤 {a.submission_count} submissions</span>}
                </div>
              </div>

              {/* Student actions */}
              {isStudent && (
                <div className="flex flex-col items-end gap-2">
                  {sub ? (
                    <div className="text-right">
                      <span className={STATUS_BADGE[sub.status] || 'badge-gray'}>{sub.status}</span>
                      {sub.marks_obtained != null && (
                        <p className="text-sm font-bold text-msrim-blue mt-1">{sub.marks_obtained}/{a.total_marks} marks</p>
                      )}
                      {sub.feedback && <p className="text-xs text-gray-500 mt-0.5 max-w-40 text-right">{sub.feedback}</p>}
                    </div>
                  ) : a.status === 'active' ? (
                    <button onClick={() => onSubmit(a.id)} className="btn-primary py-1.5 text-sm">
                      <Send className="w-3 h-3" /> Submit
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">Not submitted</span>
                  )}
                </div>
              )}

              {/* Faculty actions */}
              {canCreate && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {a.status === 'draft' && <button onClick={() => onStatusChange('assignments', a.id, 'active')} className="btn-primary py-1 px-3 text-xs"><Play className="w-3 h-3" /> Publish</button>}
                  {a.status === 'active' && <button onClick={() => onStatusChange('assignments', a.id, 'closed')} className="btn-secondary py-1 px-3 text-xs"><Square className="w-3 h-3" /> Close</button>}
                  {a.status === 'closed' && <button onClick={() => onStatusChange('assignments', a.id, 'active')} className="btn-secondary py-1 px-3 text-xs"><Play className="w-3 h-3" /> Reopen</button>}
                  <button onClick={() => onViewSubmissions(a)} className="btn-secondary py-1 px-3 text-xs"><Eye className="w-3 h-3" /> Submissions ({a.submission_count})</button>
                  <button onClick={() => onDelete('assignments', a.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Resources Tab ──────────────────────────────────────────────────────────────
function ResourcesTab({ resources, canCreate, onDelete, onAdd }) {
  const [typeFilter, setTypeFilter] = useState('');
  const filtered = typeFilter ? resources.filter(r => r.resource_type === typeFilter) : resources;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
          {['', 'document', 'pdf', 'video', 'link', 'presentation', 'other'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap ${typeFilter===t ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
              {t || 'All'} {t && `(${resources.filter(r => r.resource_type===t).length})`}
            </button>
          ))}
        </div>
        {canCreate && <button className="btn-primary text-sm py-2" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Add Resource</button>}
      </div>

      {filtered.length === 0 && <div className="card text-center py-16 text-gray-400"><BookMarked className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No resources found</p></div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(r => {
          const Icon = RESOURCE_ICONS[r.resource_type] || BookOpen;
          const colorCls = RESOURCE_COLORS[r.resource_type] || 'bg-gray-50 text-gray-600';
          return (
            <div key={r.id} className="card flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${colorCls}`}><Icon className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{r.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{r.course_name}</p>
                  {r.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{r.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r.resource_type}</span>
                <span className="text-xs text-gray-400">👁 {r.view_count} views</span>
                <span className="text-xs text-gray-400 ml-auto">{r.faculty_name}</span>
              </div>
              <div className="flex gap-2 pt-1 border-t border-gray-100">
                {r.url && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    onClick={() => api.put(`/lms/resources/${r.id}/view`).catch(() => {})}
                    className="btn-primary text-xs py-1.5 flex-1 justify-center">
                    <Eye className="w-3 h-3" /> Open
                  </a>
                )}
                {canCreate && <button onClick={() => onDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quizzes Tab ────────────────────────────────────────────────────────────────
function QuizzesTab({ quizzes, isStudent, canCreate, onStatusChange, onAttempt, onAdd }) {
  const [statusFilter, setStatusFilter] = useState('');
  const filtered = statusFilter ? quizzes.filter(q => q.status === statusFilter) : quizzes;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {['', 'active', 'draft', 'closed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${statusFilter===s ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        {canCreate && <button className="btn-primary text-sm py-2" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> New Quiz</button>}
      </div>

      {filtered.length === 0 && <div className="card text-center py-16 text-gray-400"><FileText className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No quizzes found</p></div>}

      {filtered.map(q => {
        const att = q.my_attempt;
        return (
          <div key={q.id} className={`card border-l-4 ${q.status === 'active' ? 'border-l-green-400' : q.status === 'closed' ? 'border-l-gray-300' : 'border-l-yellow-300'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold">{q.title}</h3>
                  <span className={STATUS_BADGE[q.status] || 'badge-gray'}>{q.status}</span>
                </div>
                <p className="text-sm text-gray-500">{q.course_name} · By {q.faculty_name}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  <span>⏱ {q.duration_minutes} min</span>
                  <span>📊 {q.total_marks} marks</span>
                  {q.start_time && <span>🕐 Starts: {new Date(q.start_time).toLocaleString()}</span>}
                  {q.end_time && <span>🕐 Ends: {new Date(q.end_time).toLocaleString()}</span>}
                  {!isStudent && <span>👥 {q.attempt_count} attempts</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {isStudent && (
                  att ? (
                    <div className="text-right">
                      <span className={STATUS_BADGE[att.status] || 'badge-gray'}>{att.status}</span>
                      {att.score != null && <p className="text-sm font-bold text-msrim-blue mt-1">{att.score}/{q.total_marks}</p>}
                    </div>
                  ) : q.status === 'active' ? (
                    <button onClick={() => onAttempt(q.id)} className="btn-primary py-1.5 text-sm">
                      <Play className="w-3 h-3" /> Start Quiz
                    </button>
                  ) : null
                )}
                {canCreate && (
                  <>
                    {q.status === 'draft' && <button onClick={() => onStatusChange('quizzes', q.id, 'active')} className="btn-primary py-1 px-3 text-xs"><Play className="w-3 h-3" /> Activate</button>}
                    {q.status === 'active' && <button onClick={() => onStatusChange('quizzes', q.id, 'closed')} className="btn-secondary py-1 px-3 text-xs"><Square className="w-3 h-3" /> Close</button>}
                    {q.status === 'closed' && <button onClick={() => onStatusChange('quizzes', q.id, 'active')} className="btn-secondary py-1 px-3 text-xs"><Play className="w-3 h-3" /> Reopen</button>}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Announcements Tab ──────────────────────────────────────────────────────────
function AnnouncementsTab({ announcements, canCreate, onDelete, onAdd }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canCreate && <button className="btn-primary text-sm py-2" onClick={onAdd}><Plus className="w-3.5 h-3.5" /> Post Announcement</button>}
      </div>
      {announcements.length === 0 && <div className="card text-center py-16 text-gray-400"><Megaphone className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No announcements</p></div>}
      {announcements.map(a => (
        <div key={a.id} className={`card border-l-4 ${a.priority === 'urgent' ? 'border-l-red-400' : a.priority === 'important' ? 'border-l-orange-400' : 'border-l-blue-300'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {a.pinned === 1 && <Pin className="w-3.5 h-3.5 text-msrim-orange" />}
                <h3 className="font-bold">{a.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${PRIORITY_STYLES[a.priority]}`}>{a.priority}</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{a.course_name} · {a.faculty_name} · {new Date(a.created_at).toLocaleDateString()}</p>
              {a.content && <p className="text-sm text-gray-700 leading-relaxed">{a.content}</p>}
            </div>
            {canCreate && <button onClick={() => onDelete(a.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── My Grades Tab ──────────────────────────────────────────────────────────────
function GradesTab({ grades }) {
  const { assignments = [], quizzes = [] } = grades;
  const totalEarned = assignments.reduce((s, g) => s + (g.marks_obtained || 0), 0);
  const totalMax    = assignments.reduce((s, g) => s + (g.total_marks || 0), 0);
  return (
    <div className="space-y-5">
      {totalMax > 0 && (
        <div className="card bg-gradient-to-r from-msrim-blue to-msrim-blue-light text-white">
          <div className="flex items-center justify-between">
            <div><p className="text-blue-100 text-sm">Overall Score (graded assignments)</p>
              <p className="text-3xl font-bold mt-1">{totalEarned} / {totalMax}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{Math.round(100*totalEarned/totalMax)}%</p>
              <p className="text-blue-100 text-sm mt-1">{assignments.filter(g=>g.status==='graded').length} graded</p>
            </div>
          </div>
        </div>
      )}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold">Assignment Grades</h3></div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="table-th">Assignment</th><th className="table-th">Course</th><th className="table-th">Type</th>
            <th className="table-th">Marks</th><th className="table-th">%</th><th className="table-th">Status</th><th className="table-th">Feedback</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {assignments.length === 0 && <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">No submissions yet</td></tr>}
            {assignments.map((g, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="table-td font-medium">{g.title}</td>
                <td className="table-td text-sm">{g.course_name}</td>
                <td className="table-td"><span className="badge-blue">{g.type}</span></td>
                <td className="table-td font-bold">{g.marks_obtained != null ? `${g.marks_obtained}/${g.total_marks}` : '—'}</td>
                <td className="table-td">{g.marks_obtained != null ? <span className={`font-bold ${100*g.marks_obtained/g.total_marks >= 60 ? 'text-green-600' : 'text-red-600'}`}>{Math.round(100*g.marks_obtained/g.total_marks)}%</span> : '—'}</td>
                <td className="table-td"><span className={STATUS_BADGE[g.status] || 'badge-gray'}>{g.status}</span></td>
                <td className="table-td text-xs text-gray-500 max-w-32 truncate">{g.feedback || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {quizzes.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold">Quiz Scores</h3></div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr><th className="table-th">Quiz</th><th className="table-th">Course</th><th className="table-th">Score</th><th className="table-th">%</th><th className="table-th">Status</th></tr></thead>
            <tbody className="divide-y divide-gray-50">
              {quizzes.map((q, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{q.title}</td>
                  <td className="table-td text-sm">{q.course_name}</td>
                  <td className="table-td font-bold">{q.score != null ? `${q.score}/${q.total_marks}` : '—'}</td>
                  <td className="table-td">{q.score != null ? `${Math.round(100*q.score/q.total_marks)}%` : '—'}</td>
                  <td className="table-td"><span className={STATUS_BADGE[q.status] || 'badge-gray'}>{q.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Submissions Tab (faculty) ──────────────────────────────────────────────────
function SubmissionsTab({ assignments, onGrade }) {
  const [selectedAsgn, setSelectedAsgn] = useState(null);
  const [subs, setSubs] = useState(null);
  const [loading, setLoading] = useState(false);

  async function loadSubs(a) {
    setSelectedAsgn(a); setLoading(true);
    try {
      const r = await api.get(`/lms/assignments/${a.id}/submissions`);
      setSubs(r.data);
    } catch { toast.error('Failed to load submissions'); }
    finally { setLoading(false); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Select Assignment</p>
        {assignments.filter(a => a.status !== 'draft').map(a => (
          <button key={a.id} onClick={() => loadSubs(a)}
            className={`w-full text-left p-3 rounded-xl border transition-all ${selectedAsgn?.id === a.id ? 'border-msrim-blue bg-msrim-blue/5' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
            <p className="font-medium text-sm truncate">{a.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{a.course_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={STATUS_BADGE[a.status]}>{a.status}</span>
              <span className="text-xs text-gray-400">{a.submission_count} submissions</span>
            </div>
          </button>
        ))}
        {assignments.filter(a => a.status !== 'draft').length === 0 && <p className="text-sm text-gray-400 text-center py-4">No active assignments</p>}
      </div>
      <div className="lg:col-span-2">
        {!selectedAsgn && <div className="card text-center py-20 text-gray-400"><Users className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Select an assignment to view submissions</p></div>}
        {loading && <div className="card text-center py-20"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>}
        {subs && !loading && (
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{subs.assignment?.title}</h3>
                <p className="text-xs text-gray-400">Max marks: {subs.assignment?.total_marks} · {subs.submissions.length} submissions</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="table-th">Student</th><th className="table-th">Roll</th><th className="table-th">Section</th>
                  <th className="table-th">Submitted</th><th className="table-th">Status</th><th className="table-th">Marks</th><th className="table-th">Action</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {subs.submissions.length === 0 && <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">No submissions yet</td></tr>}
                  {subs.submissions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{s.student_name}</td>
                      <td className="table-td text-sm">{s.roll_number}</td>
                      <td className="table-td">{s.section}</td>
                      <td className="table-td text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                      <td className="table-td"><span className={STATUS_BADGE[s.status] || 'badge-gray'}>{s.status}</span></td>
                      <td className="table-td font-bold">{s.marks_obtained != null ? `${s.marks_obtained}/${subs.assignment?.total_marks}` : '—'}</td>
                      <td className="table-td">
                        {s.status !== 'graded'
                          ? <button onClick={() => onGrade(s, subs.assignment)} className="btn-primary py-1 px-2 text-xs"><Edit2 className="w-3 h-3" /> Grade</button>
                          : <button onClick={() => onGrade(s, subs.assignment)} className="btn-secondary py-1 px-2 text-xs"><Edit2 className="w-3 h-3" /> Edit</button>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Submissions Modal ──────────────────────────────────────────────────────────
function SubmissionsModal({ assignment, onClose, onGrade }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get(`/lms/assignments/${assignment.id}/submissions`).then(r => setData(r.data)).catch(() => {});
  }, [assignment.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div><h2 className="font-bold text-xl">Submissions</h2><p className="text-sm text-gray-400">{assignment.title} · Max {assignment.total_marks} marks</p></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {!data ? <div className="p-8 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div> : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b sticky top-0"><tr>
                <th className="table-th">Student</th><th className="table-th">Section</th>
                <th className="table-th">Submitted</th><th className="table-th">Status</th><th className="table-th">Marks</th><th className="table-th">Grade</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {data.submissions.length === 0 && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-8">No submissions</td></tr>}
                {data.submissions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td"><p className="font-medium">{s.student_name}</p><p className="text-xs text-gray-400">{s.enrollment_number}</p></td>
                    <td className="table-td">{s.section}</td>
                    <td className="table-td text-xs">{new Date(s.submitted_at).toLocaleDateString()}</td>
                    <td className="table-td"><span className={STATUS_BADGE[s.status] || 'badge-gray'}>{s.status}</span></td>
                    <td className="table-td font-bold">{s.marks_obtained != null ? s.marks_obtained : '—'}</td>
                    <td className="table-td"><button onClick={() => onGrade(s)} className="btn-primary py-1 px-2 text-xs"><Edit2 className="w-3 h-3" /> {s.status === 'graded' ? 'Edit' : 'Grade'}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grade Modal ────────────────────────────────────────────────────────────────
function GradeModal({ sub, asgn, onClose }) {
  const [marks, setMarks] = useState(sub.marks_obtained ?? '');
  const [feedback, setFeedback] = useState(sub.feedback ?? '');
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/lms/submissions/${sub.id}/grade`, { marks_obtained: parseFloat(marks), feedback });
      toast.success('Graded!'); onClose();
    } catch(e) { toast.error('Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Grade Submission</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-medium">{sub.student_name}</p>
            <p className="text-sm text-gray-500">{asgn?.title} · Max {asgn?.total_marks} marks</p>
            {sub.notes && <p className="text-xs text-gray-500 mt-1">Notes: {sub.notes}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Marks Obtained * (max {asgn?.total_marks})</label>
            <input required type="number" min="0" max={asgn?.total_marks} step="0.5"
              value={marks} onChange={e => setMarks(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Feedback</label>
            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} className="input-field" rows={3} placeholder="Comments for the student…" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Grade'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Modals ─────────────────────────────────────────────────────────────────
function AddAssignmentModal({ courses, onClose }) {
  const [form, setForm] = useState({ title:'', description:'', course_id:'', due_date:'', total_marks:'100', type:'assignment', academic_year_id:'1' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/lms/assignments', form); toast.success('Assignment created!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Create Assignment</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={e=>set('type',e.target.value)} className="select-field">{['assignment','project','case_study','presentation'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Due Date</label><input type="date" value={form.due_date} onChange={e=>set('due_date',e.target.value)} className="input-field" min={new Date().toISOString().split('T')[0]} /></div>
          <div><label className="block text-sm font-medium mb-1">Total Marks</label><input type="number" value={form.total_marks} onChange={e=>set('total_marks',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description / Instructions</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating…':'Create'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddResourceModal({ courses, onClose }) {
  const [form, setForm] = useState({ title:'', description:'', course_id:'', resource_type:'document', url:'', academic_year_id:'1' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/lms/resources', form); toast.success('Resource shared!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Share Resource</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.resource_type} onChange={e=>set('resource_type',e.target.value)} className="select-field">{['document','pdf','video','link','presentation','other'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">URL / Link *</label><input required value={form.url} onChange={e=>set('url',e.target.value)} className="input-field" placeholder="https://…" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={2} /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Sharing…':'Share'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddQuizModal({ courses, onClose }) {
  const [form, setForm] = useState({ title:'', course_id:'', total_marks:'20', duration_minutes:'30', start_time:'', end_time:'', academic_year_id:'1' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/lms/quizzes', form); toast.success('Quiz created!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Create Quiz</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Total Marks</label><input type="number" value={form.total_marks} onChange={e=>set('total_marks',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Duration (min)</label><input type="number" value={form.duration_minutes} onChange={e=>set('duration_minutes',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Start Time</label><input type="datetime-local" value={form.start_time} onChange={e=>set('start_time',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">End Time</label><input type="datetime-local" value={form.end_time} onChange={e=>set('end_time',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating…':'Create Quiz'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddAnnouncementModal({ courses, onClose }) {
  const [form, setForm] = useState({ title:'', content:'', course_id:'', priority:'normal', pinned: false });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/lms/announcements', form); toast.success('Announcement posted!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Post Announcement</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Priority</label>
            <select value={form.priority} onChange={e=>set('priority',e.target.value)} className="select-field">
              <option value="normal">Normal</option>
              <option value="important">Important</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Content</label><textarea value={form.content} onChange={e=>set('content',e.target.value)} className="input-field" rows={4} placeholder="Type your announcement here…" /></div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="pinned" checked={form.pinned} onChange={e=>set('pinned',e.target.checked)} className="rounded" />
            <label htmlFor="pinned" className="text-sm text-gray-700">Pin this announcement</label>
          </div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Posting…':'Post'}</button></div>
        </form>
      </div>
    </div>
  );
}
