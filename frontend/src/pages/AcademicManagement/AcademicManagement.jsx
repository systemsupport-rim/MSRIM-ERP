import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Plus, X, Calendar, BookOpen, Settings2, Users, CalendarDays,
  GraduationCap, ChevronRight, Edit2, Layers, ClipboardList
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TABS = [
  { id: 'programs',    label: 'Programs',        icon: GraduationCap },
  { id: 'courses',     label: 'Courses',         icon: BookOpen },
  { id: 'schedule',    label: 'Class Schedule',  icon: CalendarDays },
  { id: 'batches',     label: 'Batches',         icon: Layers },
  { id: 'faculty',     label: 'Faculty Assignment', icon: Users },
  { id: 'academic-years', label: 'Academic Years', icon: Calendar },
  { id: 'departments', label: 'Departments',     icon: Settings2 },
];

export default function AcademicManagement() {
  const { user } = useAuth();
  const [tab, setTab]               = useState('programs');
  const [programs, setPrograms]     = useState([]);
  const [courses, setCourses]       = useState([]);
  const [timetable, setTimetable]   = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [faculty, setFaculty]       = useState([]);
  const [loading, setLoading]       = useState(true);

  // filters
  const [filterProgram, setFilterProgram] = useState('');
  const [filterSem, setFilterSem]         = useState('');
  const [filterAY, setFilterAY]           = useState('');

  // forms
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ name:'', code:'', type:'', duration_years:2, department_id:'' });

  const canManage = ['admin','registrar','hod'].includes(user.role);

  useEffect(() => {
    Promise.all([
      api.get('/structure/programs'),
      api.get('/structure/academic-years'),
      api.get('/structure/departments'),
      api.get('/courses'),
      api.get('/faculty'),
    ]).then(([p, ay, d, c, f]) => {
      setPrograms(p.data||[]);
      setAcademicYears(ay.data||[]);
      setDepartments(d.data||[]);
      setCourses(c.data||[]);
      setFaculty(f.data||[]);
      // default to current AY
      const cur = (ay.data||[]).find(a => a.is_current);
      if (cur) setFilterAY(String(cur.id));
    }).finally(() => setLoading(false));
  }, []);

  // load timetable when schedule tab active
  useEffect(() => {
    if (tab !== 'schedule') return;
    const params = {};
    if (filterProgram) params.program_id = filterProgram;
    if (filterSem)     params.semester    = filterSem;
    if (filterAY)      params.academic_year_id = filterAY;
    api.get('/timetable/weekly', { params }).then(r => setTimetable(r.data || {}));
  }, [tab, filterProgram, filterSem, filterAY]);

  const filteredCourses = courses.filter(c =>
    (!filterProgram || String(c.program_id) === filterProgram) &&
    (!filterSem     || String(c.semester)   === filterSem)
  );

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

  const semOptions = [...new Set(courses.map(c => c.semester))].sort((a,b)=>a-b);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Academic Management</h1>
          <p className="text-gray-500 text-sm mt-1">Programs · Courses · Class Schedule · Batches · Faculty Assignments</p>
        </div>
        {canManage && tab === 'programs' && (
          <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Program</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Filters bar — shown for courses, schedule, faculty */}
      {(tab==='courses'||tab==='schedule'||tab==='faculty') && (
        <div className="flex flex-wrap gap-3">
          <select value={filterProgram} onChange={e=>setFilterProgram(e.target.value)} className="select-field text-sm w-48">
            <option value="">All Programs</option>
            {programs.map(p=><option key={p.id} value={p.id}>{p.code} – {p.name}</option>)}
          </select>
          <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} className="select-field text-sm w-36">
            <option value="">All Terms</option>
            {semOptions.map(s=><option key={s} value={s}>Term / Sem {s}</option>)}
          </select>
          {tab==='schedule' && (
            <select value={filterAY} onChange={e=>setFilterAY(e.target.value)} className="select-field text-sm w-44">
              <option value="">All Academic Years</option>
              {academicYears.map(a=><option key={a.id} value={a.id}>{a.name}{a.is_current?' (Current)':''}</option>)}
            </select>
          )}
          {(filterProgram||filterSem) && (
            <button onClick={()=>{setFilterProgram('');setFilterSem('');}} className="text-sm text-gray-400 hover:text-gray-600 underline">Clear</button>
          )}
        </div>
      )}

      {/* ── PROGRAMS ─────────────────────────────────────────────────────── */}
      {tab === 'programs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {programs.map(p => (
            <div key={p.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <span className="badge-blue font-mono text-xs">{p.code}</span>
                  <h3 className="font-bold mt-1 truncate">{p.name}</h3>
                  <p className="text-gray-500 text-sm mt-0.5">{p.duration_years} year{p.duration_years>1?'s':''}{p.dept_name ? ` · ${p.dept_name}` : ''}</p>
                </div>
                <div className="text-right ml-3">
                  <p className="text-3xl font-bold text-msrim-blue">{p.student_count||0}</p>
                  <p className="text-xs text-gray-400">students</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span>{courses.filter(c=>c.program_id===p.id).length} courses</span>
                <span>{(academicYears.find(a=>a.is_current)||{}).name||''}</span>
              </div>
            </div>
          ))}
          {!programs.length && <div className="col-span-3 card p-8 text-center text-gray-400">No programs found.</div>}
        </div>
      )}

      {/* ── COURSES ──────────────────────────────────────────────────────── */}
      {tab === 'courses' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">{filteredCourses.length} courses</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50">
                <th className="table-th">Code</th>
                <th className="table-th">Course Name</th>
                <th className="table-th">Program</th>
                <th className="table-th text-center">Term</th>
                <th className="table-th text-center">Credits</th>
                <th className="table-th">Type</th>
                <th className="table-th">Faculty</th>
              </tr></thead>
              <tbody>
                {filteredCourses.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-mono text-xs text-msrim-blue font-semibold">{c.code}</td>
                    <td className="table-td font-medium">{c.name}</td>
                    <td className="table-td text-gray-500 text-sm">{c.program_name}</td>
                    <td className="table-td text-center"><span className="badge-gray text-xs">Term {c.semester}</span></td>
                    <td className="table-td text-center font-semibold">{c.credits}</td>
                    <td className="table-td"><span className={c.type==='core'?'badge-blue':'badge-orange'}>{c.type}</span></td>
                    <td className="table-td text-sm text-gray-600">{c.faculty_name||<span className="text-red-400 text-xs">Unassigned</span>}</td>
                  </tr>
                ))}
                {!filteredCourses.length && <tr><td colSpan={7} className="table-td text-center py-10 text-gray-400">No courses match the selected filters.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CLASS SCHEDULE ───────────────────────────────────────────────── */}
      {tab === 'schedule' && (
        <div className="space-y-3">
          {Object.keys(timetable).length === 0 ? (
            <div className="card p-10 text-center text-gray-400">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>No class schedule found for the selected filters.</p>
              <p className="text-sm mt-1">Select a Program and Term above, or <a href="/timetable" className="text-msrim-blue underline">go to Timetable</a> to add slots.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-msrim-blue text-white">
                    <th className="p-3 text-left text-sm font-semibold w-24">Time</th>
                    {DAYS.filter(d => (timetable[d]||[]).length > 0 || Object.values(timetable).some(slots => slots.length > 0)).map(d => (
                      <th key={d} className="p-3 text-center text-sm font-semibold">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* collect unique time slots */}
                  {[...new Set(
                    Object.values(timetable).flat().map(s => `${s.start_time}–${s.end_time}`)
                  )].sort().map(timeKey => {
                    const [start, end] = timeKey.split('–');
                    const activeDays = DAYS.filter(d => (timetable[d]||[]).length > 0);
                    return (
                      <tr key={timeKey} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-xs font-semibold text-gray-500 whitespace-nowrap bg-gray-50">
                          {start}<br/><span className="text-gray-400">{end}</span>
                        </td>
                        {activeDays.map(d => {
                          const slot = (timetable[d]||[]).find(s => s.start_time===start && s.end_time===end);
                          return (
                            <td key={d} className="p-2 text-center">
                              {slot ? (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 text-left">
                                  <p className="text-xs font-semibold text-msrim-blue truncate">{slot.course_code}</p>
                                  <p className="text-xs text-gray-600 truncate leading-tight mt-0.5">{slot.course_name}</p>
                                  <p className="text-xs text-gray-400 mt-0.5">{slot.faculty_name||''}</p>
                                  {slot.room && <p className="text-xs text-gray-400">Room {slot.room}</p>}
                                </div>
                              ) : (
                                <div className="h-16 flex items-center justify-center text-gray-200 text-xs">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── BATCHES ──────────────────────────────────────────────────────── */}
      {tab === 'batches' && (
        <div className="space-y-4">
          {programs.map(prog => {
            const progStudents = []; // would need student API breakdown
            const batches = [...new Set(
              courses.filter(c=>c.program_id===prog.id).map(c=>c.academic_year)
            )].filter(Boolean);
            return (
              <div key={prog.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="badge-blue font-mono text-xs">{prog.code}</span>
                    <h3 className="font-bold mt-1">{prog.name}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-msrim-blue">{prog.student_count||0}</p>
                    <p className="text-xs text-gray-400">total students</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {academicYears.map(ay => {
                    const termCourses = courses.filter(c => c.program_id===prog.id && c.academic_year===ay.name);
                    return (
                      <div key={ay.id} className={`rounded-xl p-3 border text-center ${ay.is_current?'bg-blue-50 border-blue-200':'bg-gray-50 border-gray-200'}`}>
                        <p className={`text-xs font-bold ${ay.is_current?'text-msrim-blue':'text-gray-500'}`}>{ay.name}</p>
                        {ay.is_current && <span className="text-xs text-green-600 font-medium">● Current</span>}
                        <p className="text-lg font-bold text-gray-700 mt-1">{termCourses.length}</p>
                        <p className="text-xs text-gray-400">courses</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FACULTY ASSIGNMENTS ───────────────────────────────────────────── */}
      {tab === 'faculty' && (
        <div className="space-y-3">
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <p className="text-sm font-medium text-gray-600">
                {filteredCourses.filter(c=>c.faculty_id).length} of {filteredCourses.length} courses assigned
                {filteredCourses.filter(c=>!c.faculty_id).length > 0 &&
                  <span className="ml-2 text-red-500 font-semibold">· {filteredCourses.filter(c=>!c.faculty_id).length} unassigned</span>}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b bg-gray-50">
                  <th className="table-th">Course Code</th>
                  <th className="table-th">Course Name</th>
                  <th className="table-th text-center">Term</th>
                  <th className="table-th">Program</th>
                  <th className="table-th">Assigned Faculty</th>
                  <th className="table-th">Department</th>
                </tr></thead>
                <tbody>
                  {filteredCourses.map(c => (
                    <tr key={c.id} className={`border-b border-gray-50 hover:bg-gray-50 ${!c.faculty_id?'bg-red-50/30':''}`}>
                      <td className="table-td font-mono text-xs text-msrim-blue font-semibold">{c.code}</td>
                      <td className="table-td font-medium text-sm">{c.name}</td>
                      <td className="table-td text-center"><span className="badge-gray text-xs">Term {c.semester}</span></td>
                      <td className="table-td text-xs text-gray-500">{c.program_name}</td>
                      <td className="table-td">
                        {c.faculty_name
                          ? <span className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-msrim-blue flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{c.faculty_name.charAt(0)}</div>
                              <span className="text-sm">{c.faculty_name}</span>
                            </span>
                          : <span className="flex items-center gap-1 text-red-500 text-xs font-medium"><X className="w-3 h-3"/>Not Assigned</span>}
                      </td>
                      <td className="table-td text-xs text-gray-400">{c.program_name}</td>
                    </tr>
                  ))}
                  {!filteredCourses.length && <tr><td colSpan={6} className="table-td text-center py-10 text-gray-400">No courses match filters.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── ACADEMIC YEARS ───────────────────────────────────────────────── */}
      {tab === 'academic-years' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Batch / Year</th>
              <th className="table-th">Start Date</th>
              <th className="table-th">End Date</th>
              <th className="table-th">Status</th>
              <th className="table-th text-center">Courses</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {academicYears.map(ay => (
                <tr key={ay.id} className="hover:bg-gray-50">
                  <td className="table-td font-bold">{ay.name}</td>
                  <td className="table-td">{ay.start_date ? new Date(ay.start_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="table-td">{ay.end_date ? new Date(ay.end_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="table-td"><span className={ay.is_current?'badge-green':'badge-gray'}>{ay.is_current?'● Current':'Inactive'}</span></td>
                  <td className="table-td text-center font-semibold">{courses.filter(c=>c.academic_year===ay.name).length}</td>
                </tr>
              ))}
              {!academicYears.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No academic years found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DEPARTMENTS ──────────────────────────────────────────────────── */}
      {tab === 'departments' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map(d => (
            <div key={d.id} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <span className="badge-blue font-mono text-xs">{d.code}</span>
                  <h3 className="font-bold mt-1">{d.name}</h3>
                  {d.hod_name && <p className="text-gray-500 text-sm mt-0.5">HOD: {d.hod_name}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-msrim-blue">
                    {faculty.filter(f=>f.department_name===d.name).length}
                  </p>
                  <p className="text-xs text-gray-400">faculty</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">{programs.filter(p=>p.department_id===d.id).length} program(s)</p>
              </div>
            </div>
          ))}
          {!departments.length && <div className="col-span-3 card p-8 text-center text-gray-400">No departments found.</div>}
        </div>
      )}

      {/* Add Program Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Program</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Program Name *</label>
                <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" placeholder="e.g. Post Graduate Diploma in Management" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Code *</label>
                  <input value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))} className="input-field font-mono" placeholder="PGDM" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Duration (years)</label>
                  <input type="number" min="1" max="5" value={form.duration_years} onChange={e=>setForm(f=>({...f,duration_years:parseInt(e.target.value)||2}))} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select value={form.department_id} onChange={e=>setForm(f=>({...f,department_id:e.target.value}))} className="select-field">
                  <option value="">Select department...</option>
                  {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={addProgram} className="btn-primary flex-1">Add Program</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
