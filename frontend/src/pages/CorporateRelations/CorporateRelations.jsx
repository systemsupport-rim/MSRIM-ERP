import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, FileText, Mic, Users, UserCheck, Calendar, Plus, Search, X, AlertTriangle, Globe, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const PARTNER_TYPES = ['placement','research','mou','csr','executive_education','advisory'];

export default function CorporateRelations() {
  const { user } = useAuth();
  const [tab, setTab] = useState('partners');
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState([]);
  const [mous, setMous] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [advisory, setAdvisory] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [form, setForm] = useState({});

  const isMgmt = ['admin','hod','registrar','placement'].includes(user?.role);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const calls = [
        api.get('/corporate-relations/partners'),
        api.get('/corporate-relations/mous'),
        api.get('/corporate-relations/guest-lectures'),
        api.get('/corporate-relations/advisory-board'),
        api.get('/corporate-relations/mentors'),
      ];
      if (isMgmt) calls.push(api.get('/corporate-relations/analytics'));
      const [p, m, l, a, me, an] = await Promise.all(calls);
      setPartners(p.data); setMous(m.data); setLectures(l.data); setAdvisory(a.data); setMentors(me.data);
      if (an) setAnalytics(an.data);
    } catch { toast.error('Failed to load corporate relations data'); }
    setLoading(false);
  };

  const openModal = (type) => {
    setModalType(type);
    if (type === 'partner') setForm({ partner_type: 'placement', hq_country: 'India', status: 'active' });
    else if (type === 'mou') setForm({ mou_type: 'general', status: 'active' });
    else if (type === 'lecture') setForm({ duration_hours: 1 });
    else if (type === 'advisory') setForm({ is_active: 1 });
    else if (type === 'mentor') setForm({ max_mentees: 5 });
    setShowModal(true);
  };

  const submit = async () => {
    try {
      if (modalType === 'partner') await api.post('/corporate-relations/partners', form);
      else if (modalType === 'mou') await api.post('/corporate-relations/mous', form);
      else if (modalType === 'lecture') await api.post('/corporate-relations/guest-lectures', form);
      else if (modalType === 'advisory') await api.post('/corporate-relations/advisory-board', form);
      else if (modalType === 'mentor') await api.post('/corporate-relations/mentors', form);
      toast.success('Saved!'); setShowModal(false); loadAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const expiringSoon = mous.filter(m => m.expiring_soon);
  const filteredPartners = partners.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sector||'').toLowerCase().includes(search.toLowerCase())
  );

  const tabs = [
    { id: 'partners', label: 'Partners' },
    { id: 'mous', label: `MOUs${expiringSoon.length ? ` (${expiringSoon.length}⚠)` : ''}` },
    { id: 'lectures', label: 'Guest Lectures' },
    { id: 'advisory', label: 'Advisory Board' },
    { id: 'mentors', label: 'Exec Mentors' },
    ...(isMgmt ? [{ id: 'analytics', label: 'Analytics' }] : []),
  ];

  const statCards = analytics ? [
    { label: 'Active Partners', value: analytics.overview?.active_partners, color: 'bg-blue-50 text-blue-600' },
    { label: 'Active MOUs', value: analytics.overview?.active_mous, color: 'bg-green-50 text-green-600' },
    { label: 'Expiring MOUs', value: analytics.overview?.expiring_mous, color: 'bg-amber-50 text-amber-600' },
    { label: 'Guest Lectures', value: analytics.overview?.total_guest_lectures, color: 'bg-violet-50 text-violet-600' },
    { label: 'Advisory Members', value: analytics.overview?.advisory_members, color: 'bg-rose-50 text-rose-600' },
    { label: 'Exec Mentors', value: analytics.overview?.active_mentors, color: 'bg-indigo-50 text-indigo-600' },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Corporate Relations & Industry Connect</h1>
          <p className="text-gray-500 text-sm mt-1">Partners · MOUs · Guest Lectures · Advisory Board · Executive Mentors</p>
        </div>
        {isMgmt && <button onClick={() => openModal('partner')} className="btn-primary text-sm flex items-center gap-2"><Plus className="w-4 h-4" />Add Partner</button>}
      </div>

      {/* Expiry alert */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">MOUs Expiring Soon</p>
            <p className="text-sm text-amber-700">{expiringSoon.map(m => `${m.partner_name} (${m.days_to_expiry}d left)`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value ?? 0}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
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
          : tab === 'partners' ? (
            <>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or sector..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" />
                </div>
                {isMgmt && <button onClick={() => openModal('partner')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPartners.map(p => (
                  <div key={p.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <Building2 className="w-8 h-8 text-blue-500" />
                      <span className={`text-xs px-2 py-0.5 rounded ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span>
                    </div>
                    <p className="font-semibold text-gray-900">{p.name}</p>
                    {p.sector && <p className="text-xs text-gray-500">{p.sector}</p>}
                    <p className="text-xs text-gray-400 capitalize mt-1">{p.partner_type?.replace('_',' ')}</p>
                    <div className="flex gap-2 mt-2">
                      {p.hr_contact_email && <a href={`mailto:${p.hr_contact_email}`} className="text-blue-500 hover:text-blue-700"><Mail className="w-3.5 h-3.5" /></a>}
                      {p.website && <a href={p.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700"><Globe className="w-3.5 h-3.5" /></a>}
                    </div>
                  </div>
                ))}
              </div>
              {filteredPartners.length === 0 && <p className="text-center text-gray-400 py-8">No partners found.</p>}
            </>
          ) : tab === 'mous' ? (
            <div className="space-y-3">
              {isMgmt && <div className="flex justify-end"><button onClick={() => openModal('mou')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add MOU</button></div>}
              {mous.map(m => (
                <div key={m.id} className={`border rounded-lg p-4 ${m.expiring_soon ? 'border-amber-300 bg-amber-50' : 'hover:bg-gray-50'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900">{m.partner_name}</p>
                      <p className="text-sm text-gray-600 capitalize">{m.mou_type?.replace('_',' ')} · Signed: {m.signing_date}</p>
                      {m.expiry_date && <p className={`text-xs ${m.expiring_soon ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>Expires: {m.expiry_date}{m.expiring_soon ? ` (${m.days_to_expiry} days left)` : ''}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{m.status}</span>
                  </div>
                </div>
              ))}
              {mous.length === 0 && <p className="text-center text-gray-400 py-8">No MOU agreements recorded.</p>}
            </div>
          ) : tab === 'lectures' ? (
            <div className="space-y-3">
              {(isMgmt || user?.role === 'faculty') && <div className="flex justify-end"><button onClick={() => openModal('lecture')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Log Lecture</button></div>}
              {lectures.map(l => (
                <div key={l.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <Mic className="w-5 h-5 text-violet-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{l.speaker_name}</p>
                      <p className="text-sm text-gray-600">{l.speaker_designation}{l.company_name ? ` · ${l.company_name}` : ''}</p>
                      <p className="text-sm text-gray-700 font-medium mt-1">{l.topic}</p>
                      <p className="text-xs text-gray-500">{l.event_date} · {l.venue || 'TBD'} · {l.audience_size} attendees</p>
                    </div>
                    {l.feedback_score && <div className="text-right"><p className="font-bold text-amber-600">{l.feedback_score}/5</p><p className="text-xs text-gray-400">feedback</p></div>}
                  </div>
                </div>
              ))}
              {lectures.length === 0 && <p className="text-center text-gray-400 py-8">No guest lectures recorded.</p>}
            </div>
          ) : tab === 'advisory' ? (
            <div className="space-y-3">
              {isMgmt && <div className="flex justify-end"><button onClick={() => openModal('advisory')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add Member</button></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {advisory.filter(a => a.is_active).map(a => (
                  <div key={a.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow flex gap-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-blue-700 text-lg">{a.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{a.name}</p>
                      <p className="text-sm text-gray-600">{a.designation}{a.company ? ` · ${a.company}` : ''}</p>
                      {a.expertise && <p className="text-xs text-gray-500 mt-1">{a.expertise}</p>}
                      {a.email && <a href={`mailto:${a.email}`} className="text-xs text-blue-600">{a.email}</a>}
                    </div>
                  </div>
                ))}
              </div>
              {advisory.length === 0 && <p className="text-center text-gray-400 py-8">No advisory board members.</p>}
            </div>
          ) : tab === 'mentors' ? (
            <div className="space-y-3">
              {isMgmt && <div className="flex justify-end"><button onClick={() => openModal('mentor')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add Mentor</button></div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mentors.map(m => (
                  <div key={m.id} className="border rounded-xl p-4 hover:shadow-md transition-shadow flex gap-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <UserCheck className="w-6 h-6 text-indigo-700" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{m.name}</p>
                      <p className="text-sm text-gray-600">{m.designation}{m.company_name ? ` · ${m.company_name}` : ''}</p>
                      {m.expertise && <p className="text-xs text-gray-500 mt-1">{m.expertise}</p>}
                      <p className="text-xs text-gray-400 mt-1">Max mentees: {m.max_mentees}</p>
                    </div>
                  </div>
                ))}
              </div>
              {mentors.length === 0 && <p className="text-center text-gray-400 py-8">No executive mentors registered.</p>}
            </div>
          ) : tab === 'analytics' && analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Partners by Sector</h3>
                <div className="space-y-2">
                  {analytics.bySector?.map(s => (
                    <div key={s.sector} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-32 truncate">{s.sector}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (s.count / (analytics.bySector?.[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium w-6 text-right">{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Recent Guest Lectures</h3>
                <div className="space-y-2">
                  {analytics.recentLectures?.map(l => (
                    <div key={l.id} className="text-sm border rounded p-2">
                      <p className="font-medium">{l.speaker_name}</p>
                      <p className="text-gray-500 text-xs">{l.topic} · {l.event_date}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold capitalize">Add {modalType.replace('_',' ')}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {modalType === 'partner' && <>
                <input className="input-field" placeholder="Company Name *" value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} />
                <input className="input-field" placeholder="Sector (e.g. IT, FMCG, Finance)" value={form.sector||''} onChange={e => setForm({...form,sector:e.target.value})} />
                <select className="input-field" value={form.partner_type||'placement'} onChange={e => setForm({...form,partner_type:e.target.value})}>
                  {PARTNER_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <input className="input-field" placeholder="HR Contact Name" value={form.hr_contact_name||''} onChange={e => setForm({...form,hr_contact_name:e.target.value})} />
                <input className="input-field" placeholder="HR Contact Email" type="email" value={form.hr_contact_email||''} onChange={e => setForm({...form,hr_contact_email:e.target.value})} />
                <input className="input-field" placeholder="HR Contact Phone" value={form.hr_contact_phone||''} onChange={e => setForm({...form,hr_contact_phone:e.target.value})} />
                <input className="input-field" placeholder="Website URL" value={form.website||''} onChange={e => setForm({...form,website:e.target.value})} />
                <input className="input-field" placeholder="City" value={form.hq_city||''} onChange={e => setForm({...form,hq_city:e.target.value})} />
              </>}
              {modalType === 'mou' && <>
                <select className="input-field" value={form.partner_id||''} onChange={e => setForm({...form,partner_id:e.target.value})}>
                  <option value="">Select Partner *</option>
                  {partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="input-field" value={form.mou_type||'general'} onChange={e => setForm({...form,mou_type:e.target.value})}>
                  {['general','research','placement','executive_education','csr'].map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <input className="input-field" type="date" placeholder="Signing Date *" value={form.signing_date||''} onChange={e => setForm({...form,signing_date:e.target.value})} />
                <input className="input-field" type="date" placeholder="Expiry Date" value={form.expiry_date||''} onChange={e => setForm({...form,expiry_date:e.target.value})} />
                <textarea className="input-field" placeholder="Scope / Purpose" rows={2} value={form.scope||''} onChange={e => setForm({...form,scope:e.target.value})} />
              </>}
              {modalType === 'lecture' && <>
                <input className="input-field" placeholder="Speaker Name *" value={form.speaker_name||''} onChange={e => setForm({...form,speaker_name:e.target.value})} />
                <input className="input-field" placeholder="Designation" value={form.speaker_designation||''} onChange={e => setForm({...form,speaker_designation:e.target.value})} />
                <input className="input-field" placeholder="Company" value={form.speaker_company||''} onChange={e => setForm({...form,speaker_company:e.target.value})} />
                <input className="input-field" placeholder="Topic *" value={form.topic||''} onChange={e => setForm({...form,topic:e.target.value})} />
                <input className="input-field" type="date" placeholder="Date *" value={form.event_date||''} onChange={e => setForm({...form,event_date:e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" placeholder="Venue" value={form.venue||''} onChange={e => setForm({...form,venue:e.target.value})} />
                  <input className="input-field" type="number" placeholder="Audience Size" value={form.audience_size||''} onChange={e => setForm({...form,audience_size:e.target.value})} />
                </div>
                <input className="input-field" type="number" step="0.5" placeholder="Duration (hours)" value={form.duration_hours||''} onChange={e => setForm({...form,duration_hours:e.target.value})} />
              </>}
              {modalType === 'advisory' && <>
                <input className="input-field" placeholder="Name *" value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} />
                <input className="input-field" placeholder="Designation" value={form.designation||''} onChange={e => setForm({...form,designation:e.target.value})} />
                <input className="input-field" placeholder="Company *" value={form.company||''} onChange={e => setForm({...form,company:e.target.value})} />
                <input className="input-field" placeholder="Sector" value={form.sector||''} onChange={e => setForm({...form,sector:e.target.value})} />
                <input className="input-field" placeholder="Email" type="email" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} />
                <input className="input-field" placeholder="Areas of Expertise" value={form.expertise||''} onChange={e => setForm({...form,expertise:e.target.value})} />
                <input className="input-field" type="date" placeholder="Member Since" value={form.member_since||''} onChange={e => setForm({...form,member_since:e.target.value})} />
              </>}
              {modalType === 'mentor' && <>
                <input className="input-field" placeholder="Name *" value={form.name||''} onChange={e => setForm({...form,name:e.target.value})} />
                <input className="input-field" placeholder="Designation" value={form.designation||''} onChange={e => setForm({...form,designation:e.target.value})} />
                <input className="input-field" placeholder="Company Name" value={form.company_name||''} onChange={e => setForm({...form,company_name:e.target.value})} />
                <input className="input-field" placeholder="Sector" value={form.sector||''} onChange={e => setForm({...form,sector:e.target.value})} />
                <input className="input-field" placeholder="Email" type="email" value={form.email||''} onChange={e => setForm({...form,email:e.target.value})} />
                <input className="input-field" placeholder="Expertise" value={form.expertise||''} onChange={e => setForm({...form,expertise:e.target.value})} />
                <input className="input-field" type="number" placeholder="Max Mentees" value={form.max_mentees||5} onChange={e => setForm({...form,max_mentees:e.target.value})} />
              </>}
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
