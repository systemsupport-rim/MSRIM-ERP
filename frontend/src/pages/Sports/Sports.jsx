import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Trophy, Plus, X, Users, MapPin, Calendar } from 'lucide-react';

const SPORTS = ['Cricket', 'Football', 'Basketball', 'Volleyball', 'Badminton', 'Table Tennis', 'Chess', 'Athletics', 'Swimming', 'Tennis', 'Other'];
const TOURNAMENT_STATUS_COLORS = { upcoming: 'badge-blue', ongoing: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red' };

export default function Sports() {
  const { user } = useAuth();
  const [tab, setTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const canManage = ['admin', 'registrar', 'hod', 'faculty'].includes(user.role);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [t, to, f, s] = await Promise.all([
        api.get('/sports/teams'),
        api.get('/sports/tournaments'),
        api.get('/sports/facilities'),
        api.get('/sports/stats'),
      ]);
      setTeams(t.data); setTournaments(to.data); setFacilities(f.data); setStats(s.data);
    } catch { /* empty state */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sports & Recreation</h1>
          <p className="text-gray-500 text-sm mt-1">Teams, tournaments & sports facilities</p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4" /> Add {tab === 'teams' ? 'Team' : tab === 'tournaments' ? 'Tournament' : 'Facility'}
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Active Teams</p><p className="text-3xl font-bold text-msrim-blue">{stats.activeTeams}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Active Tournaments</p><p className="text-3xl font-bold text-msrim-orange">{stats.activeTournaments}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Facilities Available</p><p className="text-3xl font-bold text-green-600">{stats.availableFacilities}</p></div>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['teams','Teams'], ['tournaments','Tournaments'], ['facilities','Facilities']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab===k ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>{l}</button>
        ))}
      </div>

      {tab === 'teams' && (
        teams.length === 0 ? <EmptyState label="No teams registered." onAdd={canManage ? () => setShowAdd(true) : null} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(t => (
              <div key={t.id} className="card flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-msrim-orange/10 rounded-xl"><Trophy className="w-5 h-5 text-msrim-orange" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.sport} · {t.category}</p>
                  </div>
                  <span className={t.status === 'active' ? 'badge-green' : 'badge-gray'}>{t.status}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {t.coach_name && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Coach: {t.coach_name}</div>}
                  {t.captain_name && <p>Captain: {t.captain_name}</p>}
                  <p>{t.members_count} members</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'tournaments' && (
        tournaments.length === 0 ? <EmptyState label="No tournaments scheduled." onAdd={canManage ? () => setShowAdd(true) : null} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tournaments.map(t => (
              <div key={t.id} className="card flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.sport} · {t.level}</p>
                  </div>
                  <span className={TOURNAMENT_STATUS_COLORS[t.status] || 'badge-gray'}>{t.status}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {t.start_date && <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {t.start_date}{t.end_date ? ` → ${t.end_date}` : ''}</div>}
                  {t.venue && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t.venue}</div>}
                  {t.result && <p className="font-medium text-green-700">Result: {t.result}</p>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'facilities' && (
        facilities.length === 0 ? <EmptyState label="No facilities added." onAdd={canManage ? () => setShowAdd(true) : null} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {facilities.map(f => (
              <div key={f.id} className="card flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-xl"><Trophy className="w-5 h-5 text-green-600" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{f.name}</p>
                    <p className="text-xs text-gray-400">{f.facility_type}</p>
                  </div>
                  <span className={f.status === 'available' ? 'badge-green' : 'badge-red'}>{f.status}</span>
                </div>
                <div className="text-xs text-gray-500 space-y-0.5">
                  {f.location && <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {f.location}</div>}
                  {f.capacity && <div className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Capacity: {f.capacity}</div>}
                  <p>{f.booking_allowed ? 'Booking allowed' : 'No booking'}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {showAdd && (
        tab === 'teams' ? <AddTeamModal onClose={() => { setShowAdd(false); loadAll(); }} /> :
        tab === 'tournaments' ? <AddTournamentModal onClose={() => { setShowAdd(false); loadAll(); }} /> :
        <AddFacilityModal onClose={() => { setShowAdd(false); loadAll(); }} />
      )}
    </div>
  );
}

function EmptyState({ label, onAdd }) {
  return (
    <div className="card text-center py-16 text-gray-400">
      <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
      <p>{label}</p>
      {onAdd && <button className="btn-primary mt-4" onClick={onAdd}>Add Now</button>}
    </div>
  );
}

function AddTeamModal({ onClose }) {
  const [form, setForm] = useState({ name: '', sport: 'Cricket', category: 'intercollegiate', coach_name: '', captain_name: '', members_count: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/sports/teams', form); toast.success('Team created!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Team</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Team Name *</label><input required value={form.name} onChange={e=>set('name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Sport *</label>
            <select value={form.sport} onChange={e=>set('sport',e.target.value)} className="select-field">
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Category</label>
            <select value={form.category} onChange={e=>set('category',e.target.value)} className="select-field">
              {['intercollegiate','intracollegiate','university','national'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Coach</label><input value={form.coach_name} onChange={e=>set('coach_name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Captain</label><input value={form.captain_name} onChange={e=>set('captain_name',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Members Count</label><input type="number" value={form.members_count} onChange={e=>set('members_count',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating…':'Create Team'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddTournamentModal({ onClose }) {
  const [form, setForm] = useState({ name: '', sport: 'Cricket', start_date: '', end_date: '', venue: '', level: 'intercollegiate' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/sports/tournaments', form); toast.success('Tournament created!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Tournament</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Tournament Name *</label><input required value={form.name} onChange={e=>set('name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Sport</label>
            <select value={form.sport} onChange={e=>set('sport',e.target.value)} className="select-field">
              {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Level</label>
            <select value={form.level} onChange={e=>set('level',e.target.value)} className="select-field">
              {['intercollegiate','intracollegiate','university','national','international'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Venue</label><input value={form.venue} onChange={e=>set('venue',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating…':'Create Tournament'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddFacilityModal({ onClose }) {
  const [form, setForm] = useState({ name: '', facility_type: '', capacity: '', location: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/sports/facilities', form); toast.success('Facility added!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Facility</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Facility Name *</label><input required value={form.name} onChange={e=>set('name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label>
            <select value={form.facility_type} onChange={e=>set('facility_type',e.target.value)} className="select-field">
              <option value="">Select Type</option>
              {['Ground','Court','Pool','Gym','Hall','Track','Other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Capacity</label><input type="number" value={form.capacity} onChange={e=>set('capacity',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Location</label><input value={form.location} onChange={e=>set('location',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Adding…':'Add Facility'}</button></div>
        </form>
      </div>
    </div>
  );
}
