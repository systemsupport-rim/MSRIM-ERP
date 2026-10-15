import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Clock, Plus, Trash2, X } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = ['bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-purple-100 text-purple-800', 'bg-orange-100 text-orange-800', 'bg-pink-100 text-pink-800', 'bg-indigo-100 text-indigo-800', 'bg-teal-100 text-teal-800', 'bg-yellow-100 text-yellow-800'];

function colorFor(courseId) { return COLORS[courseId % COLORS.length]; }

export default function Timetable() {
  const { user } = useAuth();
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const canManage = ['admin', 'hod', 'registrar'].includes(user.role);

  useEffect(() => { fetchTimetable(); }, []);

  async function fetchTimetable() {
    setLoading(true);
    try {
      const res = await api.get('/timetable/weekly');
      setWeekly(res.data);
    } catch { toast.error('Failed to load timetable'); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    try { await api.delete(`/timetable/${id}`); toast.success('Slot removed'); fetchTimetable(); }
    catch { toast.error('Failed to delete'); }
  }

  const today = DAYS[new Date().getDay() - 1];
  const allSlots = Object.values(weekly).flat();
  const times = [...new Set(allSlots.map(s => s.start_time))].sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Timetable</h1>
          <p className="text-gray-500 text-sm mt-1">Weekly class schedule</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Slot
          </button>
        )}
      </div>

      {loading ? (
        <div className="card text-center py-16"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : allSlots.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No timetable slots configured yet.</p>
          {canManage && <p className="text-sm mt-1">Click "Add Slot" to build the timetable.</p>}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b bg-msrim-blue/5">
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Time</th>
                  {DAYS.map(d => (
                    <th key={d} className={`p-3 text-center text-xs font-semibold uppercase tracking-wider ${d === today ? 'text-msrim-blue bg-msrim-blue/10' : 'text-gray-500'}`}>
                      <div>{d}</div>
                      {d === today && <div className="text-xs font-medium text-msrim-orange">Today</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {times.map(time => (
                  <tr key={time} className="hover:bg-gray-50/50">
                    <td className="p-3 border-r border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span className="font-medium">{time}</span>
                      </div>
                    </td>
                    {DAYS.map(day => {
                      const slot = (weekly[day] || []).find(s => s.start_time === time);
                      return (
                        <td key={day} className={`p-2 text-center ${day === today ? 'bg-msrim-blue/5' : ''}`}>
                          {slot ? (
                            <div className={`rounded-lg p-2 text-xs font-medium relative group ${colorFor(slot.course_id)}`}>
                              <p className="font-bold truncate">{slot.course_code}</p>
                              <p className="truncate opacity-80">{slot.course_name?.split(' ').slice(0, 3).join(' ')}</p>
                              {slot.faculty_name && <p className="opacity-60 truncate text-[10px]">{slot.faculty_name}</p>}
                              {slot.room && <p className="opacity-50 truncate text-[10px]">{slot.room}</p>}
                              <p className="opacity-50 text-[10px]">{slot.start_time}–{slot.end_time}</p>
                              {canManage && (
                                <button onClick={() => handleDelete(slot.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-white/70 rounded hover:bg-red-100 hover:text-red-600 transition-all">
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="h-12 flex items-center justify-center text-gray-200 text-lg">—</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <AddSlotModal onClose={() => { setShowAdd(false); fetchTimetable(); }} />}
    </div>
  );
}

function AddSlotModal({ onClose }) {
  const [form, setForm] = useState({ course_id: '', day: 'Monday', start_time: '09:00', end_time: '10:00', room: '' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/timetable', form);
      toast.success('Slot added!'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Timetable Slot</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Course *</label>
            <select required value={form.course_id} onChange={e => set('course_id', e.target.value)} className="select-field">
              <option value="">Select Course</option>
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
              <input value={form.room} onChange={e => set('room', e.target.value)} className="input-field" placeholder="e.g. 101" />
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
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Slot'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
