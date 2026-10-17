import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Award, DollarSign, FlaskConical, Users, TrendingUp, Plus, Search, X, ExternalLink, Star } from 'lucide-react';
import toast from 'react-hot-toast';

const PUB_TYPES = ['journal','conference','book','book_chapter','working_paper','thesis','patent_pub'];

export default function Research() {
  const { user } = useAuth();
  const [tab, setTab] = useState('publications');
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState([]);
  const [grants, setGrants] = useState([]);
  const [patents, setPatents] = useState([]);
  const [consultancy, setConsultancy] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [activeModal, setActiveModal] = useState('');
  const [form, setForm] = useState({});

  const isMgmt = ['admin','hod','registrar'].includes(user?.role);
  const canAdd = isMgmt || user?.role === 'faculty';

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const calls = [api.get('/research/publications'), api.get('/research/grants'), api.get('/research/patents'), api.get('/research/consultancy')];
      if (isMgmt) calls.push(api.get('/research/analytics'));
      const [p, g, pa, c, an] = await Promise.all(calls);
      setPublications(p.data); setGrants(g.data); setPatents(pa.data); setConsultancy(c.data);
      if (an) setAnalytics(an.data);
    } catch { toast.error('Failed to load research data'); }
    setLoading(false);
  };

  const openModal = (type) => {
    setActiveModal(type);
    if (type === 'publication') setForm({ pub_type: 'journal', publication_year: new Date().getFullYear(), is_scopus: false, is_wos: false, is_ugc: false });
    else if (type === 'grant') setForm({ status: 'ongoing', amount: '' });
    else if (type === 'patent') setForm({ status: 'filed', country: 'India' });
    else if (type === 'consultancy') setForm({ status: 'ongoing', amount: '' });
    setShowModal(true);
  };

  const submit = async () => {
    try {
      if (activeModal === 'publication') await api.post('/research/publications', form);
      else if (activeModal === 'grant') await api.post('/research/grants', form);
      else if (activeModal === 'patent') await api.post('/research/patents', form);
      else if (activeModal === 'consultancy') await api.post('/research/consultancy', form);
      toast.success('Saved!'); setShowModal(false); loadAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const filteredPubs = publications.filter(p =>
    (!search || p.title.toLowerCase().includes(search.toLowerCase()) || (p.faculty_name||'').toLowerCase().includes(search.toLowerCase())) &&
    (!filterType || p.pub_type === filterType)
  );

  const statCards = [
    { label: 'Total Publications', value: publications.length, icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
    { label: 'Scopus Indexed', value: publications.filter(p => p.is_scopus).length, icon: Star, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'WoS Indexed', value: publications.filter(p => p.is_wos).length, icon: Award, color: 'bg-violet-50 text-violet-600' },
    { label: 'Active Grants', value: grants.filter(g => g.status === 'ongoing').length, icon: DollarSign, color: 'bg-green-50 text-green-600' },
    { label: 'Patents Filed', value: patents.length, icon: FlaskConical, color: 'bg-amber-50 text-amber-600' },
    { label: 'Consultancy', value: consultancy.length, icon: Users, color: 'bg-rose-50 text-rose-600' },
  ];

  const tabs = [
    { id: 'publications', label: 'Publications' },
    { id: 'grants', label: 'Grants' },
    { id: 'patents', label: 'Patents' },
    { id: 'consultancy', label: 'Consultancy' },
    ...(isMgmt ? [{ id: 'analytics', label: 'Analytics' }] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Research Management</h1>
          <p className="text-gray-500 text-sm mt-1">Publications · Grants · Patents · Consultancy · PhD Supervision</p>
        </div>
        {canAdd && (
          <div className="flex gap-2">
            <button onClick={() => openModal('publication')} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Publication
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
            <div className={`w-10 h-10 rounded-lg ${s.color} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
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
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400">Loading...</div>
          ) : tab === 'publications' ? (
            <>
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title or author..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full" />
                </div>
                <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                  <option value="">All Types</option>
                  {PUB_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                {canAdd && <button onClick={() => openModal('publication')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Author</th>
                    <th className="pb-2 pr-4">Journal/Conf</th>
                    <th className="pb-2 pr-4">Year</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2">Index</th>
                  </tr></thead>
                  <tbody className="divide-y">
                    {filteredPubs.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2 pr-4 max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{p.title}</p>
                          {p.doi && <a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 flex items-center gap-1">DOI <ExternalLink className="w-3 h-3" /></a>}
                        </td>
                        <td className="py-2 pr-4 text-gray-600">{p.faculty_name}</td>
                        <td className="py-2 pr-4 text-gray-600 max-w-[140px] truncate">{p.journal_conference || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600">{p.publication_year}</td>
                        <td className="py-2 pr-4"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{p.pub_type}</span></td>
                        <td className="py-2 flex gap-1 flex-wrap">
                          {p.is_scopus ? <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">Scopus</span> : null}
                          {p.is_wos   ? <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">WoS</span>   : null}
                          {p.is_ugc   ? <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">UGC</span>    : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPubs.length === 0 && <p className="text-center text-gray-400 py-8">No publications found.</p>}
              </div>
            </>
          ) : tab === 'grants' ? (
            <div className="space-y-3">
              {canAdd && <div className="flex justify-end"><button onClick={() => openModal('grant')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add Grant</button></div>}
              {grants.map(g => (
                <div key={g.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{g.title}</p>
                      <p className="text-sm text-gray-600">{g.funding_agency} {g.scheme ? `· ${g.scheme}` : ''}</p>
                      <p className="text-sm text-gray-500">{g.pi_name} · {g.start_date} – {g.end_date || 'ongoing'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">₹{(g.amount/100000).toFixed(2)}L</p>
                      <span className={`px-2 py-0.5 rounded text-xs ${g.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{g.status}</span>
                    </div>
                  </div>
                </div>
              ))}
              {grants.length === 0 && <p className="text-center text-gray-400 py-8">No grants recorded.</p>}
            </div>
          ) : tab === 'patents' ? (
            <div className="space-y-3">
              {canAdd && <div className="flex justify-end"><button onClick={() => openModal('patent')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add Patent</button></div>}
              {patents.map(p => (
                <div key={p.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{p.title}</p>
                      <p className="text-sm text-gray-600">{p.inventor_name} · {p.country}</p>
                      {p.application_number && <p className="text-xs text-gray-500">Application: {p.application_number} · Filed: {p.filing_date}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs ${p.status === 'granted' ? 'bg-green-100 text-green-700' : p.status === 'filed' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{p.status}</span>
                  </div>
                </div>
              ))}
              {patents.length === 0 && <p className="text-center text-gray-400 py-8">No patents recorded.</p>}
            </div>
          ) : tab === 'consultancy' ? (
            <div className="space-y-3">
              {canAdd && <div className="flex justify-end"><button onClick={() => openModal('consultancy')} className="btn-primary text-sm flex items-center gap-1"><Plus className="w-4 h-4" />Add Consultancy</button></div>}
              {consultancy.map(c => (
                <div key={c.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{c.title}</p>
                      <p className="text-sm text-gray-600">Client: {c.client} · {c.faculty_name}</p>
                      <p className="text-xs text-gray-500">{c.start_date} – {c.end_date || 'ongoing'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-700">₹{(c.amount/100000).toFixed(2)}L</p>
                      <span className={`px-2 py-0.5 rounded text-xs ${c.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                    </div>
                  </div>
                </div>
              ))}
              {consultancy.length === 0 && <p className="text-center text-gray-400 py-8">No consultancy projects recorded.</p>}
            </div>
          ) : tab === 'analytics' && analytics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Publications by Type</h3>
                <div className="space-y-2">
                  {analytics.pubsByType?.map(t => (
                    <div key={t.pub_type} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-28 capitalize">{t.pub_type.replace('_',' ')}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (t.count / (analytics.publications?.total || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{t.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-3">Year-wise Publications</h3>
                <div className="space-y-2">
                  {analytics.pubsByYear?.map(y => (
                    <div key={y.year} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-12">{y.year}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, (y.count / (analytics.pubsByYear?.[0]?.count || 1)) * 100)}%` }} />
                      </div>
                      <span className="text-sm font-medium w-8 text-right">{y.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <h3 className="font-semibold text-gray-700 mb-3">Top Contributing Faculty</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b text-gray-500"><th className="pb-2 text-left">Faculty</th><th className="pb-2 text-right">Publications</th><th className="pb-2 text-right">Total IF</th></tr></thead>
                    <tbody>{analytics.topFaculty?.map(f => (
                      <tr key={f.name} className="border-b hover:bg-gray-50">
                        <td className="py-2">{f.name}</td>
                        <td className="py-2 text-right font-medium">{f.pub_count}</td>
                        <td className="py-2 text-right text-gray-600">{(f.total_if||0).toFixed(2)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900 capitalize">Add {activeModal}</h2>
              <button onClick={() => setShowModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {activeModal === 'publication' && <>
                <input className="input-field" placeholder="Title *" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} />
                <select className="input-field" value={form.pub_type||'journal'} onChange={e => setForm({...form,pub_type:e.target.value})}>
                  {PUB_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
                </select>
                <input className="input-field" placeholder="Journal / Conference name" value={form.journal_conference||''} onChange={e => setForm({...form,journal_conference:e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" placeholder="Year" type="number" value={form.publication_year||''} onChange={e => setForm({...form,publication_year:e.target.value})} />
                  <input className="input-field" placeholder="Impact Factor" type="number" step="0.01" value={form.impact_factor||''} onChange={e => setForm({...form,impact_factor:e.target.value})} />
                </div>
                <input className="input-field" placeholder="DOI" value={form.doi||''} onChange={e => setForm({...form,doi:e.target.value})} />
                <div className="flex gap-4">
                  {[['is_scopus','Scopus'],['is_wos','WoS'],['is_ugc','UGC']].map(([k,l]) => (
                    <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={!!form[k]} onChange={e => setForm({...form,[k]:e.target.checked})} />
                      {l}
                    </label>
                  ))}
                </div>
              </>}
              {activeModal === 'grant' && <>
                <input className="input-field" placeholder="Project Title *" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} />
                <input className="input-field" placeholder="Funding Agency *" value={form.funding_agency||''} onChange={e => setForm({...form,funding_agency:e.target.value})} />
                <input className="input-field" placeholder="Scheme / Program" value={form.scheme||''} onChange={e => setForm({...form,scheme:e.target.value})} />
                <input className="input-field" placeholder="Amount (₹)" type="number" value={form.amount||''} onChange={e => setForm({...form,amount:e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" type="date" placeholder="Start Date" value={form.start_date||''} onChange={e => setForm({...form,start_date:e.target.value})} />
                  <input className="input-field" type="date" placeholder="End Date" value={form.end_date||''} onChange={e => setForm({...form,end_date:e.target.value})} />
                </div>
              </>}
              {activeModal === 'patent' && <>
                <input className="input-field" placeholder="Patent Title *" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} />
                <input className="input-field" placeholder="Application Number" value={form.application_number||''} onChange={e => setForm({...form,application_number:e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" type="date" placeholder="Filing Date" value={form.filing_date||''} onChange={e => setForm({...form,filing_date:e.target.value})} />
                  <select className="input-field" value={form.status||'filed'} onChange={e => setForm({...form,status:e.target.value})}>
                    {['filed','published','granted','abandoned'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input className="input-field" placeholder="Country" value={form.country||'India'} onChange={e => setForm({...form,country:e.target.value})} />
              </>}
              {activeModal === 'consultancy' && <>
                <input className="input-field" placeholder="Project Title *" value={form.title||''} onChange={e => setForm({...form,title:e.target.value})} />
                <input className="input-field" placeholder="Client *" value={form.client||''} onChange={e => setForm({...form,client:e.target.value})} />
                <input className="input-field" placeholder="Amount (₹)" type="number" value={form.amount||''} onChange={e => setForm({...form,amount:e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" type="date" value={form.start_date||''} onChange={e => setForm({...form,start_date:e.target.value})} />
                  <input className="input-field" type="date" value={form.end_date||''} onChange={e => setForm({...form,end_date:e.target.value})} />
                </div>
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
