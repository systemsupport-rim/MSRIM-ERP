import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Calendar, BookOpen, Settings2 } from 'lucide-react';

export default function AcademicManagement() {
  const { user } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [tab, setTab] = useState('programs');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', code:'', type:'', duration_years:2, department_id:'' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/structure/programs'),
      api.get('/structure/academic-years'),
      api.get('/structure/departments'),
    ]).then(([p, ay, d]) => {
      setPrograms(p.data||[]); setAcademicYears(ay.data||[]); setDepartments(d.data||[]);
    }).finally(() => setLoading(false));
  }, []);

  async function addProgram() {
    if (!form.name || !form.code) return toast.error('Name and code are required.');
    try {
      await api.post('/structure/programs', form);
      toast.success('Program added.');
      setShowForm(false);
      setForm({ name:'', code:'', type:'', duration_years:2, department_id:'' });
      const r = await api.get('/structure/programs');
      setPrograms(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Academic Management</h1>
          <p className="text-gray-500 text-sm mt-1">Programs, academic years, departments and academic settings</p>
        </div>
        {canManage && tab === 'programs' && (
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Program</button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[['programs','Programs',BookOpen],['academic-years','Academic Years',Calendar],['departments','Departments',Settings2]].map(([id,label,Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge-blue font-mono text-xs">{p.code}</span>
                  <h3 className="font-bold mt-1">{p.name}</h3>
                  <p className="text-gray-500 text-sm">{p.duration_years} year{p.duration_years>1?'s':''} · {p.dept_name || '—'}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-msrim-blue">{p.student_count || 0}</p>
                  <p className="text-xs text-gray-400">students</p>
                </div>
              </div>
            </div>
          ))}
          {!programs.length && <div className="col-span-3 card p-8 text-center text-gray-400">No programs found.</div>}
        </div>
      )}

      {tab === 'academic-years' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Name</th><th className="table-th">Start</th><th className="table-th">End</th><th className="table-th">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {academicYears.map(ay => (
                <tr key={ay.id} className="hover:bg-gray-50">
                  <td className="table-td font-bold">{ay.name}</td>
                  <td className="table-td">{ay.start_date ? new Date(ay.start_date).toLocaleDateString() : '—'}</td>
                  <td className="table-td">{ay.end_date ? new Date(ay.end_date).toLocaleDateString() : '—'}</td>
                  <td className="table-td"><span className={ay.is_current ? 'badge-green' : 'badge-gray'}>{ay.is_current ? 'Current' : 'Inactive'}</span></td>
                </tr>
              ))}
              {!academicYears.length && <tr><td colSpan={4} className="table-td text-center py-8 text-gray-400">No academic years found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <div key={d.id} className="card p-4">
              <span className="badge-blue font-mono text-xs">{d.code}</span>
              <h3 className="font-bold mt-1">{d.name}</h3>
              {d.hod_name && <p className="text-gray-500 text-sm mt-1">HOD: {d.hod_name}</p>}
            </div>
          ))}
          {!departments.length && <div className="col-span-3 card p-8 text-center text-gray-400">No departments found.</div>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Program</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Program Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" placeholder="e.g. Post Graduate Diploma in Management" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Code *</label><input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} className="input-field font-mono" placeholder="PGDM" /></div>
                <div><label className="block text-sm font-medium mb-1">Duration (years)</label><input type="number" min="1" max="5" value={form.duration_years} onChange={e=>setForm(f=>({...f,duration_years:parseInt(e.target.value)||2}))} className="input-field" /></div>
                <div><label className="block text-sm font-medium mb-1">Department</label>
                  <select value={form.department_id} onChange={e=>setForm(f=>({...f,department_id:e.target.value}))} className="select-field">
                    <option value="">Select...</option>
                    {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addProgram} className="btn-primary flex-1">Add Program</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
