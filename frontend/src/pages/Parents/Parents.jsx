import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Users2, Plus, X, Search, GraduationCap, BarChart2, DollarSign } from 'lucide-react';

export default function Parents() {
  const { user } = useAuth();
  if (user.role === 'parent') return <ParentPortal />;
  return <ParentManagement />;
}

function ParentPortal() {
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [results, setResults] = useState(null);
  const [fees, setFees] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parents/my-child').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.student) return;
    const sid = data.student.id;
    if (tab === 'attendance' && !attendance) api.get(`/parents/child/${sid}/attendance`).then(r => setAttendance(r.data));
    if (tab === 'results' && !results) api.get(`/parents/child/${sid}/results`).then(r => setResults(r.data));
    if (tab === 'fees' && !fees) api.get(`/parents/child/${sid}/fees`).then(r => setFees(r.data));
  }, [tab, data]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div>;
  if (!data) return <div className="card text-center py-12 text-gray-400">No child linked to this account.</div>;

  const { student } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Parent Portal</h1>
        <p className="text-gray-500 text-sm mt-1">Monitoring {student.name}</p>
      </div>

      <div className="card">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">{student.name?.charAt(0)}</div>
          <div>
            <h2 className="font-bold text-lg">{student.name}</h2>
            <p className="text-gray-500 text-sm">{student.enrollment_number} · {student.program_name}</p>
            <p className="text-gray-400 text-xs">Semester {student.semester} · Section {student.section} · Batch {student.batch_year}</p>
          </div>
          <span className="ml-auto badge-green">{student.status}</span>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[['overview', 'Overview', GraduationCap], ['attendance', 'Attendance', BarChart2], ['results', 'Results', GraduationCap], ['fees', 'Fees', DollarSign]].map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium flex-1 justify-center ${tab === id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          {[['Program', student.program_name], ['Semester', `Semester ${student.semester}`], ['Section', student.section],
            ['Batch', student.batch_year], ['Email', student.email], ['Phone', student.phone],
            ['Blood Group', student.blood_group || '—'], ['Status', student.status]].map(([k, v]) => (
            <div key={k} className="card">
              <p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{v}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'attendance' && (
        <div>
          {!attendance ? <Spinner /> : (
            <>
              <div className="card mb-4 flex items-center justify-between">
                <p className="font-medium text-gray-700">Overall Attendance</p>
                <span className={`text-2xl font-bold ${parseFloat(attendance.overall) < 75 ? 'text-red-500' : 'text-green-600'}`}>{attendance.overall}%</span>
              </div>
              {parseFloat(attendance.overall) < 75 && (
                <div className="card bg-red-50 border border-red-100 mb-4">
                  <p className="text-red-700 text-sm font-medium">⚠️ Attendance below 75%. Please ensure regular attendance to avoid academic issues.</p>
                </div>
              )}
              <div className="space-y-3">
                {attendance.summary?.map(c => (
                  <div key={c.code} className="card">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium">{c.course_name}</span>
                      <span className={`font-bold ${parseFloat(c.percentage) < 75 ? 'text-red-500' : 'text-green-600'}`}>{c.percentage}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${parseFloat(c.percentage) < 75 ? 'bg-red-400' : 'bg-green-500'}`} style={{ width: `${c.percentage}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{c.attended}/{c.total_classes} classes attended</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div>
          {!results ? <Spinner /> : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b"><tr>
                    <th className="table-th">Course</th><th className="table-th">Exam</th>
                    <th className="table-th">Marks</th><th className="table-th">Grade</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="table-td"><p className="font-medium text-sm">{r.course_name}</p><p className="text-xs text-gray-400">Sem {r.semester}</p></td>
                        <td className="table-td text-xs">{r.exam_name}</td>
                        <td className="table-td font-semibold">{r.marks_obtained}/{r.total_marks}</td>
                        <td className="table-td"><span className={`badge-${r.grade === 'F' ? 'red' : r.grade === 'O' || r.grade === 'A+' ? 'green' : 'blue'}`}>{r.grade}</span></td>
                      </tr>
                    ))}
                    {!results.length && <tr><td colSpan={4} className="table-td text-center py-8 text-gray-400">No results yet</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'fees' && (
        <div>
          {!fees ? <Spinner /> : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="card bg-red-50"><p className="text-red-600 text-sm">Total Due</p><p className="text-2xl font-bold text-red-700">₹{fees.totalDue?.toLocaleString()}</p></div>
                <div className="card bg-green-50"><p className="text-green-600 text-sm">Paid</p><p className="text-2xl font-bold text-green-700">₹{fees.totalPaid?.toLocaleString()}</p></div>
                <div className="card bg-orange-50"><p className="text-orange-600 text-sm">Pending</p><p className="text-2xl font-bold text-orange-700">₹{fees.pending?.toLocaleString()}</p></div>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-3">Payment History</h3>
                {fees.payments?.map((p, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="font-medium text-sm">{p.fee_type}</p>
                      <p className="text-xs text-gray-400">{p.payment_date} · {p.payment_mode}</p>
                    </div>
                    <span className="font-bold text-green-700">₹{p.amount_paid?.toLocaleString()}</span>
                  </div>
                ))}
                {!fees.payments?.length && <p className="text-gray-400 text-sm text-center py-4">No payment records</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ParentManagement() {
  const [parents, setParents] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [search]);

  async function fetchData() {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.get('/parents', { params: { search: search || undefined } }),
        api.get('/parents/stats')
      ]);
      setParents(p.data); setStats(s.data);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Parent Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage parent portal access</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Parent</button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 max-w-sm">
          <div className="card"><p className="text-gray-500 text-sm">Active Parents</p><p className="text-3xl font-bold text-green-600">{stats.active}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Total Registered</p><p className="text-3xl font-bold text-msrim-blue">{stats.total}</p></div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parents or students..." className="bg-transparent text-sm outline-none w-full" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Parent Name</th><th className="table-th">Email</th><th className="table-th">Student</th>
              <th className="table-th">Enrollment</th><th className="table-th">Program</th>
              <th className="table-th">Relation</th><th className="table-th">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={7} className="table-td text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
                : parents.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{p.parent_name}</td>
                    <td className="table-td">{p.email}</td>
                    <td className="table-td">{p.student_name}</td>
                    <td className="table-td font-mono text-xs">{p.enrollment_number}</td>
                    <td className="table-td"><span className="badge-blue">{p.program_name}</span></td>
                    <td className="table-td text-sm">{p.relation || '—'}</td>
                    <td className="table-td"><span className={p.is_active ? 'badge-green' : 'badge-red'}>{p.is_active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              {!loading && !parents.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No parent accounts</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddParentModal onClose={() => { setShowAdd(false); fetchData(); }} />}
    </div>
  );
}

function AddParentModal({ onClose }) {
  const [form, setForm] = useState({ student_id: '', name: '', email: '', phone: '', relation: 'Parent', occupation: '' });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  useEffect(() => { api.get('/students').then(r => setStudents(r.data)); }, []);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await api.post('/parents', form);
      toast.success(`Parent account created! Username: ${res.data.username} | Password: ${res.data.defaultPassword}`);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Parent Account</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Student *</label><select required value={form.student_id} onChange={e => set('student_id', e.target.value)} className="select-field"><option value="">Select Student</option>{students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.enrollment_number})</option>)}</select></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Parent Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Relation</label><select value={form.relation} onChange={e => set('relation', e.target.value)} className="select-field"><option>Parent</option><option>Father</option><option>Mother</option><option>Guardian</option><option>Spouse</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Occupation</label><input value={form.occupation} onChange={e => set('occupation', e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Account'}</button></div>
        </form>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div>;
}
