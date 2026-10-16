import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';

const TYPE_COLORS = { hall:'badge-blue', 'seminar-room':'badge-green', lab:'badge-yellow', auditorium:'bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium', 'conference-room':'bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full font-medium', sports:'bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium', other:'badge-gray' };
const BOOKING_STATUS = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red', cancelled:'badge-gray' };

export default function VenueAdministration() {
  const { user } = useAuth();
  const [venues, setVenues] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState('venues');
  const [showForm, setShowForm] = useState(false);
  const [showBooking, setShowBooking] = useState(null);
  const [form, setForm] = useState({ name:'', type:'hall', capacity:50, location:'' });
  const [bookingForm, setBookingForm] = useState({ venue_id:'', title:'', date:'', start_time:'09:00', end_time:'11:00', purpose:'' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/venues'), api.get('/venues/bookings')]).then(([v, b]) => {
      setVenues(v.data); setBookings(b.data);
    }).finally(() => setLoading(false));
  }, []);

  async function addVenue() {
    if (!form.name) return toast.error('Venue name required.');
    try {
      await api.post('/venues', form);
      toast.success('Venue added.');
      setShowForm(false);
      setForm({ name:'', type:'hall', capacity:50, location:'' });
      const r = await api.get('/venues');
      setVenues(r.data);
    } catch { toast.error('Failed.'); }
  }

  async function requestBooking() {
    if (!bookingForm.venue_id || !bookingForm.title || !bookingForm.date) return toast.error('Fill required fields.');
    try {
      await api.post('/venues/bookings', bookingForm);
      toast.success('Booking request submitted.');
      setShowBooking(null);
      const r = await api.get('/venues/bookings');
      setBookings(r.data);
    } catch { toast.error('Failed.'); }
  }

  async function approveBooking(id) {
    await api.put(`/venues/bookings/${id}/approve`);
    toast.success('Booking approved.');
    const r = await api.get('/venues/bookings');
    setBookings(r.data);
  }

  async function rejectBooking(id) {
    await api.put(`/venues/bookings/${id}/reject`);
    toast.success('Booking rejected.');
    const r = await api.get('/venues/bookings');
    setBookings(r.data);
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Venue Administration</h1>
          <p className="text-gray-500 text-sm mt-1">Manage campus venues and booking requests</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBooking(true)} className="btn-secondary">Request Booking</button>
          {canManage && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Venue</button>}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {[['venues','Venues'],['bookings','Bookings']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{label}</button>
        ))}
      </div>

      {tab === 'venues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {venues.map(v => (
            <div key={v.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold">{v.name}</h3>
                    <span className={TYPE_COLORS[v.type]||'badge-gray'}>{v.type.replace('-',' ')}</span>
                  </div>
                  {v.location && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-msrim-blue">{v.capacity}</p>
                  <p className="text-xs text-gray-400">seats</p>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-gray-400">{v.total_bookings || 0} total bookings</span>
                <span className={v.is_active?'badge-green':'badge-gray'}>{v.is_active?'Active':'Inactive'}</span>
              </div>
            </div>
          ))}
          {!venues.length && <div className="col-span-3 card p-8 text-center text-gray-400">No venues added yet.</div>}
        </div>
      )}

      {tab === 'bookings' && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Title</th><th className="table-th">Venue</th>
              <th className="table-th">Date</th><th className="table-th">Time</th>
              <th className="table-th">Booked By</th><th className="table-th">Status</th>
              {canManage && <th className="table-th">Actions</th>}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{b.title}</td>
                  <td className="table-td">{b.venue_name}</td>
                  <td className="table-td">{b.date ? new Date(b.date).toLocaleDateString() : '—'}</td>
                  <td className="table-td text-sm">{b.start_time} – {b.end_time}</td>
                  <td className="table-td">{b.booked_by_name}</td>
                  <td className="table-td"><span className={BOOKING_STATUS[b.status]||'badge-gray'}>{b.status}</span></td>
                  {canManage && <td className="table-td">
                    {b.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => approveBooking(b.id)} className="text-xs p-1 text-green-600 hover:bg-green-50 rounded-lg"><CheckCircle className="w-4 h-4" /></button>
                        <button onClick={() => rejectBooking(b.id)} className="text-xs p-1 text-red-500 hover:bg-red-50 rounded-lg"><XCircle className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>}
                </tr>
              ))}
              {!bookings.length && <tr><td colSpan={canManage?7:6} className="table-td text-center py-8 text-gray-400">No bookings found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Add Venue</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Venue Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="select-field">
                    {['hall','seminar-room','lab','auditorium','conference-room','sports','other'].map(t=><option key={t} value={t}>{t.replace('-',' ')}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:parseInt(e.target.value)||50}))} className="input-field" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Location</label><input value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} className="input-field" placeholder="e.g. Block A, 2nd Floor" /></div>
            </div>
            <div className="flex gap-2">
              <button onClick={addVenue} className="btn-primary flex-1">Add</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showBooking && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">Request Booking</h3>
              <button onClick={() => setShowBooking(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Venue *</label>
                <select value={bookingForm.venue_id} onChange={e=>setBookingForm(f=>({...f,venue_id:e.target.value}))} className="select-field">
                  <option value="">Select venue…</option>
                  {venues.filter(v=>v.is_active).map(v=><option key={v.id} value={v.id}>{v.name} ({v.capacity} seats)</option>)}
                </select>
              </div>
              <div><label className="block text-sm font-medium mb-1">Purpose / Title *</label><input value={bookingForm.title} onChange={e=>setBookingForm(f=>({...f,title:e.target.value}))} className="input-field" /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3"><label className="block text-sm font-medium mb-1">Date *</label><input type="date" value={bookingForm.date} onChange={e=>setBookingForm(f=>({...f,date:e.target.value}))} className="input-field" /></div>
                <div className="col-span-1"><label className="block text-sm font-medium mb-1">From</label><input type="time" value={bookingForm.start_time} onChange={e=>setBookingForm(f=>({...f,start_time:e.target.value}))} className="input-field" /></div>
                <div className="col-span-1"><label className="block text-sm font-medium mb-1">To</label><input type="time" value={bookingForm.end_time} onChange={e=>setBookingForm(f=>({...f,end_time:e.target.value}))} className="input-field" /></div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={requestBooking} className="btn-primary flex-1">Submit Request</button>
              <button onClick={() => setShowBooking(null)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
