import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { GraduationCap, Calendar, Users, Award, TrendingUp, Plus, X, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLORS = { upcoming: 'bg-blue-100 text-blue-700', ongoing: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-700', cancelled: 'bg-red-100 text-red-700' };

export default function FDP() {
  const { user } = useAuth();
  const [tab, setTab] = useState('programs');
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [external, setExternal] = useState([]);
  const [mySummary, setMySummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('program');
  const [form, setForm] = useState({});

  const isMgmt = ['admin','hod','registrar'].includes(user?.role);
  const canManage = isMgmt;

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const calls = [api.get('/fdp/programs'), api.get('/fdp/external'), api.get('/fdp/my-summary')];
      if (isMgmt) calls.push(api.get('/fdp/analytics'));
      const [p, ex, ms, an] = await Promise.all(calls);
      setPrograms(p.data); setExternal(ex.data); setMySummary(ms.data);
      if (an) setAnalytics(an.data);
    } catch { toast.error('Failed to load FDP data'); }
    setLoading(false);
  };

  const openModal = (type) => {
    setModalType(type);
    if (type === 'program') setForm({ type: 'organised', mode: 'offline', duration_days: 1 });
    else setForm({ mode: 'offline', duration_days: 1 });
    setShowModal(true);
  };

  const submit = async () => {
    try {
      if (modalType === 'program') await api.post('/fdp/programs', form);
      else await api.post('/fdp/external', form);
      toast.success('Saved!'); setShowModal(false); loadAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const register = async (id) => {
    try { await api.post(`/fdp/programs/${id}/register`, {}); toast.success('Registered!'); loadAll(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const tabs = [
    { id: 'programs', label: 'All Programs' },
    { id: 'external', label: 'External FDPs' },
    { id: 'my-summary', label: 'My FDP Summary' },
    ...(isMgmt ? [{ id: 'analytics', label: 'Analytics' }] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Development Programs</h1>
          <p className="text-gray-500 text-sm mt-1">Training · Workshops · Certifications · Professional Development</p>
        </div>
        <div className="flex gap-2">
          {canManage && <button onClick={() => openModal('program')} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Add Program</button>}
          <button onClick={() => openModal('external')} className="btn-secondary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Log External FDP</button>
        </div>
      </div>

      {/* Summary cards */}
      {mySummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total FDP Days', value: mySummary.totalDays, icon: Calendar, color: 'bg-blue-50 text-blue-600' },
            { label: 'Upcoming', value: mySummary.upcoming?.length || 0, icon: Clock, color: 'bg-amber-50 text-amber-600' },
            { label: 'Completed', value: mySummary.completed?.length || 0, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
            { label: 'External FDPs', value: mySummary.external?.length || 0, icon: Award, color: 'bg-violet-50 text-violet-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center flex-shrink-0`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-2xl font-bold text-gray-900">{s.value}</p><p className="text-xs text-gray-500">{s.label}</p></div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {loading ? <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
          : tab === 'programs' ? (
            <div className="space-y-3">
              {programs.map(p => (
                <div key={p.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{p.title}</p>
                        <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                        <span className="px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700">{p.mode}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{p.organizer} · {p.start_date}{p.end_date !== p.start_date ? ` – ${p.end_date}` : ''} · {p.duration_days} day(s)</p>
                      {p.venue && <p className="text-xs text-gray-500">{p.venue}</p>}
                    </div>
                    {p.status === 'upcoming' && (
                      <button onClick={() => register(p.id)} className="btn-primary text-xs whitespace-nowrap">Register</button>
                    )}
                  </div>
                </div>
              ))}
              {programs.length === 0 && <p className="text-center text-gray-400 py-8">No FDP programs found.</p>}
            </div>
          ) : tab === 'external' ? (
            <div className="space-y-3">
              {external.map(e => (
                <div key={e.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{e.title}</p>
                      <p className="text-sm text-gray-600">{e.organizer} · {e.start_date} · {e.duration_days} day(s)</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${e.status === 'approved' ? 'bg-green-100 text-green-700' : e.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{e.status}</span>
                  </div>
                </div>
              ))}
              {external.length === 0 && <p className="text-center text-gray-400 py-8">No external FDPs logged.</p>}
            </div>
          ) : tab === 'my-summary' && mySummary ? (
            <div className="space-y-6">
              {mySummary.upcoming?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Upcoming</h3>
                  <div className="space-y-2">{mySummary.upcoming.map((u,i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <div><p className="text-sm font-medium">{u.title}</p><p className="text-xs text-gray-500">{u.start_date} · {u.mode}</p></div>
                    </div>
                  ))}</div>
                </div>
              )}
              {mySummary.completed?.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Completed</h3>
                  <div className="space-y-2">{mySummary.completed.map((c,i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <div className="flex-1"><p className="text-sm font-medium">{c.title}</p><p className="text-xs text-gray-500">{c.start_date} · {c.duration_days} day(s)</p></div>
                      {c.certificate_issued ? <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded">Certificate</span> : null}
                    </div>
                  ))}</div>
                </div>
              )}
            </div>
          ) : tab === 'analytics' && analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Overview</h3>
                <div className="space-y-2 text-sm">
                  {[['Programs Organised', analytics.overview?.total_programs],['Upcoming', analytics.overview?.upcoming],['Completed', analytics.overview?.completed],['Total Participations', analytics.overview?.total_participations],['External FDPs', analytics.overview?.external_fdps],['Total Days Organised', analytics.overview?.total_days_organised]].map(([l,v]) => (
                    <div key={l} className="flex justify-between"><span className="text-gray-600">{l}</span><span className="font-medium">{v || 0}</span></div>
                  ))}
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Top Participants</h3>
                <div className="space-y-2">{analytics.topParticipants?.map(p => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <div><p className="font-medium">{p.name}</p><p className="text-xs text-gray-500">{p.department}</p></div>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">{p.count} FDPs</span>
                  </div>
                ))}</div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">{modalType === 'program' ? 'Add FDP Program' : 'Log External FDP'}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <input className="input-field" placeholder="Title *" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} />
              <input className="input-field" placeholder="Organizer" value={form.organizer||''} onChange={e => setForm({...form,organizer:e.target.value})} />
              {modalType === 'program' && (
                <select className="input-field" value={form.type||'organised'} onChange={e => setForm({...form,type:e.target.value})}>
                  {['organised','attended','webinar','conference','workshop','seminar'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              <select className="input-field" value={form.mode||'offline'} onChange={e => setForm({...form,mode:e.target.value})}>
                <option value="offline">Offline</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" type="date" placeholder="Start Date *" value={form.start_date||''} onChange={e => setForm({...form,start_date:e.target.value})} />
                <input className="input-field" type="date" placeholder="End Date" value={form.end_date||''} onChange={e => setForm({...form,end_date:e.target.value})} />
              </div>
              <input className="input-field" placeholder="Duration (days)" type="number" value={form.duration_days||1} onChange={e => setForm({...form,duration_days:e.target.value})} />
              {modalType === 'program' && <input className="input-field" placeholder="Venue" value={form.venue||''} onChange={e => setForm({...form,venue:e.target.value})} />}
              {modalType === 'external' && <input className="input-field" placeholder="Certificate URL" value={form.certificate_url||''} onChange={e => setForm({...form,certificate_url:e.target.value})} />}
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={submit} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
