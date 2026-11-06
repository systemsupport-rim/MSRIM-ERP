import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Bus, Plus, X, MapPin, Clock, Users } from 'lucide-react';

export default function Transport() {
  const { user } = useAuth();
  const [tab, setTab] = useState('routes');
  const [routes, setRoutes] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [passes, setPasses] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const canManage = ['admin', 'registrar'].includes(user.role);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [r, v, p, s] = await Promise.all([
        api.get('/transport/routes'),
        api.get('/transport/vehicles'),
        api.get('/transport/passes'),
        api.get('/transport/stats'),
      ]);
      setRoutes(r.data); setVehicles(v.data); setPasses(p.data); setStats(s.data);
    } catch { /* empty state */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transport Management</h1>
          <p className="text-gray-500 text-sm mt-1">Bus routes, vehicles & student transport passes</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add {tab === 'routes' ? 'Route' : tab === 'vehicles' ? 'Vehicle' : 'Pass'}
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Active Routes</p><p className="text-3xl font-bold text-msrim-blue">{stats.activeRoutes}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Active Vehicles</p><p className="text-3xl font-bold text-green-600">{stats.activeVehicles}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Active Passes</p><p className="text-3xl font-bold text-msrim-orange">{stats.activePasses}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['routes','Bus Routes'], ['vehicles','Vehicles'], ['passes','Student Passes']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab===k ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'routes' && (
        routes.length === 0 ? (
          <EmptyState icon={Bus} label="No routes configured." onAdd={canManage ? () => setShowAdd(true) : null} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {routes.map(r => (
              <div key={r.id} className="card flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-msrim-blue/10 rounded-xl"><Bus className="w-5 h-5 text-msrim-blue" /></div>
                  <div>
                    <p className="font-bold">{r.route_name}</p>
                    {r.route_number && <p className="text-xs text-gray-400">Route #{r.route_number}</p>}
                  </div>
                  <span className={`ml-auto ${r.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{r.status}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  {(r.start_point || r.end_point) && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      {r.start_point} → {r.end_point}
                    </div>
                  )}
                  {r.departure_time && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Departs {r.departure_time}{r.arrival_time ? ` · Arrives ${r.arrival_time}` : ''}
                    </div>
                  )}
                  {r.driver_name && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {r.driver_name}{r.driver_contact ? ` · ${r.driver_contact}` : ''}</div>}
                  {r.vehicle_number && <p>Bus: {r.vehicle_number}</p>}
                  <p className="text-blue-600 font-medium">{r.passenger_count} passengers</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'vehicles' && (
        vehicles.length === 0 ? (
          <EmptyState icon={Bus} label="No vehicles registered." onAdd={canManage ? () => setShowAdd(true) : null} />
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Vehicle No.</th><th className="table-th">Type</th><th className="table-th">Model</th>
                  <th className="table-th">Capacity</th><th className="table-th">Insurance Expiry</th><th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vehicles.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{v.vehicle_number}</td>
                    <td className="table-td capitalize">{v.vehicle_type}</td>
                    <td className="table-td">{v.model || '—'}</td>
                    <td className="table-td">{v.capacity || '—'}</td>
                    <td className="table-td">{v.insurance_expiry || '—'}</td>
                    <td className="table-td"><span className={v.status === 'active' ? 'badge-green' : 'badge-red'}>{v.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {tab === 'passes' && (
        passes.length === 0 ? (
          <EmptyState icon={Bus} label="No passes issued." onAdd={canManage ? () => setShowAdd(true) : null} />
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Pass No.</th><th className="table-th">Student</th><th className="table-th">Route</th>
                  <th className="table-th">Valid From</th><th className="table-th">Valid To</th><th className="table-th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {passes.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium text-xs">{p.pass_number}</td>
                    <td className="table-td">{p.student_name}<br/><span className="text-xs text-gray-400">{p.roll_number}</span></td>
                    <td className="table-td">{p.route_name || '—'}</td>
                    <td className="table-td">{p.valid_from || '—'}</td>
                    <td className="table-td">{p.valid_to || '—'}</td>
                    <td className="table-td"><span className={p.status === 'active' ? 'badge-green' : 'badge-gray'}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {showAdd && (
        tab === 'routes' ? <AddRouteModal vehicles={vehicles} onClose={() => { setShowAdd(false); loadAll(); }} /> :
        tab === 'vehicles' ? <AddVehicleModal onClose={() => { setShowAdd(false); loadAll(); }} /> :
        <AddPassModal routes={routes} onClose={() => { setShowAdd(false); loadAll(); }} />
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, label, onAdd }) {
  return (
    <div className="card text-center py-16 text-gray-400">
      <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>{label}</p>
      {onAdd && <button className="btn-primary mt-4" onClick={onAdd}>Add Now</button>}
    </div>
  );
}

function AddRouteModal({ vehicles, onClose }) {
  const [form, setForm] = useState({ route_name: '', route_number: '', start_point: '', end_point: '', departure_time: '', arrival_time: '', vehicle_id: '', driver_name: '', driver_contact: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/transport/routes', form); toast.success('Route added.'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Bus Route</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Route Name *</label><input required value={form.route_name} onChange={e=>set('route_name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Route Number</label><input value={form.route_number} onChange={e=>set('route_number',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Vehicle</label>
            <select value={form.vehicle_id} onChange={e=>set('vehicle_id',e.target.value)} className="select-field">
              <option value="">Select Vehicle</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} ({v.vehicle_type})</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Start Point</label><input value={form.start_point} onChange={e=>set('start_point',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">End Point</label><input value={form.end_point} onChange={e=>set('end_point',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Departure Time</label><input type="time" value={form.departure_time} onChange={e=>set('departure_time',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Arrival Time</label><input type="time" value={form.arrival_time} onChange={e=>set('arrival_time',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Driver Name</label><input value={form.driver_name} onChange={e=>set('driver_name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Driver Contact</label><input value={form.driver_contact} onChange={e=>set('driver_contact',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Adding…':'Add Route'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddVehicleModal({ onClose }) {
  const [form, setForm] = useState({ vehicle_number: '', vehicle_type: 'bus', capacity: '', model: '', insurance_expiry: '', fitness_expiry: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/transport/vehicles', form); toast.success('Vehicle added.'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Vehicle</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Vehicle Number *</label><input required value={form.vehicle_number} onChange={e=>set('vehicle_number',e.target.value)} className="input-field" placeholder="KA-01-AB-1234" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.vehicle_type} onChange={e=>set('vehicle_type',e.target.value)} className="select-field">
              {['bus','minibus','van','car'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e=>set('capacity',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Model</label><input value={form.model} onChange={e=>set('model',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Insurance Expiry</label><input type="date" value={form.insurance_expiry} onChange={e=>set('insurance_expiry',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Fitness Expiry</label><input type="date" value={form.fitness_expiry} onChange={e=>set('fitness_expiry',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Adding…':'Add Vehicle'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddPassModal({ routes, onClose }) {
  const [form, setForm] = useState({ student_id: '', route_id: '', valid_from: '', valid_to: '' });
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  useEffect(() => { api.get('/students').then(r => setStudents(r.data)).catch(() => {}); }, []);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/transport/passes', form); toast.success('Pass issued.'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Issue Transport Pass</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Student *</label>
            <select required value={form.student_id} onChange={e=>set('student_id',e.target.value)} className="select-field">
              <option value="">Select Student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.roll_number})</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Route *</label>
            <select required value={form.route_id} onChange={e=>set('route_id',e.target.value)} className="select-field">
              <option value="">Select Route</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.route_name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Valid From</label><input type="date" value={form.valid_from} onChange={e=>set('valid_from',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Valid To</label><input type="date" value={form.valid_to} onChange={e=>set('valid_to',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Issuing…':'Issue Pass'}</button></div>
        </form>
      </div>
    </div>
  );
}
