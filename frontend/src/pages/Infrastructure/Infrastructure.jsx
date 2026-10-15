import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Building, Plus, Calendar, CheckCircle, X, MapPin } from 'lucide-react';

export default function Infrastructure() {
  const { user } = useAuth();
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('buildings');
  const [showBookRoom, setShowBookRoom] = useState(false);
  const [showAddRoom, setShowAddRoom] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/infrastructure/buildings'),
      api.get('/infrastructure/rooms'),
      api.get('/infrastructure/bookings'),
      api.get('/infrastructure/stats')
    ]).then(([b,r,bk,s]) => { setBuildings(b.data); setRooms(r.data); setBookings(bk.data); setStats(s.data); });
  }, []);

  async function handleCancel(id) {
    await api.put(`/infrastructure/bookings/${id}/cancel`);
    toast.success('Booking cancelled'); const res = await api.get('/infrastructure/bookings'); setBookings(res.data);
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);
  const typeColors = { classroom:'badge-blue', lab:'badge-green', seminar:'badge-yellow', auditorium:'badge-orange', library:'badge-purple', office:'badge-gray', other:'badge-gray' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Infrastructure Management</h1>
          <p className="text-gray-500 text-sm mt-1">Buildings, Rooms & Venue Bookings</p>
        </div>
        <div className="flex gap-2">
          {canManage && <button className="btn-secondary" onClick={() => setShowAddRoom(true)}><Plus className="w-4 h-4" /> Add Room</button>}
          <button className="btn-primary" onClick={() => setShowBookRoom(true)}><Calendar className="w-4 h-4" /> Book Venue</button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Buildings</p><p className="text-3xl font-bold text-msrim-blue">{stats.buildings}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Total Rooms</p><p className="text-3xl font-bold text-green-600">{stats.rooms}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Bookings</p><p className="text-3xl font-bold text-msrim-orange">{stats.totalBookings}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Today's Bookings</p><p className="text-3xl font-bold text-purple-600">{stats.todayBookings}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['buildings','rooms','bookings'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab===t?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'buildings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {buildings.map(b => (
            <div key={b.id} className="card">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-msrim-blue/10 rounded-xl"><Building className="w-6 h-6 text-msrim-blue" /></div>
                <div className="flex-1">
                  <h3 className="font-bold">{b.name}</h3>
                  <p className="text-gray-500 text-sm">{b.code} · {b.floors} floors</p>
                  <p className="text-gray-400 text-xs mt-1">{b.room_count} rooms</p>
                  {b.description && <p className="text-gray-500 text-xs mt-1">{b.description}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'rooms' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Room</th><th className="table-th">Building</th><th className="table-th">Type</th>
                <th className="table-th">Capacity</th><th className="table-th">Amenities</th><th className="table-th">Status</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{r.room_number} <span className="text-gray-400 text-xs">Floor {r.floor}</span></td>
                    <td className="table-td">{r.building_name}</td>
                    <td className="table-td"><span className={typeColors[r.room_type]||'badge-gray'}>{r.room_type}</span></td>
                    <td className="table-td">{r.capacity}</td>
                    <td className="table-td">
                      <div className="flex gap-1 flex-wrap">
                        {r.has_projector ? <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">Projector</span> : null}
                        {r.has_ac ? <span className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded">AC</span> : null}
                        {r.has_wifi ? <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">WiFi</span> : null}
                      </div>
                    </td>
                    <td className="table-td"><span className={r.booked_today ? 'badge-red' : 'badge-green'}>{r.booked_today ? 'Booked Today' : 'Available'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Purpose</th><th className="table-th">Room</th>
                <th className="table-th">Date</th><th className="table-th">Time</th>
                <th className="table-th">Booked By</th><th className="table-th">Status</th><th className="table-th">Action</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{b.purpose}</td>
                    <td className="table-td">{b.room_number}<br/><span className="text-xs text-gray-400">{b.building_name}</span></td>
                    <td className="table-td">{new Date(b.booking_date).toLocaleDateString()}</td>
                    <td className="table-td text-sm">{b.start_time} – {b.end_time}</td>
                    <td className="table-td">{b.booked_by_name}</td>
                    <td className="table-td"><span className={b.status==='confirmed'?'badge-green':b.status==='cancelled'?'badge-red':'badge-yellow'}>{b.status}</span></td>
                    <td className="table-td">{b.status==='confirmed' && <button onClick={() => handleCancel(b.id)} className="btn-danger py-1 px-2 text-xs">Cancel</button>}</td>
                  </tr>
                ))}
                {!bookings.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No bookings</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showBookRoom && <BookVenueModal rooms={rooms} onClose={() => { setShowBookRoom(false); api.get('/infrastructure/bookings').then(r => setBookings(r.data)); }} />}
    </div>
  );
}

function BookVenueModal({ rooms, onClose }) {
  const [form, setForm] = useState({ room_id:'', purpose:'', booking_date:'', start_time:'09:00', end_time:'10:00', attendees_count:'', remarks:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/infrastructure/bookings', form); toast.success('Venue booked!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Book a Venue</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Purpose *</label><input required value={form.purpose} onChange={e=>set('purpose',e.target.value)} className="input-field" placeholder="Meeting, Class, Event..." /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Room *</label>
            <select required value={form.room_id} onChange={e=>set('room_id',e.target.value)} className="select-field">
              <option value="">Select Room</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.building_name} - {r.room_number} ({r.room_type}, Cap: {r.capacity})</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Date *</label><input required type="date" value={form.booking_date} onChange={e=>set('booking_date',e.target.value)} className="input-field" min={new Date().toISOString().split('T')[0]} /></div>
          <div><label className="block text-sm font-medium mb-1">Attendees</label><input type="number" value={form.attendees_count} onChange={e=>set('attendees_count',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Start Time</label><input type="time" value={form.start_time} onChange={e=>set('start_time',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">End Time</label><input type="time" value={form.end_time} onChange={e=>set('end_time',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Booking...':'Book Venue'}</button></div>
        </form>
      </div>
    </div>
  );
}
