import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, AlertTriangle, CheckCircle, Users } from 'lucide-react';

const STATUS_COLORS = {
  registered: 'badge-blue', appeared: 'badge-yellow',
  passed: 'badge-green', failed: 'badge-red', cancelled: 'badge-gray',
};

export default function BacklogManagement() {
  const { user } = useAuth();
  const [backlogs, setBacklogs] = useState([]);
  const [summary, setSummary] = useState([]);
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [tab, setTab] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ student_id: '', examination_id: '', attempt_number: 1, fee_paid: 0 });

  useEffect(() => {
    Promise.all([
      api.get('/exams/backlogs'),
      api.get('/exams/backlogs/summary'),
      api.get('/examinations'),
      api.get('/students'),
    ]).then(([b, s, e, st]) => {
      setBacklogs(b.data); setSummary(s.data); setExams(e.data); setStudents(st.data);
    }).finally(() => setLoading(false));
  }, []);

  async function register() {
    try {
      await api.post('/exams/backlogs', form);
      toast.success('Backlog registered successfully.');
      setShowForm(false);
      setForm({ student_id: '', examination_id: '', attempt_number: 1, fee_paid: 0 });
      const r = await api.get('/exams/backlogs');
      setBacklogs(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/exams/backlogs/${id}`, { status });
      toast.success('Status updated.');
      const r = await api.get('/exams/backlogs');
      setBacklogs(r.data);
      const s = await api.get('/exams/backlogs/summary');
      setSummary(s.data);
    } catch { toast.error('Failed to update.'); }
  }

  const canManage = ['admin', 'registrar', 'hod', 'faculty'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Backlog Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage students with pending/arrear examinations</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Register Backlog
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Backlogs', backlogs.length, 'text-msrim-blue'],
          ['Active', backlogs.filter(b => ['registered','appeared'].includes(b.status)).length, 'text-yellow-600'],
          ['Passed', backlogs.filter(b => b.status === 'passed').length, 'text-green-600'],
          ['Failed', backlogs.filter(b => b.status === 'failed').length, 'text-red-600'],
        ].map(([l, v, c]) => (
          <div key={l} className="card p-4"><p className="text-gray-400 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[['list', 'Backlog List'], ['summary', 'Student Summary']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'list' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Student</th>
                  <th className="table-th">Enrollment</th>
                  <th className="table-th">Course / Exam</th>
                  <th className="table-th">Attempt</th>
                  <th className="table-th">Fee Paid</th>
                  <th className="table-th">Status</th>
                  {canManage && <th className="table-th">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {backlogs.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{b.student_name}</td>
                    <td className="table-td font-mono text-xs">{b.enrollment_number}</td>
                    <td className="table-td">
                      <p className="font-medium text-sm">{b.course_code} — {b.course_name}</p>
                      <p className="text-xs text-gray-400">{b.exam_name}</p>
                    </td>
                    <td className="table-td text-center">{b.attempt_number}</td>
                    <td className="table-td">₹{b.fee_paid}</td>
                    <td className="table-td"><span className={STATUS_COLORS[b.status] || 'badge-gray'}>{b.status}</span></td>
                    {canManage && (
                      <td className="table-td">
                        <select value={b.status} onChange={e => updateStatus(b.id, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-msrim-blue">
                          {['registered','appeared','passed','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    )}
                  </tr>
                ))}
                {!backlogs.length && (
                  <tr><td colSpan={canManage ? 7 : 6} className="table-td text-center py-12 text-gray-400">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-200" />No backlog registrations
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'summary' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Student</th>
                  <th className="table-th">Enrollment</th>
                  <th className="table-th">Total Backlogs</th>
                  <th className="table-th">Active</th>
                  <th className="table-th">Cleared</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {summary.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{s.name}</td>
                    <td className="table-td font-mono text-xs">{s.enrollment_number}</td>
                    <td className="table-td text-center font-bold text-msrim-blue">{s.total_backlogs}</td>
                    <td className="table-td text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${s.active_backlogs > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{s.active_backlogs}</span>
                    </td>
                    <td className="table-td text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">{s.cleared}</span>
                    </td>
                  </tr>
                ))}
                {!summary.length && <tr><td colSpan={5} className="table-td text-center py-12 text-gray-400">No data</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Register Backlog</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Student</label>
                <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} className="select-field">
                  <option value="">Select student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.enrollment_number})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Examination</label>
                <select value={form.examination_id} onChange={e => setForm(f => ({ ...f, examination_id: e.target.value }))} className="select-field">
                  <option value="">Select examination...</option>
                  {exams.map(e => <option key={e.id} value={e.id}>{e.course_code} — {e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Attempt No.</label>
                  <input type="number" min="1" value={form.attempt_number} onChange={e => setForm(f => ({ ...f, attempt_number: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Fee Paid (₹)</label>
                  <input type="number" min="0" value={form.fee_paid} onChange={e => setForm(f => ({ ...f, fee_paid: e.target.value }))} className="input-field" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={register} className="btn-primary flex-1">Register</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
