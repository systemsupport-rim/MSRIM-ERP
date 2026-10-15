import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight, Calendar, Plus, X, BookOpen, FileText, MapPin, ClipboardList } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const typeConfig = {
  event: { color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50', icon: Calendar, label: 'Event' },
  exam: { color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50', icon: FileText, label: 'Exam' },
  venue: { color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50', icon: MapPin, label: 'Venue Booking' },
  assignment: { color: 'bg-orange-500', textColor: 'text-orange-700', bgColor: 'bg-orange-50', icon: ClipboardList, label: 'Assignment Due' },
};

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [viewMode, setViewMode] = useState('month');

  useEffect(() => {
    fetchEvents();
  }, [currentDate]);

  async function fetchEvents() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const from = `${year}-${String(month+1).padStart(2,'0')}-01`;
    const to = `${year}-${String(month+1).padStart(2,'0')}-31`;
    try {
      const res = await api.get('/calendar', { params: { from_date: from, to_date: to } });
      setEvents(res.data);
    } catch {}
  }

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const getEventsForDate = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return events.filter(e => e.start_date === dateStr);
  };

  function handleDayClick(day) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    setSelectedDate(dateStr);
    setSelectedEvents(getEventsForDate(day));
  }

  const canAdd = ['admin','registrar','hod','faculty'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Institutional Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">{MONTHS[month]} {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {['month','list'].map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize ${viewMode===m?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>
                {m}
              </button>
            ))}
          </div>
          {canAdd && <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Event</button>}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(typeConfig).map(([k,v]) => (
          <div key={k} className="flex items-center gap-1.5 text-sm">
            <div className={`w-2.5 h-2.5 rounded-full ${v.color}`} />
            <span className="text-gray-600">{v.label}</span>
          </div>
        ))}
      </div>

      {viewMode === 'month' && (
        <div className="card p-0 overflow-hidden">
          {/* Month header */}
          <div className="flex items-center justify-between p-4 border-b bg-msrim-blue text-white">
            <button onClick={() => setCurrentDate(new Date(year, month-1, 1))} className="p-1 hover:bg-white/20 rounded">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-lg">{MONTHS[month]} {year}</h2>
            <button onClick={() => setCurrentDate(new Date(year, month+1, 1))} className="p-1 hover:bg-white/20 rounded">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-24 border-r border-b bg-gray-50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
              const isSelected = selectedDate === `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              return (
                <div key={day} onClick={() => handleDayClick(day)}
                  className={`min-h-24 border-r border-b p-1.5 cursor-pointer hover:bg-blue-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-1 ${isToday ? 'bg-msrim-blue text-white' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0,3).map((e, idx) => {
                      const cfg = typeConfig[e.type] || typeConfig.event;
                      return (
                        <div key={idx} className={`text-xs px-1.5 py-0.5 rounded truncate ${cfg.bgColor} ${cfg.textColor} font-medium`}>
                          {e.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && <p className="text-xs text-gray-400">+{dayEvents.length-3} more</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="card text-center py-12 text-gray-400">No events this month</div>
          ) : events.map((e, i) => {
            const cfg = typeConfig[e.type] || typeConfig.event;
            const Icon = cfg.icon;
            return (
              <div key={i} className={`card flex items-start gap-4 border-l-4 border-${cfg.color.replace('bg-','')}`}>
                <div className={`p-2 rounded-lg ${cfg.bgColor} flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${cfg.textColor}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{e.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>{cfg.label}</span>
                  </div>
                  {e.description && <p className="text-gray-500 text-sm mt-1">{e.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>📅 {e.start_date}</span>
                    {e.location && <span>📍 {e.location}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day events panel */}
      {selectedDate && selectedEvents.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{new Date(selectedDate).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'})}</h3>
            <button onClick={() => setSelectedDate(null)} className="p-1 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
          {selectedEvents.map((e, i) => {
            const cfg = typeConfig[e.type] || typeConfig.event;
            return (
              <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${cfg.color}`} />
                <div>
                  <p className="font-medium text-sm">{e.title}</p>
                  {e.description && <p className="text-xs text-gray-500">{e.description}</p>}
                  {e.location && <p className="text-xs text-gray-400">📍 {e.location}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && canAdd && <AddEventModal onClose={() => { setShowAdd(false); fetchEvents(); }} />}
    </div>
  );
}

function AddEventModal({ onClose }) {
  const [form, setForm] = useState({ title:'',description:'',event_date:'',end_date:'',venue:'',category:'academic',organizer:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/calendar/events', form); toast.success('Event added!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Event</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Start Date *</label><input required type="date" value={form.event_date} onChange={e=>set('event_date',e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} className="input-field" /></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)} className="select-field">
              {['academic','exam','sports','cultural','placement','holiday','other'].map(c=><option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Venue</label><input value={form.venue} onChange={e=>set('venue',e.target.value)} className="input-field" placeholder="Auditorium, Seminar Hall..." /></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Adding...':'Add Event'}</button></div>
        </form>
      </div>
    </div>
  );
}
