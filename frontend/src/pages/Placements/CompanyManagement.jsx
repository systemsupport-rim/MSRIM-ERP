import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Building2, Globe, Phone, Mail, MapPin, CheckCircle, Edit2, Search } from 'lucide-react';

export default function CompanyManagement() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetch(); }, []);

  async function fetch() {
    setLoading(true);
    try { const r = await api.get('/companies'); setCompanies(r.data); }
    finally { setLoading(false); }
  }

  const filtered = companies.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.sector||'').toLowerCase().includes(search.toLowerCase()) ||
    (c.city||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{companies.filter(c=>c.is_active).length} active · {companies.filter(c=>c.mou_signed).length} MOU signed</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies, sector, city…"
          className="input-field pl-9 w-full max-w-sm" />
      </div>

      {/* Grid */}
      {loading ? <div className="py-16 text-center text-gray-400">Loading…</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className={`card hover:shadow-md transition-shadow ${!c.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-msrim-blue to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight">{c.name}</h3>
                    <p className="text-xs text-gray-500">{c.sector}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {c.mou_signed ? <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">MOU</span> : null}
                  <button onClick={() => { setEditing(c); setShowForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100">
                    <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {c.city && <div className="flex items-center gap-1.5 text-gray-500"><MapPin className="w-3.5 h-3.5" />{c.city}{c.state ? ', ' + c.state : ''}</div>}
                {c.hr_name && <div className="flex items-center gap-1.5 text-gray-500"><Mail className="w-3.5 h-3.5" />{c.hr_name}</div>}
                {c.hr_email && <p className="text-gray-400 text-xs pl-5">{c.hr_email}</p>}
                {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-msrim-blue text-xs hover:underline"><Globe className="w-3.5 h-3.5" />{c.website.replace('https://','')}</a>}
              </div>

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <div className="flex gap-4 text-xs text-gray-500">
                  <span><span className="font-semibold text-gray-800">{c.total_jobs}</span> jobs</span>
                  <span><span className="font-semibold text-gray-800">{c.total_hired}</span> hired</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.is_active ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
          {!filtered.length && <div className="col-span-3 card text-center py-12 text-gray-400">No companies found</div>}
        </div>
      )}

      {showForm && <CompanyForm company={editing} onClose={() => { setShowForm(false); setEditing(null); fetch(); }} />}
    </div>
  );
}

function CompanyForm({ company, onClose }) {
  const [form, setForm] = useState({
    name: company?.name || '', sector: company?.sector || '', website: company?.website || '',
    description: company?.description || '', hr_name: company?.hr_name || '',
    hr_email: company?.hr_email || '', hr_phone: company?.hr_phone || '',
    address: company?.address || '', city: company?.city || '', state: company?.state || '',
    employee_count: company?.employee_count || '', founded_year: company?.founded_year || '',
    mou_signed: company?.mou_signed || 0, mou_date: company?.mou_date || '',
    is_active: company?.is_active !== undefined ? company.is_active : 1,
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (company) { await api.put(`/companies/${company.id}`, form); toast.success('Company updated.'); }
      else { await api.post('/companies', form); toast.success('Company added.'); }
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  const SECTORS = ['Consulting','IT Services','E-Commerce / Tech','BFSI','Manufacturing','FMCG','Healthcare','Education','Media','Logistics','Real Estate','Other'];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">{company ? 'Edit Company' : 'Add Company'}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Company Name *</label>
              <input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sector</label>
              <select value={form.sector} onChange={e => set('sector', e.target.value)} className="select-field">
                <option value="">Select sector</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input value={form.website} onChange={e => set('website', e.target.value)} className="input-field" placeholder="https://" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HR Contact Name</label>
              <input value={form.hr_name} onChange={e => set('hr_name', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HR Email</label>
              <input type="email" value={form.hr_email} onChange={e => set('hr_email', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HR Phone</label>
              <input value={form.hr_phone} onChange={e => set('hr_phone', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">State</label>
              <input value={form.state} onChange={e => set('state', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employee Count</label>
              <select value={form.employee_count} onChange={e => set('employee_count', e.target.value)} className="select-field">
                <option value="">Select</option>
                {['1-50','51-200','201-500','501-1000','1001-5000','5000+'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Founded Year</label>
              <input type="number" value={form.founded_year} onChange={e => set('founded_year', e.target.value)} className="input-field" placeholder="2000" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} className="input-field" rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="mou" checked={!!form.mou_signed} onChange={e => set('mou_signed', e.target.checked ? 1 : 0)} className="w-4 h-4" />
              <label htmlFor="mou" className="text-sm font-medium">MOU Signed</label>
            </div>
            {form.mou_signed ? (
              <div>
                <label className="block text-sm font-medium mb-1">MOU Date</label>
                <input type="date" value={form.mou_date} onChange={e => set('mou_date', e.target.value)} className="input-field" />
              </div>
            ) : null}
            {company && (
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked ? 1 : 0)} className="w-4 h-4" />
                <label htmlFor="active" className="text-sm font-medium">Active</label>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Company'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
