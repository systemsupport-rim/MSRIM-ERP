import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, Plus, Eye, X, BarChart2, BookOpen, UserX } from 'lucide-react';

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [semester, setSemester] = useState('');
  const [section, setSection] = useState('');
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => { fetchStudents(); }, [search, semester, section]);

  async function fetchStudents() {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (semester) params.semester = semester;
      if (section) params.section = section;
      const res = await api.get('/students', { params });
      setStudents(res.data);
    } catch { toast.error('Failed to load students'); }
    finally { setLoading(false); }
  }

  if (user.role === 'student') return <StudentSelfView />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-500 text-sm mt-1">{students.length} students found</p>
        </div>
        {['admin', 'registrar'].includes(user.role) && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Student
          </button>
        )}
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 min-w-48">
            <Search className="w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, enrollment..."
              className="bg-transparent text-sm outline-none w-full" />
          </div>
          <select value={semester} onChange={e => setSemester(e.target.value)} className="select-field w-36">
            <option value="">All Semesters</option>
            {[1, 2, 3, 4].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          <select value={section} onChange={e => setSection(e.target.value)} className="select-field w-32">
            <option value="">All Sections</option>
            {['A', 'B', 'C'].map(s => <option key={s} value={s}>Section {s}</option>)}
          </select>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Enrollment No</th>
                <th className="table-th">Program</th>
                <th className="table-th">Sem / Section</th>
                <th className="table-th">Batch</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="table-td text-center py-12">
                  <div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : students.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-msrim-blue rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs">{s.enrollment_number}</td>
                  <td className="table-td"><span className="badge-blue">{s.program_code}</span></td>
                  <td className="table-td">Sem {s.semester} / {s.section}</td>
                  <td className="table-td">{s.batch_year}</td>
                  <td className="table-td">
                    <span className={`${s.status === 'active' ? 'badge-green' : s.status === 'graduated' ? 'badge-blue' : 'badge-red'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="table-td">
                    <button onClick={() => setSelected(s)} className="btn-secondary py-1.5 px-3 text-xs">
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !students.length && (
                <tr><td colSpan={7} className="table-td text-center py-12 text-gray-400">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <StudentDetailModal
          student={selected}
          canManage={['admin', 'registrar'].includes(user.role)}
          onClose={() => { setSelected(null); fetchStudents(); }}
        />
      )}
      {showAdd && ['admin', 'registrar'].includes(user.role) && <AddStudentModal onClose={() => { setShowAdd(false); fetchStudents(); }} />}
    </div>
  );
}

function StudentSelfView() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/students').then(r => setData(r.data[0])); }, []);
  if (!data) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card text-center md:col-span-1">
          <div className="w-20 h-20 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">{data.name?.charAt(0)}</div>
          <h2 className="font-bold text-lg">{data.name}</h2>
          <p className="text-gray-500 text-sm">{data.enrollment_number}</p>
          <span className="badge-green mt-2 inline-block">{data.status}</span>
        </div>
        <div className="card md:col-span-2 grid grid-cols-2 gap-4">
          {[
            ['Program', data.program_name], ['Semester', `Semester ${data.semester}`],
            ['Section', data.section], ['Batch', data.batch_year],
            ['Email', data.email], ['Phone', data.phone],
            ['Guardian', data.guardian_name], ['Guardian Phone', data.guardian_phone],
            ['Address', data.address], ['Blood Group', data.blood_group],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5">{v || '—'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudentDetailModal({ student, canManage, onClose }) {
  const [tab, setTab] = useState('details');
  const [attendance, setAttendance] = useState(null);
  const [results, setResults] = useState(null);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (tab === 'attendance' && !attendance) {
      api.get(`/students/${student.id}/attendance`).then(r => setAttendance(r.data));
    }
    if (tab === 'results' && !results) {
      api.get(`/students/${student.id}/results`).then(r => setResults(r.data));
    }
  }, [tab]);

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${student.name}?`)) return;
    setDeactivating(true);
    try {
      await api.put(`/students/${student.id}/deactivate`, { status: 'inactive' });
      toast.success('Student deactivated'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setDeactivating(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-xl">{student.name}</h2>
            <p className="text-gray-500 text-sm">{student.enrollment_number} · {student.program_name}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-1 p-4 border-b bg-gray-50">
          {[['details', 'Details'], ['attendance', 'Attendance'], ['results', 'Results']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'details' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Enrollment No', student.enrollment_number], ['Roll No', student.roll_number],
                ['Program', student.program_name], ['Semester', `Sem ${student.semester} / ${student.section}`],
                ['Batch Year', student.batch_year], ['Email', student.email],
                ['Phone', student.phone], ['Date of Birth', student.dob],
                ['Gender', student.gender], ['Blood Group', student.blood_group],
                ['Category', student.category], ['Admission Date', student.admission_date],
                ['Guardian', student.guardian_name], ['Guardian Phone', student.guardian_phone],
                ['Guardian Relation', student.guardian_relation], ['Status', student.status],
                ['City', student.city], ['State', student.state],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{v || '—'}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'attendance' && (
            <div>
              {!attendance ? (
                <div className="text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">Overall Attendance</p>
                    <span className={`text-lg font-bold ${parseFloat(attendance.overall) < 75 ? 'text-red-500' : 'text-green-600'}`}>{attendance.overall}%</span>
                  </div>
                  <div className="space-y-2">
                    {attendance.summary?.map(c => (
                      <div key={c.code} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium truncate">{c.course_name}</span>
                            <span className={`font-bold ml-2 flex-shrink-0 ${parseFloat(c.percentage) < 75 ? 'text-red-500' : 'text-green-600'}`}>{c.percentage}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${parseFloat(c.percentage) < 75 ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${c.percentage}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{c.attended}/{c.total_classes} classes</p>
                        </div>
                      </div>
                    ))}
                    {!attendance.summary?.length && <p className="text-gray-400 text-center py-4">No attendance records</p>}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'results' && (
            <div>
              {!results ? (
                <div className="text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : (
                <>
                  {results.summary && (
                    <div className="flex gap-4 mb-4 text-sm">
                      <span className="text-gray-500">Total: <strong>{results.summary.total}</strong></span>
                      <span className="text-green-600">Passed: <strong>{results.summary.passed}</strong></span>
                      <span className="text-red-500">Failed: <strong>{results.summary.failed}</strong></span>
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-gray-50">
                        <th className="table-th">Course</th><th className="table-th">Exam</th>
                        <th className="table-th">Marks</th><th className="table-th">Grade</th>
                      </tr></thead>
                      <tbody>
                        {results.results?.map((r, i) => (
                          <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="table-td"><p className="font-medium">{r.course_name}</p><p className="text-xs text-gray-400">{r.code}</p></td>
                            <td className="table-td text-xs">{r.exam_name}</td>
                            <td className="table-td font-semibold">{r.marks_obtained}/{r.total_marks}</td>
                            <td className="table-td"><span className={`badge-${r.grade === 'F' ? 'red' : r.grade === 'O' || r.grade === 'A+' ? 'green' : 'blue'}`}>{r.grade}</span></td>
                          </tr>
                        ))}
                        {!results.results?.length && <tr><td colSpan={4} className="table-td text-center py-4 text-gray-400">No results yet</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {canManage && student.status === 'active' && (
          <div className="px-6 pb-6 flex justify-end">
            <button onClick={handleDeactivate} disabled={deactivating} className="btn-danger text-sm">
              <UserX className="w-4 h-4" /> {deactivating ? 'Deactivating...' : 'Deactivate Student'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddStudentModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', enrollment_number: '', program_id: '1', semester: '1', batch_year: '2024', section: 'A', roll_number: '', dob: '', gender: 'Male', admission_date: '2024-07-15', guardian_name: '', guardian_phone: '', guardian_relation: 'Father' });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/students', form);
      toast.success('Student added successfully!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add student'); }
    finally { setLoading(false); }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add New Student</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {[['Name', 'name', 'text', true], ['Email', 'email', 'email', true], ['Phone', 'phone', 'tel', false],
            ['Enrollment No', 'enrollment_number', 'text', true], ['Roll Number', 'roll_number', 'text', false],
            ['Date of Birth', 'dob', 'date', false], ['Admission Date', 'admission_date', 'date', false],
            ['Batch Year', 'batch_year', 'number', false], ['Guardian Name', 'guardian_name', 'text', false],
            ['Guardian Phone', 'guardian_phone', 'tel', false]].map(([l, k, t, req]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l}{req && <span className="text-red-500"> *</span>}</label>
              <input type={t} required={req} value={form[k]} onChange={e => set(k, e.target.value)} className="input-field" />
            </div>
          ))}
          {[['Semester', 'semester', [1, 2, 3, 4].map(v => ({ v, l: `Semester ${v}` }))],
            ['Section', 'section', ['A', 'B', 'C'].map(v => ({ v, l: `Section ${v}` }))],
            ['Gender', 'gender', ['Male', 'Female', 'Other'].map(v => ({ v, l: v }))],
            ['Program', 'program_id', [{ v: '1', l: 'PGDM' }, { v: '2', l: 'FPM' }, { v: '3', l: 'EPGDM' }]],
            ['Guardian Relation', 'guardian_relation', ['Father', 'Mother', 'Guardian', 'Spouse'].map(v => ({ v, l: v }))]].map(([l, k, opts]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
              <select value={form[k]} onChange={e => set(k, e.target.value)} className="select-field">
                {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            </div>
          ))}
          <div className="col-span-2 flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Student'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
