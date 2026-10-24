import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Grid3x3, Building2, Users, BarChart3, Plus, Trash2, X, AlertTriangle,
  Clock, RefreshCw, ChevronDown, CheckCircle, AlertCircle, Info,
  CalendarDays, Printer, Filter, ArrowRight
} from 'lucide-react';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ROOM_TYPE_COLOR = { classroom:'bg-blue-50 border-blue-200', lab:'bg-purple-50 border-purple-200', seminar:'bg-green-50 border-green-200', hall:'bg-orange-50 border-orange-200' };
const PROG_COLOR = { PGDM:'bg-blue-100 text-blue-800', FPM:'bg-orange-100 text-orange-800' };
const CONFLICT_COLOR = { critical:'border-red-400 bg-red-50', warning:'border-yellow-400 bg-yellow-50' };

function Badge({ children, color='blue' }) {
  const cls = { blue:'bg-blue-100 text-blue-700', orange:'bg-orange-100 text-orange-700', green:'bg-green-100 text-green-700', red:'bg-red-100 text-red-700', gray:'bg-gray-100 text-gray-600', purple:'bg-purple-100 text-purple-700' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls[color]||cls.gray}`}>{children}</span>;
}

export default function ClassroomSchedule() {
  const { user } = useAuth();
  const [view, setView]           = useState('grid');
  const [slots, setSlots]         = useState([]);
  const [rooms, setRooms]         = useState([]);
  const [facultyLoad, setFacultyLoad] = useState([]);
  const [utilization, setUtilization] = useState(null);
  const [conflicts, setConflicts] = useState({ conflicts: [], count: 0, conflict_slot_ids: [] });
  const [substitutions, setSubstitutions] = useState([]);
  const [programs, setPrograms]   = useState([]);
  const [courses, setCourses]     = useState([]);
  const [faculty, setFaculty]     = useState([]);
  const [loading, setLoading]     = useState(true);

  const [filterProgram, setFilterProgram] = useState('');
  const [filterSem, setFilterSem]         = useState('');
  const [filterRoom, setFilterRoom]       = useState('');
  const [filterDay, setFilterDay]         = useState('');

  const [showAddSlot, setShowAddSlot]     = useState(false);
  const [showSubModal, setShowSubModal]   = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);
  const [showSubs, setShowSubs]           = useState(false);
  const [activeSlot, setActiveSlot]       = useState(null);

  const canManage = ['admin','hod','registrar'].includes(user.role);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterProgram) params.program_id = filterProgram;
      if (filterSem)     params.semester   = filterSem;
      if (filterRoom)    params.room       = filterRoom;
      if (filterDay)     params.day        = filterDay;
      const r = await api.get('/classroom-schedule/slots', { params });
      setSlots(r.data || []);
    } catch { toast.error('Failed to load schedule'); }
    finally { setLoading(false); }
  }, [filterProgram, filterSem, filterRoom, filterDay]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  useEffect(() => {
    api.get('/structure/programs').then(r => setPrograms(r.data || []));
    api.get('/courses').then(r => setCourses(r.data || []));
    api.get('/faculty').then(r => setFaculty(r.data || []));
    api.get('/classroom-schedule/conflicts').then(r => setConflicts(r.data || { conflicts: [], count: 0, conflict_slot_ids: [] }));
    api.get('/classroom-schedule/rooms').then(r => setRooms(r.data || []));
  }, []);

  useEffect(() => {
    if (view === 'faculty') api.get('/classroom-schedule/faculty-load').then(r => setFacultyLoad(r.data || []));
    if (view === 'utilization') api.get('/classroom-schedule/utilization').then(r => setUtilization(r.data));
    if (view === 'subs') api.get('/classroom-schedule/substitutions').then(r => setSubstitutions(r.data || []));
  }, [view]);

  // Build grid data structures
  const times = [...new Set(slots.map(s => s.start_time))].sort();
  const semOptions = [...new Set(courses.map(c => c.semester))].sort((a,b) => a-b);
  const conflictIds = new Set(conflicts.conflict_slot_ids || []);

  // Slots grouped by day
  const byDay = {};
  DAYS.forEach(d => { byDay[d] = slots.filter(s => s.day === d); });

  async function deleteSlot(id) {
    if (!window.confirm('Remove this slot?')) return;
    try {
      await api.delete(`/classroom-schedule/slots/${id}`);
      toast.success('Slot removed');
      loadSlots();
      api.get('/classroom-schedule/conflicts').then(r => setConflicts(r.data || { conflicts: [], count: 0, conflict_slot_ids: [] }));
    } catch { toast.error('Failed to remove slot'); }
  }

  const VIEWS = [
    { id:'grid',        icon: Grid3x3,    label:'Schedule Grid' },
    { id:'rooms',       icon: Building2,  label:'Room Board' },
    { id:'faculty',     icon: Users,      label:'Faculty Load' },
    { id:'utilization', icon: BarChart3,  label:'Utilization' },
    { id:'subs',        icon: CalendarDays, label:'Substitutions' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Classroom Schedule Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">Enterprise schedule planner · conflict detection · room utilization</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {conflicts.count > 0 && (
            <button onClick={() => setShowConflicts(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-300 text-red-700 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4" />{conflicts.count} Conflict{conflicts.count !== 1 ? 's' : ''}
            </button>
          )}
          {conflicts.count === 0 && (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> No Conflicts
            </div>
          )}
          <button onClick={() => { loadSlots(); api.get('/classroom-schedule/conflicts').then(r => setConflicts(r.data || { conflicts:[], count:0, conflict_slot_ids:[] })); }}
            className="p-2 border border-gray-200 rounded-xl bg-white hover:border-gray-300 text-gray-500 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          {canManage && (
            <button onClick={() => setShowAddSlot(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Add Slot
            </button>
          )}
        </div>
      </div>

      {/* View switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {VIEWS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${view===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* Filters (grid + rooms views) */}
      {(view === 'grid' || view === 'rooms') && (
        <div className="flex flex-wrap gap-3 items-center">
          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)} className="select-field text-sm w-36">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
          <select value={filterSem} onChange={e => setFilterSem(e.target.value)} className="select-field text-sm w-32">
            <option value="">All Terms</option>
            {semOptions.map(s => <option key={s} value={s}>Term {s}</option>)}
          </select>
          <select value={filterRoom} onChange={e => setFilterRoom(e.target.value)} className="select-field text-sm w-36">
            <option value="">All Rooms</option>
            {rooms.map(r => <option key={r.id} value={r.room_number}>{r.building_code} – {r.room_number}</option>)}
          </select>
          <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="select-field text-sm w-32">
            <option value="">All Days</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          {(filterProgram || filterSem || filterRoom || filterDay) && (
            <button onClick={() => { setFilterProgram(''); setFilterSem(''); setFilterRoom(''); setFilterDay(''); }}
              className="text-sm text-gray-400 hover:text-gray-600 underline">Clear</button>
          )}
          <span className="text-sm text-gray-400 ml-auto">{slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* ── GRID VIEW ──────────────────────────────────────────────────────── */}
      {view === 'grid' && (
        loading ? (
          <div className="card flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slots.length === 0 ? (
          <div className="card text-center py-20 text-gray-400">
            <Grid3x3 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No slots found for the selected filters.</p>
            {canManage && <p className="text-sm mt-1">Click "Add Slot" to build the schedule.</p>}
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-msrim-blue text-white">
                    <th className="p-3 text-left text-xs font-semibold w-24 border-r border-white/20">Time</th>
                    {(filterDay ? [filterDay] : DAYS).map(d => (
                      <th key={d} className="p-3 text-center text-xs font-semibold border-r border-white/20 uppercase tracking-wider">{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {times.map(time => (
                    <tr key={time} className="hover:bg-gray-50/40">
                      <td className="p-2.5 border-r border-gray-100 bg-gray-50 align-top">
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-semibold">
                          <Clock className="w-3 h-3 flex-shrink-0" />{time}
                        </div>
                      </td>
                      {(filterDay ? [filterDay] : DAYS).map(day => {
                        const daySlots = (byDay[day] || []).filter(s => s.start_time === time);
                        const isConflict = daySlots.some(s => conflictIds.has(s.id));
                        return (
                          <td key={day} className="p-1 border-r border-gray-100 align-top min-w-[120px]">
                            {daySlots.length === 0 ? (
                              <div className="h-16 flex items-center justify-center text-gray-200 text-xs select-none">—</div>
                            ) : daySlots.map(slot => (
                              <div key={slot.id}
                                className={`rounded-lg p-2 text-xs mb-1 relative group border ${isConflict ? CONFLICT_COLOR.critical : (PROG_COLOR[slot.program_code] ? '' : 'bg-blue-50 border-blue-100')} ${slot.program_code === 'FPM' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                                {isConflict && <AlertTriangle className="w-3 h-3 text-red-500 absolute top-1 right-5" />}
                                <p className="font-bold truncate text-gray-800">{slot.course_code}</p>
                                <p className="text-gray-600 truncate leading-tight">{slot.course_name?.split(' ').slice(0,3).join(' ')}</p>
                                {slot.faculty_name && <p className="text-gray-400 truncate text-[10px] mt-0.5">{slot.faculty_name.split(' ')[0]}</p>}
                                <div className="flex items-center justify-between mt-0.5">
                                  {slot.room && <span className="text-[10px] text-gray-400">R {slot.room}</span>}
                                  <span className="text-[10px] text-gray-400">{slot.end_time}</span>
                                </div>
                                {canManage && (
                                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-0.5 transition-opacity">
                                    <button onClick={() => { setActiveSlot(slot); setShowSubModal(true); }}
                                      className="p-0.5 bg-white/90 rounded hover:bg-yellow-100 hover:text-yellow-700" title="Substitution">
                                      <CalendarDays className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteSlot(slot.id)}
                                      className="p-0.5 bg-white/90 rounded hover:bg-red-100 hover:text-red-600" title="Delete">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-400">
              <span>{slots.length} total slots · {new Set(slots.map(s=>s.room).filter(Boolean)).size} rooms used</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block"/>PGDM</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-200 inline-block"/>FPM</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-50 border border-red-400 inline-block"/>Conflict</span>
              </div>
            </div>
          </div>
        )
      )}

      {/* ── ROOM BOARD ─────────────────────────────────────────────────────── */}
      {view === 'rooms' && (
        <div className="space-y-3">
          {rooms.filter(r => !filterRoom || r.room_number === filterRoom).map(room => {
            const roomSlots = slots.filter(s => s.room === room.room_number);
            return (
              <div key={room.id} className={`card p-0 overflow-hidden border-l-4 ${room.room_type === 'lab' ? 'border-purple-400' : room.room_type === 'seminar' ? 'border-green-400' : 'border-blue-400'}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <div>
                      <span className="font-bold text-sm">Room {room.room_number}</span>
                      <span className="text-gray-400 text-xs ml-2">{room.building_name}</span>
                    </div>
                    <Badge color={room.room_type === 'lab' ? 'purple' : room.room_type === 'seminar' ? 'green' : 'blue'}>{room.room_type}</Badge>
                    <span className="text-xs text-gray-400">Cap: {room.capacity}</span>
                    {room.has_projector === 1 && <span className="text-xs text-gray-400">📽</span>}
                    {room.has_ac === 1 && <span className="text-xs text-gray-400">❄</span>}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <span className="font-semibold text-gray-700">{roomSlots.length}</span> slots/week
                  </div>
                </div>
                {roomSlots.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" /> Room is free all week
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                      <thead><tr className="text-xs text-gray-400 border-b">
                        {DAYS.map(d => <th key={d} className="px-3 py-2 text-center font-medium">{d.slice(0,3)}</th>)}
                      </tr></thead>
                      <tbody><tr>
                        {DAYS.map(day => {
                          const ds = roomSlots.filter(s => s.day === day);
                          return (
                            <td key={day} className="px-2 py-1.5 align-top border-r border-gray-50 min-w-[100px]">
                              {ds.length === 0
                                ? <div className="text-[10px] text-green-400 text-center py-2">Free</div>
                                : ds.map(s => (
                                  <div key={s.id} className="bg-blue-50 border border-blue-100 rounded p-1.5 mb-1 text-[10px]">
                                    <p className="font-bold text-msrim-blue">{s.course_code}</p>
                                    <p className="text-gray-500">{s.start_time}–{s.end_time}</p>
                                    <p className="text-gray-400 truncate">{s.faculty_name?.split(' ')[0]}</p>
                                  </div>
                                ))}
                            </td>
                          );
                        })}
                      </tr></tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── FACULTY LOAD ───────────────────────────────────────────────────── */}
      {view === 'faculty' && (
        <div className="space-y-3">
          {facultyLoad.length === 0 && (
            <div className="card text-center py-16 text-gray-400"><Users className="w-8 h-8 mx-auto mb-3 opacity-30"/><p>Loading faculty load…</p></div>
          )}
          {facultyLoad.map(f => {
            const pct = Math.min(100, (f.total_hours / 20) * 100);
            const isHeavy = f.total_hours > 18;
            const byDay = {};
            DAYS.forEach(d => { byDay[d] = f.slots.filter(s => s.day === d); });
            return (
              <div key={f.faculty_id} className={`card p-0 overflow-hidden ${isHeavy ? 'border-orange-300' : ''}`}>
                <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isHeavy ? 'bg-orange-500' : 'bg-msrim-blue'}`}>
                      {f.faculty_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{f.faculty_name}</p>
                      <p className="text-xs text-gray-400">{f.department}</p>
                    </div>
                    {isHeavy && <Badge color="orange"><AlertTriangle className="w-3 h-3 mr-1 inline"/>Heavy Load</Badge>}
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-gray-800">{f.total_hours.toFixed(1)}<span className="text-xs text-gray-400 font-normal ml-1">hrs/week</span></p>
                      <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${isHeavy ? 'bg-orange-500' : 'bg-msrim-blue'}`} style={{ width:`${pct}%` }} />
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{f.slots.length} slot{f.slots.length!==1?'s':''}</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead><tr className="text-xs text-gray-400 border-b">
                      {DAYS.map(d => <th key={d} className="px-3 py-1.5 text-center font-medium">{d.slice(0,3)}</th>)}
                    </tr></thead>
                    <tbody><tr>
                      {DAYS.map(day => (
                        <td key={day} className="px-2 py-1.5 align-top border-r border-gray-50 min-w-[100px]">
                          {(byDay[day]||[]).length === 0
                            ? <div className="text-[10px] text-gray-200 text-center py-1">—</div>
                            : (byDay[day]||[]).map(s => (
                              <div key={`${s.day}${s.start_time}`} className="bg-msrim-blue/5 border border-msrim-blue/20 rounded p-1.5 mb-1 text-[10px]">
                                <p className="font-bold text-msrim-blue">{s.course_code}</p>
                                <p className="text-gray-500">{s.start_time}–{s.end_time}</p>
                                <p className="text-gray-400">R{s.room}</p>
                              </div>
                            ))}
                        </td>
                      ))}
                    </tr></tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── UTILIZATION ────────────────────────────────────────────────────── */}
      {view === 'utilization' && utilization && (
        <div className="space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Total Slots', value: utilization.totalSlots, color:'bg-msrim-blue', icon:'📅' },
              { label:'Rooms in Use', value: utilization.roomsUsed, color:'bg-green-500', icon:'🏫' },
              { label:'Peak Day', value: utilization.byDay[0]?.day?.slice(0,3) || '—', color:'bg-orange-500', icon:'📈' },
              { label:'Peak Time', value: utilization.byTime[0]?.start_time || '—', color:'bg-purple-500', icon:'⏰' },
            ].map(s => (
              <div key={s.label} className="card p-4 flex items-center gap-4">
                <div className={`w-10 h-10 ${s.color} rounded-xl flex items-center justify-center text-lg`}>{s.icon}</div>
                <div>
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-xl font-bold text-gray-800">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Room utilization */}
            <div className="card">
              <h3 className="font-semibold mb-4 text-gray-700">Room Utilization</h3>
              <div className="space-y-3">
                {utilization.rooms.map(r => (
                  <div key={r.id}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">Room {r.room_number} <span className="text-gray-400 text-xs">({r.room_type})</span></span>
                      <span className={`font-semibold ${r.utilization_pct > 60 ? 'text-orange-600' : r.utilization_pct > 30 ? 'text-msrim-blue' : 'text-gray-400'}`}>{r.utilization_pct}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${r.utilization_pct > 60 ? 'bg-orange-400' : 'bg-msrim-blue'}`} style={{ width:`${r.utilization_pct}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{r.building} · cap {r.capacity} · {r.slots_used} slots</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {/* By day */}
              <div className="card">
                <h3 className="font-semibold mb-3 text-gray-700">Slots by Day</h3>
                <div className="space-y-2">
                  {utilization.byDay.map(d => {
                    const max = Math.max(...utilization.byDay.map(x => x.slots));
                    return (
                      <div key={d.day} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-8">{d.day.slice(0,3)}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-msrim-blue rounded-full" style={{ width:`${(d.slots/max)*100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-4 text-right">{d.slots}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* By time */}
              <div className="card">
                <h3 className="font-semibold mb-3 text-gray-700">Slots by Start Time</h3>
                <div className="space-y-2">
                  {utilization.byTime.map(t => {
                    const max = Math.max(...utilization.byTime.map(x => x.slots));
                    return (
                      <div key={t.start_time} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-12">{t.start_time}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width:`${(t.slots/max)*100}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-4 text-right">{t.slots}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {view === 'utilization' && !utilization && (
        <div className="card flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── SUBSTITUTIONS VIEW ─────────────────────────────────────────────── */}
      {view === 'subs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{substitutions.length} recorded substitution{substitutions.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Date</th>
                <th className="table-th">Class</th>
                <th className="table-th">Original Time</th>
                <th className="table-th">Type</th>
                <th className="table-th">Substitute / Notes</th>
                <th className="table-th">Logged By</th>
                {canManage && <th className="table-th"/>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {substitutions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td font-semibold">{new Date(s.date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td className="table-td"><p className="font-medium text-sm">{s.course_code}</p><p className="text-xs text-gray-400">{s.course_name}</p></td>
                    <td className="table-td text-sm text-gray-500">{s.day} {s.start_time}–{s.end_time}</td>
                    <td className="table-td">
                      <Badge color={s.type==='cancellation'?'red':s.type==='substitution'?'orange':'blue'}>{s.type}</Badge>
                    </td>
                    <td className="table-td text-sm">
                      {s.substitute_name && <p className="font-medium">{s.substitute_name}</p>}
                      {s.new_room && <p className="text-xs text-gray-400">Room → {s.new_room}</p>}
                      {s.reason && <p className="text-xs text-gray-400 italic">{s.reason}</p>}
                    </td>
                    <td className="table-td text-xs text-gray-400">{s.created_by_name}</td>
                    {canManage && (
                      <td className="table-td">
                        <button onClick={async () => { await api.delete(`/classroom-schedule/substitutions/${s.id}`); toast.success('Removed'); api.get('/classroom-schedule/substitutions').then(r => setSubstitutions(r.data||[])); }}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5"/></button>
                      </td>
                    )}
                  </tr>
                ))}
                {substitutions.length === 0 && <tr><td colSpan={7} className="table-td text-center py-10 text-gray-400">No substitutions recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {showAddSlot && <AddSlotModal courses={courses} rooms={rooms} onClose={() => { setShowAddSlot(false); loadSlots(); api.get('/classroom-schedule/conflicts').then(r => setConflicts(r.data || { conflicts:[], count:0, conflict_slot_ids:[] })); }} />}
      {showSubModal && activeSlot && <SubstitutionModal slot={activeSlot} faculty={faculty} rooms={rooms} onClose={() => { setShowSubModal(false); setActiveSlot(null); if (view==='subs') api.get('/classroom-schedule/substitutions').then(r=>setSubstitutions(r.data||[])); }} />}
      {showConflicts && <ConflictModal conflicts={conflicts.conflicts} onClose={() => setShowConflicts(false)} />}
    </div>
  );
}

// ── Add Slot Modal ──────────────────────────────────────────────────────────
function AddSlotModal({ courses, rooms, onClose }) {
  const [form, setForm] = useState({ course_id:'', day:'Monday', start_time:'09:00', end_time:'10:30', room:'' });
  const [checking, setChecking] = useState(false);
  const [conflictsFound, setConflictsFound] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function checkConflicts() {
    if (!form.course_id || !form.start_time || !form.end_time) return;
    setChecking(true);
    try {
      await api.post('/classroom-schedule/slots', form);
      setConflictsFound([]); setWarnings([]);
    } catch (err) {
      if (err.response?.status === 409) {
        setConflictsFound(err.response.data.errors || []);
        setWarnings(err.response.data.warnings || []);
      }
    } finally { setChecking(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/classroom-schedule/slots', { ...form, force: true });
      toast.success('Slot added!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Schedule Slot</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Course *</label>
            <select required value={form.course_id} onChange={e => set('course_id', e.target.value)} className="select-field">
              <option value="">Select course…</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name} (Sem {c.semester})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Day *</label>
              <select required value={form.day} onChange={e => set('day', e.target.value)} className="select-field">
                {DAYS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room</label>
              <select value={form.room} onChange={e => set('room', e.target.value)} className="select-field">
                <option value="">No room assigned</option>
                {rooms.map(r => <option key={r.id} value={r.room_number}>{r.room_number} – {r.building_name} (cap {r.capacity})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Time *</label>
              <input required type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time *</label>
              <input required type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="input-field" />
            </div>
          </div>

          <button type="button" onClick={checkConflicts} disabled={checking || !form.course_id}
            className="w-full border border-gray-200 rounded-xl py-2 text-sm text-gray-600 hover:border-msrim-blue hover:text-msrim-blue transition-colors flex items-center justify-center gap-2">
            {checking ? <div className="w-4 h-4 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin"/> : <CheckCircle className="w-4 h-4"/>}
            Check for Conflicts
          </button>

          {conflictsFound.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/>Conflicts Detected</p>
              {conflictsFound.map((c, i) => <p key={i} className="text-xs text-red-600">• {c}</p>)}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/>Warnings</p>
              {warnings.map((w, i) => <p key={i} className="text-xs text-yellow-700">• {w}</p>)}
            </div>
          )}
          {conflictsFound.length === 0 && warnings.length === 0 && form.course_id && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 text-xs text-green-700 flex items-center gap-2">
              <CheckCircle className="w-3.5 h-3.5"/>No hard conflicts detected
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting ? 'Adding…' : conflictsFound.length > 0 ? 'Add Anyway' : 'Add Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Substitution Modal ──────────────────────────────────────────────────────
function SubstitutionModal({ slot, faculty, rooms, onClose }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'cancellation', substitute_faculty_id: '', new_room: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/classroom-schedule/substitutions', { timetable_id: slot.id, ...form });
      toast.success('Substitution recorded');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-lg">Mark Substitution</h2>
            <p className="text-sm text-gray-500 mt-0.5">{slot.course_code} · {slot.day} {slot.start_time}–{slot.end_time} · Room {slot.room||'—'}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input required type="date" value={form.date} onChange={e => set('date', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select required value={form.type} onChange={e => set('type', e.target.value)} className="select-field">
                <option value="cancellation">Cancellation</option>
                <option value="substitution">Substitution</option>
                <option value="rescheduled">Rescheduled</option>
              </select>
            </div>
          </div>
          {form.type !== 'cancellation' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Substitute Faculty</label>
                <select value={form.substitute_faculty_id} onChange={e => set('substitute_faculty_id', e.target.value)} className="select-field">
                  <option value="">Same faculty</option>
                  {faculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.department})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Room</label>
                <select value={form.new_room} onChange={e => set('new_room', e.target.value)} className="select-field">
                  <option value="">Same room ({slot.room||'unassigned'})</option>
                  {rooms.map(r => <option key={r.id} value={r.room_number}>Room {r.room_number} – {r.building_name}</option>)}
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea value={form.reason} onChange={e => set('reason', e.target.value)} rows={2} className="input-field resize-none" placeholder="Optional reason…" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Conflict List Modal ─────────────────────────────────────────────────────
function ConflictModal({ conflicts, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500"/>Schedule Conflicts</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400"/></button>
        </div>
        <div className="overflow-y-auto p-6 space-y-3">
          {conflicts.map((c, i) => (
            <div key={i} className={`rounded-xl p-4 border ${c.severity==='critical'?'bg-red-50 border-red-200':'bg-yellow-50 border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.severity==='critical'?'text-red-500':'text-yellow-600'}`}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${c.severity==='critical'?'text-red-700':'text-yellow-700'}`}>
                    {c.type === 'room' ? 'Room Double-Booking' : c.type === 'faculty' ? 'Faculty Clash' : 'Student Group Overlap'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">{c.day} · {c.time} · {c.detail}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-white border rounded px-2 py-0.5 text-xs font-mono">{c.slot_a.code}</span>
                    <ArrowRight className="w-3 h-3 text-gray-400"/>
                    <span className="bg-white border rounded px-2 py-0.5 text-xs font-mono">{c.slot_b.code}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {conflicts.length === 0 && <p className="text-center text-gray-400 py-8">No conflicts found.</p>}
        </div>
        <div className="p-4 border-t">
          <button onClick={onClose} className="btn-secondary w-full">Close</button>
        </div>
      </div>
    </div>
  );
}
