import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Layers, Plus, X, BookOpen, Building2, GraduationCap, Edit2 } from 'lucide-react';

export default function Structure() {
  const [overview, setOverview] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [levels, setLevels] = useState(null);
  const [academicYears, setAcademicYears] = useState([]);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // {type, data?}

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [ov, dept, prog, lv, ay] = await Promise.all([
        api.get('/structure/overview'), api.get('/structure/departments'),
        api.get('/structure/programs'), api.get('/structure/course-levels'),
        api.get('/structure/academic-years')
      ]);
      setOverview(ov.data); setDepartments(dept.data); setPrograms(prog.data);
      setLevels(lv.data); setAcademicYears(ay.data);
    } finally { setLoading(false); }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'programs', label: 'Programmes', icon: GraduationCap },
    { id: 'courses', label: 'Course Levels', icon: BookOpen },
    { id: 'academic-years', label: 'Academic Years', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Core Data Structure</h1>
          <p className="text-gray-500 text-sm mt-1">MS Ramaiah Institute of Management — Institutional Structure</p>
        </div>
        {tab === 'departments' && <button className="btn-primary" onClick={() => setModal({ type: 'dept' })}><Plus className="w-4 h-4" /> Add Department</button>}
        {tab === 'programs' && <button className="btn-primary" onClick={() => setModal({ type: 'prog' })}><Plus className="w-4 h-4" /> Add Programme</button>}
        {tab === 'academic-years' && <button className="btn-primary" onClick={() => setModal({ type: 'ay' })}><Plus className="w-4 h-4" /> Add Academic Year</button>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium ${tab === t.id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[['Departments', overview.departments, 'text-msrim-blue'], ['Programmes', overview.programs, 'text-green-600'], ['Courses', overview.courses, 'text-msrim-orange'], ['Academic Years', overview.academicYears, 'text-purple-600']].map(([l, v, c]) => (
              <div key={l} className="card text-center">
                <p className={`text-4xl font-bold ${c}`}>{v}</p>
                <p className="text-gray-500 text-sm mt-1">{l}</p>
              </div>
            ))}
          </div>
          {overview.currentAY && (
            <div className="card bg-gradient-to-r from-msrim-blue to-msrim-blue-light text-white">
              <p className="text-blue-100 text-sm">Current Academic Year</p>
              <h2 className="text-2xl font-bold">{overview.currentAY.name}</h2>
              <p className="text-blue-100 mt-1">{new Date(overview.currentAY.start_date).toLocaleDateString()} — {new Date(overview.currentAY.end_date).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <div key={d.id} className="card">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-msrim-blue/10 rounded-lg flex-shrink-0"><Building2 className="w-5 h-5 text-msrim-blue" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{d.name}</h3>
                    <button onClick={() => setModal({ type: 'dept', data: d })} className="p-1 hover:bg-gray-100 rounded text-gray-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-gray-500 text-sm">{d.code}</p>
                  {d.hod_name && <p className="text-gray-400 text-xs mt-1">HOD: {d.hod_name}</p>}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>👨‍🏫 {d.faculty_count} Faculty</span>
                    <span>📚 {d.program_count} Programs</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && !departments.length && <div className="col-span-3 card text-center py-8 text-gray-400">No departments yet</div>}
        </div>
      )}

      {tab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => (
            <div key={p.id} className="card">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-msrim-orange/10 rounded-lg flex-shrink-0"><GraduationCap className="w-5 h-5 text-msrim-orange" /></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{p.name}</h3>
                    <button onClick={() => setModal({ type: 'prog', data: p })} className="p-1 hover:bg-gray-100 rounded text-gray-400"><Edit2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-gray-500 text-sm">{p.code} · {p.duration_years} Year{p.duration_years > 1 ? 's' : ''}</p>
                  <p className="text-gray-400 text-xs mt-1">{p.dept_name}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>📖 {p.course_count} Courses</span>
                    <span>👥 {p.student_count} Students</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {!loading && !programs.length && <div className="col-span-3 card text-center py-8 text-gray-400">No programmes yet</div>}
        </div>
      )}

      {tab === 'courses' && levels && (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-4">Curriculum by Semester</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b"><th className="table-th">Semester</th><th className="table-th">Courses</th><th className="table-th">Total Credits</th><th className="table-th">Course Codes</th></tr></thead>
                <tbody>
                  {levels.bySemester?.map(s => (
                    <tr key={s.semester} className="border-b hover:bg-gray-50">
                      <td className="table-td font-semibold">Semester {s.semester}</td>
                      <td className="table-td">{s.courses}</td>
                      <td className="table-td font-bold text-msrim-blue">{s.credits}</td>
                      <td className="table-td text-xs text-gray-500">{s.course_codes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card">
            <h3 className="font-semibold mb-4">Course Types</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {levels.levels?.map(l => (
                <div key={`${l.level}-${l.type}`} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 capitalize">Sem {l.level} · {l.type}</p>
                  <p className="text-2xl font-bold text-msrim-blue">{l.course_count}</p>
                  <p className="text-xs text-gray-500">{l.total_credits} credits</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'academic-years' && (
        <div className="space-y-3">
          {academicYears.map(ay => (
            <div key={ay.id} className={`card flex items-center justify-between ${ay.is_current ? 'border-l-4 border-msrim-blue' : ''}`}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{ay.name}</h3>
                  {ay.is_current ? <span className="badge-green">Current</span> : null}
                </div>
                <p className="text-gray-500 text-sm">{new Date(ay.start_date).toLocaleDateString()} — {new Date(ay.end_date).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm">{ay.course_count} courses</span>
                <button onClick={() => setModal({ type: 'ay', data: ay })} className="p-1 hover:bg-gray-100 rounded text-gray-400"><Edit2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.type === 'dept' && <DeptModal data={modal.data} deptList={departments} onClose={() => { setModal(null); fetchAll(); }} />}
      {modal?.type === 'prog' && <ProgramModal data={modal.data} departments={departments} onClose={() => { setModal(null); fetchAll(); }} />}
      {modal?.type === 'ay' && <AcademicYearModal data={modal.data} onClose={() => { setModal(null); fetchAll(); }} />}
    </div>
  );
}

function DeptModal({ data, deptList, onClose }) {
  const [form, setForm] = useState({ name: data?.name || '', code: data?.code || '', hod_id: data?.hod_id || '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (data?.id) await api.put(`/structure/departments/${data.id}`, form);
      else await api.post('/structure/departments', form);
      toast.success(data?.id ? 'Department updated' : 'Department added'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">{data?.id ? 'Edit' : 'Add'} Department</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Code *</label><input required value={form.code} onChange={e => set('code', e.target.value)} className="input-field" placeholder="MGT" /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button></div>
        </form>
      </div>
    </div>
  );
}

function ProgramModal({ data, departments, onClose }) {
  const [form, setForm] = useState({ name: data?.name || '', code: data?.code || '', duration_years: data?.duration_years || 2, department_id: data?.department_id || (departments[0]?.id || '') });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (data?.id) await api.put(`/structure/programs/${data.id}`, form);
      else await api.post('/structure/programs', form);
      toast.success(data?.id ? 'Programme updated' : 'Programme added'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">{data?.id ? 'Edit' : 'Add'} Programme</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="Post Graduate Diploma in Management" /></div>
          <div><label className="block text-sm font-medium mb-1">Code *</label><input required value={form.code} onChange={e => set('code', e.target.value)} className="input-field" placeholder="PGDM" /></div>
          <div><label className="block text-sm font-medium mb-1">Duration (years)</label><input type="number" min="1" max="5" value={form.duration_years} onChange={e => set('duration_years', e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Department *</label>
            <select required value={form.department_id} onChange={e => set('department_id', e.target.value)} className="select-field">
              <option value="">Select Department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AcademicYearModal({ data, onClose }) {
  const [form, setForm] = useState({ name: data?.name || '', start_date: data?.start_date || '', end_date: data?.end_date || '', is_current: data?.is_current ? true : false });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (data?.id) await api.put(`/structure/academic-years/${data.id}`, form);
      else await api.post('/structure/academic-years', form);
      toast.success(data?.id ? 'Academic year updated' : 'Academic year added'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">{data?.id ? 'Edit' : 'Add'} Academic Year</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name *</label><input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" placeholder="2025-2027" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Start Date *</label><input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">End Date *</label><input required type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input-field" /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_current} onChange={e => set('is_current', e.target.checked)} className="w-4 h-4 accent-msrim-blue" />
            <span className="text-sm font-medium">Set as current academic year</span>
          </label>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save'}</button></div>
        </form>
      </div>
    </div>
  );
}
