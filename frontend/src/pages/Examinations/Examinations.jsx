import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, FileText, TrendingUp, X, Save } from 'lucide-react';

export default function Examinations() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('exams');
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/examinations'), api.get('/examinations/results')])
      .then(([e, r]) => { setExams(e.data); setResults(r.data); }).finally(() => setLoading(false));
  }, []);

  const gradeColors = { O:'text-green-700', 'A+':'text-green-600', A:'text-blue-600', 'B+':'text-blue-500', B:'text-yellow-600', C:'text-orange-500', F:'text-red-600' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Examinations</h1>
          <p className="text-gray-500 text-sm mt-1">{exams.length} examinations scheduled</p>
        </div>
        {['admin','registrar','faculty','hod'].includes(user.role) && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Schedule Exam</button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['exams','results'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${tab===t ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'exams' ? 'Schedule' : 'Results'}
          </button>
        ))}
      </div>

      {tab === 'exams' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Exam Name</th><th className="table-th">Type</th>
                <th className="table-th">Course</th><th className="table-th">Date</th>
                <th className="table-th">Time</th><th className="table-th">Marks</th><th className="table-th">Room</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? <tr><td colSpan={7} className="table-td text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : exams.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{e.name}</td>
                    <td className="table-td"><span className={`badge-${e.exam_type==='endterm'?'red':e.exam_type==='midterm'?'yellow':'blue'}`}>{e.exam_type}</span></td>
                    <td className="table-td"><p>{e.course_name}</p><p className="text-xs text-gray-400">{e.course_code}</p></td>
                    <td className="table-td">{e.exam_date ? new Date(e.exam_date).toLocaleDateString() : '—'}</td>
                    <td className="table-td text-xs">{e.start_time} - {e.end_time}</td>
                    <td className="table-td">{e.total_marks} <span className="text-gray-400 text-xs">(Pass: {e.passing_marks})</span></td>
                    <td className="table-td">{e.room || '—'}</td>
                  </tr>
                ))}
                {!loading && !exams.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No exams scheduled</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'results' && (
        <div className="space-y-4">
          {['admin','registrar','faculty'].includes(user.role) && <EnterResults exams={exams} />}
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  {user.role !== 'student' && <th className="table-th">Student</th>}
                  <th className="table-th">Exam</th><th className="table-th">Course</th>
                  <th className="table-th">Type</th><th className="table-th">Marks</th>
                  <th className="table-th">Grade</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {results.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      {user.role !== 'student' && <td className="table-td"><p className="font-medium">{r.student_name}</p><p className="text-xs text-gray-400">{r.enrollment_number}</p></td>}
                      <td className="table-td">{r.exam_name}</td>
                      <td className="table-td"><p>{r.course_name}</p><p className="text-xs text-gray-400">{r.course_code}</p></td>
                      <td className="table-td"><span className="badge-blue">{r.exam_type}</span></td>
                      <td className="table-td font-semibold">{r.marks_obtained} / {r.total_marks}</td>
                      <td className="table-td"><span className={`text-lg font-bold ${gradeColors[r.grade] || 'text-gray-700'}`}>{r.grade}</span></td>
                    </tr>
                  ))}
                  {!results.length && <tr><td colSpan={6} className="table-td text-center py-8 text-gray-400">No results available</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showAdd && <AddExamModal onClose={() => setShowAdd(false)} onAdd={() => api.get('/examinations').then(r => setExams(r.data))} />}
    </div>
  );
}

function EnterResults({ exams }) {
  const [selectedExam, setSelectedExam] = useState('');
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [saving, setSaving] = useState(false);

  async function loadStudents() {
    if (!selectedExam) return;
    const exam = exams.find(e => e.id === parseInt(selectedExam));
    if (!exam) return;
    const courseRes = await api.get('/courses');
    const course = courseRes.data.find(c => c.id === exam.course_id);
    if (!course) return;
    const stuRes = await api.get('/students', { params: { semester: course.semester } });
    setStudents(stuRes.data);
    setMarks({});
  }

  useEffect(() => { loadStudents(); }, [selectedExam]);

  async function saveResults() {
    if (!selectedExam) return;
    setSaving(true);
    try {
      const results = Object.entries(marks).filter(([,m]) => m !== '').map(([stuId, m]) => ({
        student_id: parseInt(stuId), examination_id: parseInt(selectedExam), marks_obtained: parseFloat(m)
      }));
      await api.post('/examinations/results', { results });
      toast.success('Results saved!');
    } catch { toast.error('Failed to save results'); }
    finally { setSaving(false); }
  }

  return (
    <div className="card">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-msrim-orange" /> Enter Results</h3>
      <div className="flex gap-4 items-end mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Examination</label>
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="select-field">
            <option value="">Choose exam...</option>
            {exams.map(e => <option key={e.id} value={e.id}>{e.course_code} - {e.name} ({e.exam_type})</option>)}
          </select>
        </div>
        <button onClick={saveResults} disabled={saving || !selectedExam} className="btn-primary"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Results'}</button>
      </div>
      {students.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b"><th className="table-th">Student</th><th className="table-th">Enrollment</th><th className="table-th">Marks</th></tr></thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id} className="border-b">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td text-xs">{s.enrollment_number}</td>
                  <td className="table-td w-32">
                    <input type="number" min="0" max="100" value={marks[s.id] || ''} onChange={e => setMarks(m => ({...m,[s.id]:e.target.value}))}
                      className="input-field w-24" placeholder="—" />
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

function AddExamModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name:'',exam_type:'midterm',course_id:'',academic_year_id:'1',exam_date:'',start_time:'09:00',end_time:'12:00',total_marks:'100',passing_marks:'40',room:'' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/examinations', form);
      toast.success('Exam scheduled!'); onAdd(); onClose();
    } catch(err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Schedule Examination</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Exam Name <span className="text-red-500">*</span></label>
            <input required value={form.name} onChange={e => set('name',e.target.value)} className="input-field" placeholder="Mid-Term Examination" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.exam_type} onChange={e => set('exam_type',e.target.value)} className="select-field">
              {['midterm','endterm','internal','practical','assignment'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Course <span className="text-red-500">*</span></label>
            <select required value={form.course_id} onChange={e => set('course_id',e.target.value)} className="select-field">
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Exam Date</label>
            <input type="date" value={form.exam_date} onChange={e => set('exam_date',e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Room</label>
            <input value={form.room} onChange={e => set('room',e.target.value)} className="input-field" placeholder="Hall A" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Total Marks</label>
            <input type="number" value={form.total_marks} onChange={e => set('total_marks',e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Passing Marks</label>
            <input type="number" value={form.passing_marks} onChange={e => set('passing_marks',e.target.value)} className="input-field" />
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Scheduling...' : 'Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
