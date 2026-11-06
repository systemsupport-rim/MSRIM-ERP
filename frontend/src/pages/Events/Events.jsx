import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { CalendarDays, Plus, X, Users, Clock, MapPin, Tag } from 'lucide-react';

const EVENT_TYPES = ['general', 'academic', 'cultural', 'sports', 'seminar', 'workshop', 'fest'];
const STATUS_COLORS = { upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' };

export default function Events() {
  const { user } = useAuth();
  const [tab, setTab] = useState('upcoming');
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const canManage = ['admin', 'registrar', 'hod', 'faculty'].includes(user.role);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    try {
      const [ev, st] = await Promise.all([api.get('/events'), api.get('/events/stats')]);
      setEvents(ev.data);
      setStats(st.data);
    } catch { /* empty state */ }
  }

  async function handleRegister(id) {
    try {
      await api.post(`/events/${id}/register`);
      toast.success('Registered for event!');
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this event?')) return;
    try {
      await api.delete(`/events/${id}`);
      toast.success('Event deleted.');
      loadAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  const filtered = events.filter(e => {
    if (tab === 'upcoming') return e.status === 'upcoming';
    if (tab === 'ongoing')  return e.status === 'ongoing';
    if (tab === 'past')     return ['completed', 'cancelled'].includes(e.status);
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Events & Activities</h1>
          <p className="text-gray-500 text-sm mt-1">Campus events, fests, workshops & seminars</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add Event
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Total Events</p><p className="text-3xl font-bold text-msrim-blue">{stats.total}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Upcoming</p><p className="text-3xl font-bold text-blue-600">{stats.upcoming}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Ongoing</p><p className="text-3xl font-bold text-green-600">{stats.ongoing}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Registrations</p><p className="text-3xl font-bold text-msrim-orange">{stats.totalRegistrations}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['upcoming','Upcoming'], ['ongoing','Ongoing'], ['past','Past'], ['all','All']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab===k ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No events found.</p>
          {canManage && <button className="btn-primary mt-4" onClick={() => setShowAdd(true)}>Create First Event</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ev => (
            <div key={ev.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate">{ev.title}</h3>
                  {ev.description && <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{ev.description}</p>}
                </div>
                <span className={STATUS_COLORS[ev.status] || 'badge-gray'}>{ev.status}</span>
              </div>
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> {ev.start_date}{ev.end_date && ev.end_date !== ev.start_date ? ` → ${ev.end_date}` : ''}</div>
                {ev.start_time && <div className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}</div>}
                {ev.venue && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {ev.venue}</div>}
                {ev.organizer && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {ev.organizer}</div>}
                <div className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {ev.event_type}</div>
              </div>
              {ev.registration_count > 0 && (
                <p className="text-xs text-blue-600 font-medium">{ev.registration_count} registered</p>
              )}
              <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
                {ev.status === 'upcoming' && (
                  <button onClick={() => handleRegister(ev.id)} className="btn-primary py-1 px-3 text-xs flex-1">Register</button>
                )}
                {canManage && (
                  <button onClick={() => handleDelete(ev.id)} className="btn-danger py-1 px-3 text-xs">Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && <AddEventModal onClose={() => { setShowAdd(false); loadAll(); }} />}
    </div>
  );
}

function AddEventModal({ onClose }) {
  const [form, setForm] = useState({ title: '', description: '', event_type: 'general', start_date: '', end_date: '', start_time: '', end_time: '', venue: '', organizer: '', max_participants: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/events', form);
      toast.success('Event created!');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Event</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} className="input-field" placeholder="Event title" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input-field" rows={2} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.event_type} onChange={e => set('event_type', e.target.value)} className="select-field">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Organizer</label>
            <input value={form.organizer} onChange={e => set('organizer', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date *</label>
            <input required type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Time</label>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Venue</label>
            <input value={form.venue} onChange={e => set('venue', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Participants</label>
            <input type="number" value={form.max_participants} onChange={e => set('max_participants', e.target.value)} className="input-field" />
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating…' : 'Create Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
