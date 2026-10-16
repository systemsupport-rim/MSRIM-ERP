import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Plus, X, Search, Filter, CheckCircle, XCircle, Clock, Users, ChevronDown, ChevronUp, Eye } from 'lucide-react';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-600',
  cancelled: 'bg-orange-100 text-orange-600',
};
const APPROVAL_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

export default function JobManagement() {
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('jobs'); // jobs | approvals

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [j, c] = await Promise.all([api.get('/jobs'), api.get('/companies')]);
      setJobs(j.data); setCompanies(c.data);
    } finally { setLoading(false); }
  }

  async function approve(jobId, action) {
    try {
      await api.put(`/jobs/${jobId}/approve`, { action });
      toast.success(`Job ${action}d.`); fetchAll();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  async function closeJob(jobId) {
    try { await api.put(`/jobs/${jobId}/close`); toast.success('Job closed.'); fetchAll(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  const filtered = jobs.filter(j => {
    if (filter.status && j.status !== filter.status) return false;
    if (filter.type && j.type !== filter.type) return false;
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) &&
        !(j.company?.name||'').toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'approvals') return j.approval_status === 'pending';
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job & Internship Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {jobs.filter(j=>j.status==='open').length} open · {jobs.filter(j=>j.approval_status==='pending').length} pending approval
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setSelected(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Post Job
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['jobs','All Jobs'],['approvals','Pending Approval']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {label}{id==='approvals' && jobs.filter(j=>j.approval_status==='pending').length > 0 ?
              <span className="ml-1.5 bg-yellow-400 text-white text-xs px-1.5 py-0.5 rounded-full">{jobs.filter(j=>j.approval_status==='pending').length}</span> : null}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs, companies…" className="input-field pl-9 w-60" />
        </div>
        <select value={filter.status} onChange={e => setFilter(f=>({...f,status:e.target.value}))} className="select-field w-36">
          <option value="">All Status</option>
          {['draft','open','closed','cancelled'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filter.type} onChange={e => setFilter(f=>({...f,type:e.target.value}))} className="select-field w-36">
          <option value="">All Types</option>
          {['fulltime','internship','ppo','contract'].map(t=><option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading ? <div className="py-16 text-center text-gray-400">Loading…</div> : (
        <div className="space-y-3">
          {filtered.map(j => (
            <JobCard key={j.id} job={j} onApprove={approve} onClose={closeJob}
              onEdit={() => { setSelected(j); setShowForm(true); }}
              onView={() => setSelected(selected?.id===j.id?null:j)}
              expanded={selected?.id===j.id} refresh={fetchAll} />
          ))}
          {!filtered.length && <div className="card text-center py-12 text-gray-400">No jobs found</div>}
        </div>
      )}

      {showForm && <JobForm companies={companies} job={selected} onClose={()=>{setShowForm(false);setSelected(null);fetchAll();}} />}
    </div>
  );
}

function JobCard({ job, onApprove, onClose, onEdit, onView, expanded, refresh }) {
  const [eligibles, setEligibles] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [showRoundForm, setShowRoundForm] = useState(false);

  async function loadDetail() {
    const [e, r] = await Promise.all([
      api.get(`/jobs/${job.id}/eligible-students`),
      api.get(`/jobs/${job.id}/rounds`),
    ]);
    setEligibles(e.data); setRounds(r.data);
  }

  useEffect(() => { if (expanded) loadDetail(); }, [expanded]);

  async function addRound(form) {
    try { await api.post(`/jobs/${job.id}/rounds`, form); toast.success('Round added.'); loadDetail(); setShowRoundForm(false); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onView}>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{job.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 capitalize">{job.type}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]||'bg-gray-100 text-gray-600'}`}>{job.status}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${APPROVAL_COLORS[job.approval_status]||''}`}>{job.approval_status}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5">{job.company?.name} · {job.location}</p>
          <div className="flex gap-4 mt-1.5 text-sm flex-wrap">
            {job.package_lpa && <span className="text-green-600 font-semibold">₹{job.package_lpa} LPA</span>}
            {job.min_cgpa > 0 && <span className="text-gray-400">CGPA ≥ {job.min_cgpa}</span>}
            {job.drive_date && <span className="text-gray-400">Drive: {new Date(job.drive_date).toLocaleDateString()}</span>}
            <span className="text-gray-400">{job.total_applications} applied · {job.openings} openings</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {job.approval_status === 'pending' && (
            <>
              <button onClick={() => onApprove(job.id,'approve')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium">
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
              <button onClick={() => onApprove(job.id,'reject')} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 font-medium">
                <XCircle className="w-3.5 h-3.5" /> Reject
              </button>
            </>
          )}
          {job.status === 'open' && (
            <button onClick={() => onClose(job.id)} className="px-2.5 py-1.5 text-xs rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium">Close</button>
          )}
          <button onClick={onEdit} className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">Edit</button>
          <button onClick={onView} className="p-1.5 rounded-lg hover:bg-gray-100">
            {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
          {/* Eligibility summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-msrim-blue">{eligibles?.total ?? '—'}</p>
              <p className="text-xs text-blue-600 mt-0.5">Eligible Students</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{job.total_applications}</p>
              <p className="text-xs text-green-600 mt-0.5">Applications</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{rounds.length}</p>
              <p className="text-xs text-purple-600 mt-0.5">Hiring Rounds</p>
            </div>
          </div>

          {/* Eligibility criteria */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Eligibility Criteria</p>
            <div className="flex gap-3 flex-wrap text-sm">
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700">Min CGPA: <strong>{job.min_cgpa || 'None'}</strong></span>
              <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-gray-700">Max Backlogs: <strong>{job.max_backlogs}</strong></span>
              {job.bond_years > 0 && <span className="px-2.5 py-1 bg-orange-100 rounded-lg text-orange-700">Bond: <strong>{job.bond_years} yr</strong></span>}
              {job.ppt_date && <span className="px-2.5 py-1 bg-blue-100 rounded-lg text-blue-700">PPT: <strong>{new Date(job.ppt_date).toLocaleDateString()}</strong></span>}
            </div>
          </div>

          {/* Hiring rounds */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hiring Rounds</p>
              <button onClick={() => setShowRoundForm(s=>!s)} className="text-xs text-msrim-blue hover:underline">+ Add Round</button>
            </div>
            {rounds.length > 0 ? (
              <div className="space-y-2">
                {rounds.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-msrim-blue text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{r.round_number}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{r.round_name}</p>
                      <p className="text-xs text-gray-400">{r.round_type} · {r.scheduled_date ? new Date(r.scheduled_date).toLocaleDateString() : 'TBD'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${r.status==='completed'?'bg-green-100 text-green-700':r.status==='ongoing'?'bg-yellow-100 text-yellow-700':'bg-gray-100 text-gray-600'}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No rounds configured yet</p>}

            {showRoundForm && <AddRoundForm jobId={job.id} nextNum={(rounds.length||0)+1} onSubmit={addRound} />}
          </div>

          {/* Description */}
          {job.description && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-600 leading-relaxed">{job.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddRoundForm({ jobId, nextNum, onSubmit }) {
  const [form, setForm] = useState({ round_number: nextNum, round_name: '', round_type: 'interview', scheduled_date: '', venue: '', duration_minutes: 60, is_eliminatory: 1 });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const ROUND_TYPES = [['interview','Interview'],['test','Written Test'],['group_discussion','Group Discussion'],['presentation','Presentation']];
  const ROUND_NAMES = ['Aptitude Test','Technical Round','Group Discussion','HR Interview','Final Interview','Coding Test','Case Study'];

  return (
    <div className="mt-3 p-4 border border-dashed border-gray-200 rounded-xl space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Round Name</label>
          <select value={form.round_name} onChange={e=>set('round_name',e.target.value)} className="select-field text-sm">
            <option value="">Select</option>
            {ROUND_NAMES.map(n=><option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Type</label>
          <select value={form.round_type} onChange={e=>set('round_type',e.target.value)} className="select-field text-sm">
            {ROUND_TYPES.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Scheduled Date</label>
          <input type="datetime-local" value={form.scheduled_date} onChange={e=>set('scheduled_date',e.target.value)} className="input-field text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Venue</label>
          <input value={form.venue} onChange={e=>set('venue',e.target.value)} className="input-field text-sm" placeholder="Room / Online" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => onSubmit(form)} className="btn-primary text-sm py-1.5">Add Round</button>
      </div>
    </div>
  );
}

function JobForm({ companies, job, onClose }) {
  const [form, setForm] = useState({
    company_id: job?.company_id || '',
    title: job?.title || '',
    job_role: job?.job_role || '',
    description: job?.description || '',
    requirements: job?.requirements || '',
    skills_required: job?.skills_required || '',
    location: job?.location || '',
    type: job?.type || 'fulltime',
    package_lpa: job?.package_lpa || '',
    package_min: job?.package_min || '',
    package_max: job?.package_max || '',
    stipend_monthly: job?.stipend_monthly || '',
    openings: job?.openings || 1,
    min_cgpa: job?.min_cgpa || 0,
    max_backlogs: job?.max_backlogs || 0,
    drive_date: job?.drive_date || '',
    last_apply_date: job?.last_apply_date || '',
    ppt_date: job?.ppt_date || '',
    bond_years: job?.bond_years || 0,
  });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  async function submit(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (job) { await api.put(`/jobs/${job.id}`, form); toast.success('Job updated.'); }
      else { await api.post('/jobs', form); toast.success('Job posted.'); }
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  const isInternship = form.type === 'internship';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">{job ? 'Edit Job' : 'Post New Job'}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Company *</label>
              <select required value={form.company_id} onChange={e=>set('company_id',e.target.value)} className="select-field">
                <option value="">Select Company</option>
                {companies.filter(c=>c.is_active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Job Title *</label>
              <input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role / Designation</label>
              <input value={form.job_role} onChange={e=>set('job_role',e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.type} onChange={e=>set('type',e.target.value)} className="select-field">
                {['fulltime','internship','ppo','contract'].map(t=><option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{isInternship?'Stipend (₹/month)':'Package (LPA)'}</label>
              <input type="number" step="0.5" value={isInternship?form.stipend_monthly:form.package_lpa}
                onChange={e=>set(isInternship?'stipend_monthly':'package_lpa',e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <input value={form.location} onChange={e=>set('location',e.target.value)} className="input-field" placeholder="City / Remote" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Openings</label>
              <input type="number" min="1" value={form.openings} onChange={e=>set('openings',e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bond (years)</label>
              <input type="number" min="0" value={form.bond_years} onChange={e=>set('bond_years',e.target.value)} className="input-field" />
            </div>

            {/* Eligibility */}
            <div className="col-span-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Eligibility Criteria</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Min CGPA</label>
                  <input type="number" step="0.1" min="0" max="10" value={form.min_cgpa} onChange={e=>set('min_cgpa',e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Active Backlogs</label>
                  <input type="number" min="0" value={form.max_backlogs} onChange={e=>set('max_backlogs',e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="col-span-2 pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-3">Schedule</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">PPT Date</label>
                  <input type="date" value={form.ppt_date} onChange={e=>set('ppt_date',e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Drive Date</label>
                  <input type="date" value={form.drive_date} onChange={e=>set('drive_date',e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apply By</label>
                  <input type="date" value={form.last_apply_date} onChange={e=>set('last_apply_date',e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Job Description</label>
              <textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Skills Required</label>
              <input value={form.skills_required} onChange={e=>set('skills_required',e.target.value)} className="input-field" placeholder="Excel, SQL, Communication…" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading?'Saving…':'Save Job'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
