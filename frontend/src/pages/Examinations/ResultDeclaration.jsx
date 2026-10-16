import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Send, Eye, EyeOff, CheckCircle, Clock } from 'lucide-react';

const STATUS_STYLES = {
  draft:      'badge-gray',
  declared:   'badge-blue',
  published:  'badge-green',
  withheld:   'badge-red',
};

export default function ResultDeclaration() {
  const { user } = useAuth();
  const [declarations, setDeclarations] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', academic_year_id: '', program_id: '', semester: '', exam_type: '', remarks: '' });

  useEffect(() => {
    Promise.all([
      api.get('/exams/declarations'),
      api.get('/structure/programs').catch(() => ({ data: [] })),
      api.get('/structure/academic-years').catch(() => ({ data: [] })),
    ]).then(([d, p, ay]) => {
      setDeclarations(d.data); setPrograms(p.data); setAcademicYears(ay.data);
    }).finally(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.title.trim()) return toast.error('Title is required.');
    try {
      await api.post('/exams/declarations', form);
      toast.success('Result declaration created.');
      setShowForm(false);
      setForm({ title: '', academic_year_id: '', program_id: '', semester: '', exam_type: '', remarks: '' });
      const r = await api.get('/exams/declarations');
      setDeclarations(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  async function publish(id) {
    try {
      await api.put(`/exams/declarations/${id}/publish`);
      toast.success('Results published! Students can now view their results.');
      const r = await api.get('/exams/declarations');
      setDeclarations(r.data);
    } catch { toast.error('Failed to publish.'); }
  }

  async function withhold(id) {
    try {
      await api.put(`/exams/declarations/${id}/withhold`);
      toast.success('Results withheld.');
      const r = await api.get('/exams/declarations');
      setDeclarations(r.data);
    } catch { toast.error('Failed.'); }
  }

  const canManage = ['admin', 'registrar'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Result Declaration</h1>
          <p className="text-gray-500 text-sm mt-1">Officially declare and publish examination results</p>
        </div>
        {canManage && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> New Declaration
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total', declarations.length, 'text-msrim-blue'],
          ['Draft', declarations.filter(d => d.status === 'draft').length, 'text-gray-600'],
          ['Published', declarations.filter(d => d.status === 'published').length, 'text-green-600'],
          ['Withheld', declarations.filter(d => d.status === 'withheld').length, 'text-red-600'],
        ].map(([l, v, c]) => (
          <div key={l} className="card p-4"><p className="text-gray-400 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="space-y-3">
        {declarations.map(d => (
          <div key={d.id} className="card p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-gray-800">{d.title}</h3>
                  <span className={STATUS_STYLES[d.status] || 'badge-gray'}>{d.status}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                  {d.program_name && <span>Program: <strong>{d.program_name}</strong></span>}
                  {d.semester && <span>Semester: <strong>{d.semester}</strong></span>}
                  {d.exam_type && <span>Type: <strong>{d.exam_type}</strong></span>}
                  {d.academic_year && <span>Year: <strong>{d.academic_year}</strong></span>}
                  {d.declared_by_name && <span>By: <strong>{d.declared_by_name}</strong></span>}
                </div>
                {d.remarks && <p className="text-gray-400 text-sm mt-1">{d.remarks}</p>}
                <div className="flex flex-wrap gap-x-4 text-xs text-gray-400 mt-2">
                  <span>Created: {new Date(d.created_at).toLocaleDateString()}</span>
                  {d.published_at && <span className="text-green-600">Published: {new Date(d.published_at).toLocaleDateString()}</span>}
                </div>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  {d.status !== 'published' && (
                    <button onClick={() => publish(d.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl text-sm font-medium transition-colors">
                      <Send className="w-3.5 h-3.5" /> Publish
                    </button>
                  )}
                  {d.status === 'published' && (
                    <button onClick={() => withhold(d.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-sm font-medium transition-colors">
                      <EyeOff className="w-3.5 h-3.5" /> Withhold
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {!declarations.length && (
          <div className="card p-12 text-center text-gray-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-medium">No result declarations yet</p>
            <p className="text-sm mt-1">Create a declaration after entering all marks</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">New Result Declaration</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="input-field" placeholder="e.g. Semester 3 Final Exam Results 2026" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Program</label>
                  <select value={form.program_id} onChange={e => setForm(f => ({ ...f, program_id: e.target.value }))} className="select-field">
                    <option value="">All Programs</option>
                    {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Semester</label>
                  <select value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} className="select-field">
                    <option value="">All Semesters</option>
                    {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exam Type</label>
                  <select value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))} className="select-field">
                    <option value="">All Types</option>
                    {['mid-term','end-term','internal','supplementary','backlog'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Academic Year</label>
                  <select value={form.academic_year_id} onChange={e => setForm(f => ({ ...f, academic_year_id: e.target.value }))} className="select-field">
                    <option value="">Select Year</option>
                    {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                  className="input-field" rows={2} placeholder="Optional notes..." />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={create} className="btn-primary flex-1">Create Declaration</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
