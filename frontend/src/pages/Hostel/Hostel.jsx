import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { BedDouble, Plus, X } from 'lucide-react';

export default function Hostel() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState('rooms');
  const [showAllocate, setShowAllocate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/hostel/rooms'), api.get('/hostel/allocations'), api.get('/hostel/stats')])
      .then(([r, a, s]) => { setRooms(r.data); setAllocations(a.data); setStats(s.data); }).finally(() => setLoading(false));
  }, []);

  async function handleVacate(id) {
    try { await api.put(`/hostel/allocations/${id}/vacate`); toast.success('Room vacated'); const res = await api.get('/hostel/allocations'); setAllocations(res.data); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canManage = ['admin','registrar'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hostel Management</h1>
          <p className="text-gray-500 text-sm mt-1">Room Allotments & Hosteller Management</p>
        </div>
        {canManage && <button className="btn-primary" onClick={() => setShowAllocate(true)}><Plus className="w-4 h-4" /> Allocate Room</button>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Total Rooms</p><p className="text-3xl font-bold text-msrim-blue">{stats.totalRooms}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Total Capacity</p><p className="text-3xl font-bold text-green-600">{stats.totalCapacity}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Current Hostellers</p><p className="text-3xl font-bold text-msrim-orange">{stats.currentHostellers}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Available Beds</p><p className="text-3xl font-bold text-purple-600">{stats.available}</p></div>
        </div>
      )}

      {/* Block-wise stats */}
      {stats?.byBlock?.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.byBlock.map(b => (
            <div key={b.block} className="card">
              <p className="text-gray-500 text-sm">Block {b.block}</p>
              <p className="text-2xl font-bold text-msrim-blue">{b.occupied}/{b.capacity}</p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-msrim-blue h-2 rounded-full" style={{ width: `${b.capacity > 0 ? (b.occupied/b.capacity)*100 : 0}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['rooms','allocations'].map(t => <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab===t?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{t}</button>)}
      </div>

      {tab === 'rooms' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(r => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold">Room {r.room_number}</h3>
                  <p className="text-gray-500 text-sm">Block {r.block} · Floor {r.floor}</p>
                </div>
                <span className={`badge-${r.current_occupancy >= r.capacity ? 'red' : r.current_occupancy > 0 ? 'yellow' : 'green'}`}>
                  {r.current_occupancy >= r.capacity ? 'Full' : r.current_occupancy > 0 ? 'Partial' : 'Available'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 capitalize">{r.type} room</span>
                <span className="font-medium">{r.current_occupancy}/{r.capacity} occupied</span>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${r.current_occupancy >= r.capacity ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${(r.current_occupancy/r.capacity)*100}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">Rent: ₹{r.monthly_rent?.toLocaleString()}/month</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'allocations' && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Student</th><th className="table-th">Room</th>
                <th className="table-th">Block</th><th className="table-th">Allotment Date</th>
                <th className="table-th">Status</th>{canManage && <th className="table-th">Action</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {allocations.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-td"><p className="font-medium">{a.student_name}</p><p className="text-xs text-gray-400">{a.enrollment_number}</p></td>
                    <td className="table-td">Room {a.room_number}</td>
                    <td className="table-td">Block {a.block}</td>
                    <td className="table-td">{new Date(a.allotment_date).toLocaleDateString()}</td>
                    <td className="table-td"><span className={a.status==='active'?'badge-green':a.status==='vacated'?'badge-gray':'badge-yellow'}>{a.status}</span></td>
                    {canManage && <td className="table-td">{a.status==='active' && <button onClick={() => handleVacate(a.id)} className="btn-secondary py-1 px-2 text-xs">Vacate</button>}</td>}
                  </tr>
                ))}
                {!allocations.length && <tr><td colSpan={6} className="table-td text-center py-8 text-gray-400">No allocations</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAllocate && <AllocateRoomModal rooms={rooms.filter(r => r.current_occupancy < r.capacity)} onClose={() => { setShowAllocate(false); Promise.all([api.get('/hostel/rooms'),api.get('/hostel/allocations'),api.get('/hostel/stats')]).then(([r,a,s]) => { setRooms(r.data); setAllocations(a.data); setStats(s.data); }); }} />}
    </div>
  );
}

function AllocateRoomModal({ rooms, onClose }) {
  const [form, setForm] = useState({ student_id:'', room_id:'', fee_per_month:'5000', remarks:'' });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  useEffect(() => { api.get('/students', {params:{status:'active'}}).then(r => setStudents(r.data)); }, []);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/hostel/allocations', form); toast.success('Room allocated!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Allocate Room</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Student *</label><select required value={form.student_id} onChange={e=>set('student_id',e.target.value)} className="select-field"><option value="">Select Student</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.enrollment_number})</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Room *</label><select required value={form.room_id} onChange={e=>set('room_id',e.target.value)} className="select-field"><option value="">Select Room</option>{rooms.map(r=><option key={r.id} value={r.id}>Room {r.room_number} - Block {r.block} ({r.current_occupancy}/{r.capacity})</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Monthly Fee (₹)</label><input type="number" value={form.fee_per_month} onChange={e=>set('fee_per_month',e.target.value)} className="input-field" /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Allocating...':'Allocate'}</button></div>
        </form>
      </div>
    </div>
  );
}
