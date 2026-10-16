import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, BookOpen, Layers } from 'lucide-react';

export default function Curriculum() {
  const { user } = useAuth();
  const [curriculum, setCurriculum] = useState([]);
  const [summary, setSummary] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [filters, setFilters] = useState({ program_id:'', semester:'' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ program_id:'', course_id:'', semester:1, is_mandatory:true, credits:3 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/curriculum'),
      api.get('/curriculum/summary'),
      api.get('/structure/programs'),
      api.get('/courses'),
    ]).then(([c, s, p, co]) => {
      setCurriculum(c.data); setSummary(s.data); setPrograms(p.data||[]); setCourses(co.data||[]);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const params = {};
    if (filters.program_id) params.program_id = filters.program_id;
    if (filters.semester)   params.semester   = filters.semester;
    api.get('/curriculum', { params }).then(r => setCurriculum(r.data));
  }, [filters]);

  async function add() {
    if (!form.program_id || !form.course_id) return toast.error('Program and course are required.');
    try {
      await api.post('/curriculum', form);
      toast.success('Course added to curriculum.');
      setShowForm(false);
      const r = await api.get('/curriculum', { params: { program_id: filters.program_id, semester: filters.semester } });
      setCurriculum(r.data);
      const s = await api.get('/curriculum/summary');
      setSummary(s.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Already mapped.'); }
  }

  async function remove(id) {
    try {
      await api.delete(`/curriculum/${id}`);
      toast.success('Removed from curriculum.');
      const r = await api.get('/curriculum', { params: { program_id: filters.program_id, semester: filters.semester } });
      setCurriculum(r.data);
    } catch { toast.error('Failed.'); }
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);

  const grouped = curriculum.reduce((acc, c) => {
    const key = `${c.program_code}-Sem${c.semester}`;
    if (!acc[key]) acc[key] = { program: c.program_name, program_code: c.program_code, semester: c.semester, courses: [] };
    acc[key].courses.push(c);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Curriculum</h1>
          <p className="text-gray-500 text-sm mt-1">Program-wise course curriculum mapping by semester</p>
        </div>
        {canManage && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Map Course</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {summary.map(s => (
          <div key={s.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div><span className="badge-blue font-mono text-xs">{s.code}</span><h3 className="font-bold mt-1 text-sm">{s.name}</h3></div>
              <div className="text-right"><p className="text-2xl font-bold text-msrim-blue">{s.total_courses}</p><p className="text-xs text-gray-400">courses</p></div>
            </div>
            <div className="mt-2 flex gap-3 text-xs text-gray-500">
              <span>{s.total_credits || 0} credits</span>
              <span>{s.semesters_mapped || 0} semesters</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4 flex gap-3 flex-wrap items-end">
        <div><label className="block text-sm font-medium mb-1">Program</label>
          <select value={filters.program_id} onChange={e=>setFilters(f=>({...f,program_id:e.target.value}))} className="select-field w-48">
            <option value="">All Programs</option>
            {programs.map(p=><option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div><label className="block text-sm font-medium mb-1">Semester</label>
          <select value={filters.semester} onChange={e=>setFilters(f=>({...f,semester:e.target.value}))} className="select-field w-32">
            <option value="">All</option>
            {[1,2,3,4,5,6].map(s=><option key={s} value={s}>Sem {s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([key, group]) => (
          <div key={key} className="card p-0 overflow-hidden">
            <div className="p-3 bg-msrim-blue/5 border-b flex items-center gap-2">
              <Layers className="w-4 h-4 text-msrim-blue" />
              <h3 className="font-semibold text-sm">{group.program_code} — Semester {group.semester}</h3>
              <span className="text-xs text-gray-400 ml-auto">{group.courses.length} courses · {group.courses.reduce((a,c)=>a+c.credits,0)} credits</span>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b text-xs"><tr>
                <th className="table-th">Code</th><th className="table-th">Course</th>
                <th className="table-th text-center">Credits</th><th className="table-th text-center">Type</th>
                {canManage && <th className="table-th">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {group.courses.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs">{c.course_code}</td>
                    <td className="table-td font-medium text-sm">{c.course_name}</td>
                    <td className="table-td text-center">{c.credits}</td>
                    <td className="table-td text-center"><span className={c.is_mandatory?'badge-blue':'badge-gray'}>{c.is_mandatory?'Core':'Elective'}</span></td>
                    {canManage && <td className="table-td"><button onClick={()=>remove(c.id)} className="text-xs text-red-500 hover:text-red-700"><X className="w-3.5 h-3.5" /></button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
        {!curriculum.length && <div className="card p-8 text-center text-gray-400">No curriculum mapped. Use filters or map a course.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Map Course to Curriculum</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Program *</label>
                <select value={form.program_id} onChange={e=>setForm(f=>({...f,program_id:e.target.value}))} className="select-field">
                  <option value="">Select program...</option>
                  {programs.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Course *</label>
                <select value={form.course_id} onChange={e=>setForm(f=>({...f,course_id:e.target.value}))} className="select-field">
                  <option value="">Select course...</option>
                  {courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-sm font-medium mb-1">Semester</label>
                  <select value={form.semester} onChange={e=>setForm(f=>({...f,semester:parseInt(e.target.value)}))} className="select-field">
                    {[1,2,3,4,5,6].map(s=><option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Credits</label>
                  <input type="number" min="1" max="6" value={form.credits} onChange={e=>setForm(f=>({...f,credits:parseInt(e.target.value)||3}))} className="input-field" />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.is_mandatory} onChange={e=>setForm(f=>({...f,is_mandatory:e.target.checked}))} className="w-4 h-4" />
                    <span className="text-sm font-medium">Core</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={add} className="btn-primary flex-1">Map Course</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
