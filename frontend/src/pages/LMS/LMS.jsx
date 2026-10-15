import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { BookMarked, ClipboardList, FileText, Youtube, Plus, Send, Check, X, Award } from 'lucide-react';

export default function LMS() {
  const { user } = useAuth();
  const [tab, setTab] = useState('assignments');
  const [assignments, setAssignments] = useState([]);
  const [resources, setResources] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddAsn, setShowAddAsn] = useState(false);
  const [showAddRes, setShowAddRes] = useState(false);
  const [showAddQuiz, setShowAddQuiz] = useState(false);

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    setLoading(true);
    try {
      const [a, r, q, s] = await Promise.all([
        api.get('/lms/assignments'), api.get('/lms/resources'),
        api.get('/lms/quizzes'), api.get('/lms/stats')
      ]);
      setAssignments(a.data); setResources(r.data); setQuizzes(q.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  async function handleSubmit(assignmentId) {
    try { await api.post(`/lms/assignments/${assignmentId}/submit`, { notes: 'Submitted via portal' }); toast.success('Assignment submitted!'); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error || 'Already submitted'); }
  }

  const canCreate = ['faculty','admin','hod'].includes(user.role);

  const tabs = [
    { id: 'assignments', label: 'Assignments', icon: ClipboardList, count: stats?.assignments },
    { id: 'resources', label: 'Resources', icon: BookMarked, count: stats?.resources },
    { id: 'quizzes', label: 'Quizzes', icon: FileText, count: stats?.quizzes },
  ];

  const resourceIcons = { document: '📄', pdf: '📋', video: '🎬', link: '🔗', presentation: '📊', other: '📎' };
  const statusColors = { active: 'badge-green', closed: 'badge-red', draft: 'badge-gray' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Learning Management System</h1>
          <p className="text-gray-500 text-sm mt-1">Assignments, Resources & Quizzes</p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <button className="btn-secondary text-sm py-2" onClick={() => setShowAddRes(true)}><Plus className="w-4 h-4" /> Resource</button>
            <button className="btn-secondary text-sm py-2" onClick={() => setShowAddQuiz(true)}><Plus className="w-4 h-4" /> Quiz</button>
            <button className="btn-primary text-sm py-2" onClick={() => setShowAddAsn(true)}><Plus className="w-4 h-4" /> Assignment</button>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Assignments</p><p className="text-3xl font-bold text-msrim-blue">{stats.assignments}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Resources</p><p className="text-3xl font-bold text-green-600">{stats.resources}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Quizzes</p><p className="text-3xl font-bold text-msrim-orange">{stats.quizzes}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Submissions</p><p className="text-3xl font-bold text-purple-600">{stats.submissions}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${tab===t.id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            <t.icon className="w-4 h-4" /> {t.label} {t.count!==undefined && <span className="text-xs bg-gray-200 rounded-full px-1.5">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'assignments' && (
        <div className="space-y-4">
          {loading ? <div className="card text-center py-12"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
          : assignments.map(a => (
            <div key={a.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{a.title}</h3>
                    <span className={statusColors[a.status] || 'badge-gray'}>{a.status}</span>
                    <span className="badge-blue">{a.type}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{a.course_name} · By {a.faculty_name}</p>
                  {a.description && <p className="text-gray-600 text-sm mt-2 line-clamp-2">{a.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {a.due_date && <span>⏰ Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                    <span>📊 Max Marks: {a.total_marks}</span>
                    {a.submission_count !== undefined && <span>📤 {a.submission_count} submissions</span>}
                  </div>
                </div>
                {user.role === 'student' && a.status === 'active' && (
                  <button onClick={() => handleSubmit(a.id)} className="btn-primary py-1.5 text-sm ml-4 flex-shrink-0">
                    <Send className="w-3 h-3" /> Submit
                  </button>
                )}
              </div>
            </div>
          ))}
          {!loading && !assignments.length && <div className="card text-center py-12 text-gray-400">No assignments</div>}
        </div>
      )}

      {tab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map(r => (
            <div key={r.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start gap-3">
                <div className="text-3xl">{resourceIcons[r.resource_type] || '📎'}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{r.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{r.course_name} · {r.faculty_name}</p>
                  {r.description && <p className="text-gray-600 text-xs mt-1 line-clamp-2">{r.description}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="badge-blue text-xs">{r.resource_type}</span>
                    <span className="text-xs text-gray-400">👁️ {r.view_count} views</span>
                  </div>
                </div>
              </div>
              {r.url && <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-3 btn-secondary text-xs py-1.5 w-full justify-center">Open Resource</a>}
            </div>
          ))}
          {!resources.length && <div className="card col-span-3 text-center py-12 text-gray-400">No resources shared yet</div>}
        </div>
      )}

      {tab === 'quizzes' && (
        <div className="space-y-4">
          {quizzes.map(q => (
            <div key={q.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold">{q.title}</h3>
                    <span className={statusColors[q.status] || 'badge-gray'}>{q.status}</span>
                  </div>
                  <p className="text-gray-500 text-sm">{q.course_name} · By {q.faculty_name}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>⏱️ {q.duration_minutes} minutes</span>
                    <span>📊 {q.total_marks} marks</span>
                    {q.start_time && <span>🕐 {q.start_time}</span>}
                  </div>
                </div>
                {user.role === 'student' && q.status === 'active' && (
                  <button className="btn-orange py-1.5 text-sm flex-shrink-0">Start Quiz</button>
                )}
              </div>
            </div>
          ))}
          {!quizzes.length && <div className="card text-center py-12 text-gray-400">No quizzes available</div>}
        </div>
      )}

      {showAddAsn && <AddAssignmentModal onClose={() => { setShowAddAsn(false); fetchData(); }} />}
      {showAddRes && <AddResourceModal onClose={() => { setShowAddRes(false); fetchData(); }} />}
      {showAddQuiz && <AddQuizModal onClose={() => { setShowAddQuiz(false); fetchData(); }} />}
    </div>
  );
}

function AddAssignmentModal({ onClose }) {
  const [form, setForm] = useState({ title:'',description:'',course_id:'',due_date:'',total_marks:'100',type:'assignment',academic_year_id:'1' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);
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
          <div><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={e=>set('type',e.target.value)} className="select-field">{['assignment','project','case_study','presentation'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Due Date</label><input type="date" value={form.due_date} onChange={e=>set('due_date',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Total Marks</label><input type="number" value={form.total_marks} onChange={e=>set('total_marks',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating...':'Create'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddResourceModal({ onClose }) {
  const [form, setForm] = useState({ title:'',description:'',course_id:'',resource_type:'document',url:'',academic_year_id:'1' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);
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
          <div><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.resource_type} onChange={e=>set('resource_type',e.target.value)} className="select-field">{['document','pdf','video','link','presentation','other'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">URL / Link</label><input value={form.url} onChange={e=>set('url',e.target.value)} className="input-field" placeholder="https://..." /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={2} /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Sharing...':'Share'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddQuizModal({ onClose }) {
  const [form, setForm] = useState({ title:'',course_id:'',total_marks:'20',duration_minutes:'30',academic_year_id:'1' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);
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
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Total Marks</label><input type="number" value={form.total_marks} onChange={e=>set('total_marks',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Duration (min)</label><input type="number" value={form.duration_minutes} onChange={e=>set('duration_minutes',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating...':'Create Quiz'}</button></div>
        </form>
      </div>
    </div>
  );
}
