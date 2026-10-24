import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Clock, Plus, Trash2, X, ChevronLeft, ChevronRight,
  Calendar, Download, BarChart3, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const COLORS = [
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-green-100 text-green-800 border-green-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-pink-100 text-pink-800 border-pink-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-yellow-100 text-yellow-800 border-yellow-200',
  'bg-red-100 text-red-800 border-red-200',
  'bg-cyan-100 text-cyan-800 border-cyan-200',
];
function colorFor(id) { return COLORS[(id || 0) % COLORS.length]; }

function getWeekDates(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0=Sun
  const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return DAYS.map((_, i) => { const dt = new Date(mon); dt.setDate(mon.getDate() + i); return dt; });
}

function fmtDate(d) { return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' }); }

export default function Timetable() {
  const { user }  = useAuth();
  const [weekly,    setWeekly]    = useState({});
  const [courses,   setCourses]   = useState([]);
  const [programs,  setPrograms]  = useState([]);
  const [holidays,  setHolidays]  = useState([]);
  const [calEvents, setCalEvents] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [view,      setView]      = useState('week');   // week | day | month
  const [showCal,   setShowCal]   = useState(false);
  const [weekBase,  setWeekBase]  = useState(new Date());

  // filters
  const [filterProg, setFilterProg] = useState('');
  const [filterSem,  setFilterSem]  = useState('');
  const [filterCourse, setFilterCourse] = useState('');

  const canManage = ['admin','hod','registrar'].includes(user.role);
  const weekDates = getWeekDates(weekBase);
  const today     = new Date();

  const fetchTimetable = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProg)   params.program_id = filterProg;
      if (filterSem)    params.semester   = filterSem;
      const r = await api.get('/timetable/weekly', { params });
      setWeekly(r.data || {});
    } catch { toast.error('Failed to load timetable'); }
    finally { setLoading(false); }
  }, [filterProg, filterSem]);

  useEffect(() => {
    api.get('/courses').then(r => setCourses(r.data || []));
    api.get('/structure/programs').then(r => setPrograms(r.data || []));
  }, []);

  useEffect(() => { fetchTimetable(); }, [fetchTimetable]);

  useEffect(() => {
    if (!showCal) return;
    const from = weekDates[0].toISOString().split('T')[0];
    const to   = weekDates[5].toISOString().split('T')[0];
    api.get('/calendar', { params: { from_date: from, to_date: to } })
       .then(r => setCalEvents(r.data || []));
    api.get('/holidays', { params: { from: from, to: to } })
       .catch(() => {});
  }, [showCal, weekBase]);

  const prevWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() - 7); setWeekBase(d); };
  const nextWeek = () => { const d = new Date(weekBase); d.setDate(d.getDate() + 7); setWeekBase(d); };
  const goToday  = () => setWeekBase(new Date());

  const allSlots = Object.values(weekly).flat();
  const filteredSlots = filterCourse
    ? allSlots.filter(s => String(s.course_id) === filterCourse)
    : allSlots;
  const times = [...new Set(allSlots.map(s => s.start_time))].sort();

  const semOptions = [...new Set(courses.map(c => c.semester))].sort((a,b)=>a-b);
  const filteredWeekly = {};
  DAYS.forEach(d => {
    filteredWeekly[d] = (weekly[d]||[]).filter(s =>
      (!filterCourse || String(s.course_id) === filterCourse)
    );
  });

  const weekLabel = `${fmtDate(weekDates[0])} – ${fmtDate(weekDates[5])} ${weekDates[0].getFullYear()}`;
  const isCurrentWeek = weekDates[0] <= today && today <= weekDates[5];

  // Calendar events by day of week
  const calByDay = {};
  if (showCal) {
    calEvents.forEach(ev => {
      const evDate = new Date(ev.start_date);
      weekDates.forEach((wd, i) => {
        if (evDate.toDateString() === wd.toDateString()) {
          if (!calByDay[DAYS[i]]) calByDay[DAYS[i]] = [];
          calByDay[DAYS[i]].push(ev);
        }
      });
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Manage Timetable</h1>
          <p className="text-gray-500 text-sm mt-0.5">Weekly class schedule</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Show Institutional Calendar toggle */}
          <button onClick={() => setShowCal(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showCal?'bg-msrim-blue text-white border-msrim-blue':'bg-white text-gray-600 border-gray-200 hover:border-msrim-blue'}`}>
            <Calendar className="w-4 h-4" />
            <span>Show Institutional Calendar</span>
            {showCal ? <ToggleRight className="w-4 h-4"/> : <ToggleLeft className="w-4 h-4 opacity-40"/>}
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors">
            <BarChart3 className="w-4 h-4" /> Reports
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-600 hover:border-gray-300 transition-colors">
            <Download className="w-4 h-4" />
          </button>
          {canManage && (
            <button className="btn-primary" onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Create Slot
            </button>
          )}
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Term:</span>
          <select value={filterSem} onChange={e=>setFilterSem(e.target.value)} className="select-field text-sm w-36">
            <option value="">Select Term</option>
            {semOptions.map(s=><option key={s} value={s}>Term / Sem {s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Department:</span>
          <select value={filterProg} onChange={e=>setFilterProg(e.target.value)} className="select-field text-sm w-44">
            <option value="">All Departments</option>
            {programs.map(p=><option key={p.id} value={p.id}>{p.code} – {p.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 font-medium">Course:</span>
          <select value={filterCourse} onChange={e=>setFilterCourse(e.target.value)} className="select-field text-sm w-52">
            <option value="">Select Course</option>
            {courses
              .filter(c => (!filterProg||String(c.program_id)===filterProg) && (!filterSem||String(c.semester)===filterSem))
              .map(c=><option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
          </select>
        </div>
        {(filterProg||filterSem||filterCourse) && (
          <button onClick={()=>{setFilterProg('');setFilterSem('');setFilterCourse('');}} className="text-sm text-gray-400 hover:text-gray-600 underline">Clear filters</button>
        )}
      </div>

      {/* Week navigation + view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={goToday} className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${isCurrentWeek?'bg-msrim-blue text-white border-msrim-blue':'bg-white text-gray-600 border-gray-200 hover:border-msrim-blue'}`}>
            Today
          </button>
          <button onClick={prevWeek} className="p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={nextWeek} className="p-1.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white text-gray-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-700 ml-1">{weekLabel}</span>
          <button onClick={fetchTimetable} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {['Day','Week','Month'].map(v => (
            <button key={v} onClick={() => setView(v.toLowerCase())}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view===v.toLowerCase()?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Timetable grid */}
      {loading ? (
        <div className="card text-center py-16">
          <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : allSlots.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No timetable slots configured yet.</p>
          {canManage && <p className="text-sm mt-1">Click "Create Slot" to build the schedule.</p>}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="bg-msrim-blue text-white">
                  <th className="p-3 text-left text-xs font-semibold w-28 border-r border-white/20">Time</th>
                  {DAYS.map((d, i) => {
                    const dt = weekDates[i];
                    const isToday = dt.toDateString() === today.toDateString();
                    return (
                      <th key={d} className={`p-3 text-center text-xs font-semibold border-r border-white/20 ${isToday?'bg-white/20':''}`}>
                        <div className="uppercase tracking-wider">{d.slice(0,3)}</div>
                        <div className={`text-sm font-bold mt-0.5 ${isToday?'text-yellow-300':''}`}>{fmtDate(dt)}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Calendar events row (if enabled) */}
                {showCal && Object.values(calByDay).some(a=>a.length>0) && (
                  <tr className="bg-amber-50 border-b-2 border-amber-200">
                    <td className="p-2 text-xs text-amber-600 font-semibold border-r border-gray-100">Events</td>
                    {DAYS.map((d, i) => (
                      <td key={d} className="p-1.5 border-r border-gray-100">
                        {(calByDay[d]||[]).map(ev => (
                          <div key={ev.id} className="bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 text-[10px] font-medium truncate mb-0.5">
                            {ev.title}
                          </div>
                        ))}
                      </td>
                    ))}
                  </tr>
                )}
                {times.map(time => (
                  <tr key={time} className="hover:bg-gray-50/50">
                    <td className="p-3 border-r border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span className="font-semibold">{time}</span>
                      </div>
                    </td>
                    {DAYS.map((day, di) => {
                      const dt = weekDates[di];
                      const isToday = dt.toDateString() === today.toDateString();
                      const slot = (filteredWeekly[day]||[]).find(s => s.start_time === time);
                      return (
                        <td key={day} className={`p-1.5 border-r border-gray-100 align-top ${isToday?'bg-blue-50/30':''}`}>
                          {slot ? (
                            <div className={`rounded-lg p-2 text-xs font-medium relative group border ${colorFor(slot.course_id)}`}>
                              <p className="font-bold truncate">{slot.course_code}</p>
                              <p className="truncate opacity-80 leading-tight">{slot.course_name?.split(' ').slice(0,3).join(' ')}</p>
                              {slot.faculty_name && <p className="opacity-60 truncate text-[10px] mt-0.5">{slot.faculty_name}</p>}
                              <div className="flex items-center justify-between mt-0.5">
                                {slot.room && <span className="opacity-50 text-[10px]">Room {slot.room}</span>}
                                <span className="opacity-50 text-[10px]">{slot.start_time}–{slot.end_time}</span>
                              </div>
                              {canManage && (
                                <button onClick={() => api.delete(`/timetable/${slot.id}`).then(()=>{toast.success('Removed');fetchTimetable();}).catch(()=>toast.error('Failed'))}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-white/80 rounded hover:bg-red-100 hover:text-red-600 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="h-14 flex items-center justify-center text-gray-200 text-sm select-none">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-400">
            <span>{allSlots.length} total slots · {filteredSlots.length} shown</span>
            <span>Week {Math.ceil(((weekDates[0] - new Date(weekDates[0].getFullYear(),0,1)) / 86400000 + 1) / 7)}</span>
          </div>
        </div>
      )}

      {showAdd && <AddSlotModal onClose={() => { setShowAdd(false); fetchTimetable(); }} courses={courses} />}
    </div>
  );
}

function AddSlotModal({ onClose, courses }) {
  const [form, setForm] = useState({ course_id:'', day:'Monday', start_time:'09:00', end_time:'10:30', room:'' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/timetable', form);
      toast.success('Slot added!'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add slot'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Create Timetable Slot</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Course *</label>
            <select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field">
              <option value="">Select Course</option>
              {courses.map(c=><option key={c.id} value={c.id}>{c.code} — {c.name} (Sem {c.semester})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Day *</label>
              <select required value={form.day} onChange={e=>set('day',e.target.value)} className="select-field">
                {DAYS.map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room</label>
              <input value={form.room} onChange={e=>set('room',e.target.value)} className="input-field" placeholder="e.g. 101" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time *</label>
              <input required type="time" value={form.start_time} onChange={e=>set('start_time',e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time *</label>
              <input required type="time" value={form.end_time} onChange={e=>set('end_time',e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading?'Adding…':'Create Slot'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
