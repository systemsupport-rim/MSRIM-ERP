import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { BookOpen, Plus, X, Users, Clock } from 'lucide-react';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [semFilter, setSemFilter] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)).finally(() => setLoading(false)); }, []);

  const filtered = semFilter ? courses.filter(c => c.semester === parseInt(semFilter)) : courses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courses</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} courses</p>
        </div>
        {['admin', 'registrar', 'hod'].includes(user.role) && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Course</button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setSemFilter('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!semFilter ? 'bg-msrim-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {[1, 2, 3, 4].map(s => (
          <button key={s} onClick={() => setSemFilter(s.toString())} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${semFilter === s.toString() ? 'bg-msrim-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semester {s}</button>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Code</th><th className="table-th">Course Name</th>
              <th className="table-th">Program</th><th className="table-th">Semester</th>
              <th className="table-th">Credits</th><th className="table-th">Type</th>
              <th className="table-th">Faculty</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="table-td text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : filtered.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="table-td font-mono text-xs font-bold text-msrim-blue">{c.code}</td>
                    <td className="table-td font-medium">{c.name}</td>
                    <td className="table-td"><span className="badge-blue">{c.program_name}</span></td>
                    <td className="table-td">Semester {c.semester}</td>
                    <td className="table-td font-semibold">{c.credits}</td>
                    <td className="table-td"><span className={c.type === 'core' ? 'badge-blue' : c.type === 'lab' ? 'badge-green' : 'badge-orange'}>{c.type}</span></td>
                    <td className="table-td">{c.faculty_name || <span className="text-gray-400">Not assigned</span>}</td>
                  </tr>
                ))}
              {!loading && !filtered.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No courses found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {selected && <CourseDetailModal course={selected} onClose={() => setSelected(null)} />}
      {showAdd && <AddCourseModal onClose={() => { setShowAdd(false); api.get('/courses').then(r => setCourses(r.data)); }} />}
    </div>
  );
}

function CourseDetailModal({ course, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/courses/${course.id}`).then(r => setDetail(r.data)).finally(() => setLoading(false));
  }, [course.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-msrim-blue font-bold">{course.code}</span>
              <span className={course.type === 'core' ? 'badge-blue' : 'badge-orange'}>{course.type}</span>
            </div>
            <h2 className="font-bold text-xl">{course.name}</h2>
            <p className="text-gray-500 text-sm">{course.program_name} · Semester {course.semester} · {course.credits} Credits</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {loading ? (
          <div className="p-12 text-center"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : detail && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center bg-msrim-blue/5">
                <Users className="w-5 h-5 text-msrim-blue mx-auto mb-1" />
                <p className="text-2xl font-bold text-msrim-blue">{detail.enrolledStudents}</p>
                <p className="text-xs text-gray-500">Enrolled</p>
              </div>
              <div className="card text-center bg-green-50">
                <BookOpen className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{detail.credits}</p>
                <p className="text-xs text-gray-500">Credits</p>
              </div>
              <div className="card text-center bg-orange-50">
                <Clock className="w-5 h-5 text-msrim-orange mx-auto mb-1" />
                <p className="text-2xl font-bold text-msrim-orange">{detail.timetable?.length || 0}</p>
                <p className="text-xs text-gray-500">Slots/Week</p>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Faculty</p>
              <p className="text-sm text-gray-800">{detail.faculty_name || <span className="text-gray-400">Not assigned</span>}</p>
              {detail.employee_id && <p className="text-xs text-gray-400">{detail.employee_id} · {detail.academic_year}</p>}
            </div>

            {detail.timetable?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Timetable</p>
                <div className="space-y-1">
                  {detail.timetable.map(t => (
                    <div key={t.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium">{t.day}</span>
                      <span className="text-gray-500">{t.start_time} – {t.end_time}</span>
                      {t.room && <span className="badge-blue text-xs">Room {t.room}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detail.students?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Enrolled Students ({detail.students.length})</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {detail.students.map(s => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium">{s.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-500">{s.enrollment_number}</span>
                        <span className="badge-blue text-xs">Sec {s.section}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddCourseModal({ onClose }) {
  const [form, setForm] = useState({ code: '', name: '', program_id: '1', semester: '1', credits: '3', type: 'core', faculty_id: '', academic_year_id: '1', max_students: '60' });
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { api.get('/faculty').then(r => setFaculty(r.data)); }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/courses', form); toast.success('Course added!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Course</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Course Code *</label>
            <input required value={form.code} onChange={e => set('code', e.target.value)} className="input-field" placeholder="PGDM-FM-101" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Credits</label>
            <input type="number" value={form.credits} onChange={e => set('credits', e.target.value)} className="input-field" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Course Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Financial Management" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Semester</label>
            <select value={form.semester} onChange={e => set('semester', e.target.value)} className="select-field">
              {[1, 2, 3, 4].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)} className="select-field">
              {['core', 'elective', 'lab', 'project'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Assign Faculty</label>
            <select value={form.faculty_id} onChange={e => set('faculty_id', e.target.value)} className="select-field">
              <option value="">Select Faculty</option>
              {faculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.designation})</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Course'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
