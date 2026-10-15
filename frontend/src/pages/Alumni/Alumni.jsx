import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Briefcase, Calendar, TrendingUp, Linkedin, MapPin, Star, Plus, Search, Building2, GraduationCap, Award, Heart } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import toast from 'react-hot-toast';

const COLORS = ['#003087','#1e56a0','#f97316','#10b981','#6366f1','#ec4899','#f59e0b','#06b6d4'];

export default function Alumni() {
  const { user } = useAuth();
  const [tab, setTab] = useState('directory');
  const [stats, setStats] = useState(null);
  const [alumni, setAlumni] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [showAlumniModal, setShowAlumniModal] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [alumniForm, setAlumniForm] = useState({ graduation_year: '', program: 'MBA', current_company: '', current_designation: '', current_location: '', industry: '', skills: '', is_mentor: false });
  const [jobForm, setJobForm] = useState({ title: '', company: '', location: '', job_type: 'full_time', experience_required: '', salary_range: '', description: '', last_date: '' });
  const [eventForm, setEventForm] = useState({ title: '', type: 'meetup', description: '', date: '', venue: '', max_attendees: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st, al, j, ev] = await Promise.all([
        api.get('/alumni/stats'),
        api.get('/alumni'),
        api.get('/alumni/jobs'),
        api.get('/alumni/events'),
      ]);
      setStats(st.data); setAlumni(al.data); setJobs(j.data); setEvents(ev.data);
    } catch { toast.error('Failed to load alumni data'); }
    setLoading(false);
  };

  const submitAlumni = async () => {
    if (!alumniForm.graduation_year) return toast.error('Graduation year required');
    try { await api.post('/alumni', alumniForm); toast.success('Alumni record created!'); setShowAlumniModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitJob = async () => {
    if (!jobForm.title || !jobForm.company) return toast.error('Title and company required');
    try { await api.post('/alumni/jobs', jobForm); toast.success('Job posted!'); setShowJobModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitEvent = async () => {
    if (!eventForm.title || !eventForm.date) return toast.error('Title and date required');
    try { await api.post('/alumni/events', eventForm); toast.success('Event created!'); setShowEventModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const filteredAlumni = alumni.filter(a => {
    if (search && !a.name?.toLowerCase().includes(search.toLowerCase()) && !a.current_company?.toLowerCase().includes(search.toLowerCase()) && !a.skills?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterYear && a.graduation_year != filterYear) return false;
    return true;
  });

  const isAdmin = ['admin','registrar'].includes(user?.role);
  const years = [...new Set(alumni.map(a => a.graduation_year))].sort((a, b) => b - a);
  const jobTypeLabel = { full_time: 'Full Time', part_time: 'Part Time', contract: 'Contract', internship: 'Internship', freelance: 'Freelance' };

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #8b5cf6 0%, transparent 50%), radial-gradient(circle at 80% 50%, #6366f1 0%, transparent 50%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 rounded-xl p-2.5"><GraduationCap className="w-6 h-6" /></div>
              <span className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">SAP CRM EQUIVALENT · ALUMNI CONNECT</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Alumni Relations & Network</h1>
            <p className="text-purple-200 text-sm max-w-lg">MSRIM's lifelong alumni ecosystem — connect, collaborate, and contribute. Industry jobs, events, and mentor matching powered by real data.</p>
          </div>
          <div className="hidden md:flex gap-2">
            {isAdmin && <button onClick={() => setShowAlumniModal(true)} className="bg-white text-purple-900 hover:bg-purple-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Add Alumni</button>}
            <button onClick={() => setShowJobModal(true)} className="bg-white/20 hover:bg-white/30 font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4" /> Post Job</button>
          </div>
        </div>
        {stats && (
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Alumni', value: stats.total, icon: GraduationCap, color: 'text-violet-300' },
              { label: 'Employed', value: stats.employed, icon: Briefcase, color: 'text-indigo-300' },
              { label: 'Mentors', value: stats.mentors, icon: Star, color: 'text-purple-300' },
              { label: 'Active Jobs', value: stats.jobs, icon: TrendingUp, color: 'text-blue-300' },
              { label: 'Upcoming Events', value: stats.events, icon: Calendar, color: 'text-pink-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-purple-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {['directory','jobs','events','analytics'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          {/* Directory */}
          {tab === 'directory' && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input className="input-field pl-9" placeholder="Search alumni by name, company, or skill..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="select-field w-36" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
                  <option value="">All Years</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlumni.map(a => (
                  <div key={a.id} className="card hover:shadow-lg transition-all hover:-translate-y-0.5 group">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {a.name?.charAt(0) || 'A'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate group-hover:text-purple-700 transition-colors">{a.name || 'Anonymous'}</h3>
                        <p className="text-xs text-gray-400">{a.program} · Batch {a.graduation_year}</p>
                      </div>
                      {a.is_mentor === 1 && <span className="badge-purple bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">Mentor</span>}
                    </div>
                    {a.current_designation && (
                      <div className="flex items-center gap-2 mb-1">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm font-medium">{a.current_designation}</p>
                      </div>
                    )}
                    {a.current_company && (
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm text-gray-600">{a.current_company}</p>
                      </div>
                    )}
                    {a.current_location && (
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-sm text-gray-500">{a.current_location}</p>
                      </div>
                    )}
                    {a.industry && <span className="badge-blue text-xs">{a.industry}</span>}
                    {a.skills && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {a.skills.split(',').slice(0,3).map(s => <span key={s} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{s.trim()}</span>)}
                      </div>
                    )}
                    {a.linkedin_url && (
                      <a href={a.linkedin_url} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <Linkedin className="w-3 h-3" /> LinkedIn Profile
                      </a>
                    )}
                  </div>
                ))}
                {filteredAlumni.length === 0 && (
                  <div className="col-span-3 card text-center py-12">
                    <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No alumni found. {isAdmin && 'Start building the network!'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Jobs */}
          {tab === 'jobs' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Alumni Job Postings ({jobs.filter(j => j.is_active).length} active)</h3>
                <button onClick={() => setShowJobModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Post Job</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobs.filter(j => j.is_active).map(job => (
                  <div key={job.id} className="card hover:shadow-lg transition-all hover:-translate-y-0.5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-blue-100 rounded-xl p-3"><Briefcase className="w-5 h-5 text-blue-600" /></div>
                      <span className="badge-blue">{jobTypeLabel[job.job_type] || job.job_type}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-msrim-blue font-medium">{job.company}</p>
                    {job.location && <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm"><MapPin className="w-3.5 h-3.5" />{job.location}</div>}
                    {job.salary_range && <p className="text-emerald-600 font-medium text-sm mt-1">💰 {job.salary_range}</p>}
                    {job.experience_required && <p className="text-gray-500 text-xs mt-1">Experience: {job.experience_required}</p>}
                    {job.description && <p className="text-gray-500 text-sm mt-2 line-clamp-2">{job.description}</p>}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-400">Posted by {job.posted_by_name || job.alumni_company || 'Alumni'}</p>
                      {job.last_date && <p className="text-xs text-red-500">Last date: {job.last_date}</p>}
                    </div>
                    {job.apply_link && <a href={job.apply_link} target="_blank" rel="noreferrer" className="mt-3 btn-primary text-xs inline-flex">Apply Now →</a>}
                  </div>
                ))}
                {jobs.filter(j => j.is_active).length === 0 && (
                  <div className="col-span-2 card text-center py-12">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No job postings yet. Be the first to help a fellow MSRIM-ite!</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Events */}
          {tab === 'events' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Alumni Events ({events.length})</h3>
                {isAdmin && <button onClick={() => setShowEventModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Create Event</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map(ev => (
                  <div key={ev.id} className={`card hover:shadow-md transition-shadow border-l-4 ${ev.status === 'upcoming' ? 'border-purple-400' : 'border-gray-300'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-purple-100 rounded-xl p-3"><Calendar className="w-5 h-5 text-purple-600" /></div>
                      <span className={ev.status === 'upcoming' ? 'badge-green' : 'badge-gray'}>{ev.status}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{ev.title}</h3>
                    <p className="text-sm text-gray-500 capitalize">{ev.type}</p>
                    {ev.date && <div className="flex items-center gap-1 mt-2 text-msrim-blue text-sm font-medium"><Calendar className="w-3.5 h-3.5" />{ev.date}</div>}
                    {ev.venue && <div className="flex items-center gap-1 mt-1 text-gray-400 text-sm"><MapPin className="w-3.5 h-3.5" />{ev.venue}</div>}
                    {ev.description && <p className="text-gray-500 text-sm mt-2 line-clamp-2">{ev.description}</p>}
                    {ev.max_attendees && <p className="text-xs text-gray-400 mt-2">Max Attendees: {ev.max_attendees}</p>}
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="col-span-2 card text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-400">No alumni events scheduled yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics */}
          {tab === 'analytics' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-purple-600" /> Alumni by Industry</h3>
                {stats.byIndustry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={stats.byIndustry} dataKey="c" nameKey="industry" cx="50%" cy="50%" outerRadius={80} label={({ industry, c }) => `${industry}: ${c}`}>
                        {stats.byIndustry.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-center py-8">No industry data</p>}
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-purple-600" /> Alumni by Graduation Year</h3>
                {stats.byYear.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.byYear}>
                      <XAxis dataKey="graduation_year" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="c" name="Alumni" fill="#7c3aed" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-center py-8">No year data</p>}
              </div>
              <div className="card col-span-1 md:col-span-2">
                <h3 className="font-semibold mb-4">Alumni Network Health</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    ['Employment Rate', stats.total > 0 ? `${((stats.employed/stats.total)*100).toFixed(0)}%` : '—', 'text-emerald-600'],
                    ['Mentor Availability', `${stats.mentors} mentors`, 'text-purple-600'],
                    ['Active Job Board', `${stats.jobs} open roles`, 'text-blue-600'],
                    ['Upcoming Events', `${stats.events} events`, 'text-indigo-600'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="bg-gray-50 rounded-xl p-4 text-center">
                      <p className={`text-2xl font-bold ${c}`}>{v}</p>
                      <p className="text-xs text-gray-500 mt-1">{k}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Alumni Modal */}
      {showAlumniModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Alumni Record</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Graduation Year *</label><input className="input-field" type="number" placeholder="2024" value={alumniForm.graduation_year} onChange={e => setAlumniForm(p => ({ ...p, graduation_year: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Program</label><input className="input-field" placeholder="MBA" value={alumniForm.program} onChange={e => setAlumniForm(p => ({ ...p, program: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Current Company</label><input className="input-field" value={alumniForm.current_company} onChange={e => setAlumniForm(p => ({ ...p, current_company: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Designation</label><input className="input-field" value={alumniForm.current_designation} onChange={e => setAlumniForm(p => ({ ...p, current_designation: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Location</label><input className="input-field" value={alumniForm.current_location} onChange={e => setAlumniForm(p => ({ ...p, current_location: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Industry</label><input className="input-field" placeholder="BFSI, IT, FMCG..." value={alumniForm.industry} onChange={e => setAlumniForm(p => ({ ...p, industry: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Skills (comma-separated)</label><input className="input-field" placeholder="Leadership, Finance, SAP..." value={alumniForm.skills} onChange={e => setAlumniForm(p => ({ ...p, skills: e.target.value }))} /></div>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={alumniForm.is_mentor} onChange={e => setAlumniForm(p => ({ ...p, is_mentor: e.target.checked }))} className="rounded" /><span className="text-sm">Available as Mentor</span></label>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitAlumni} className="btn-primary flex-1">Add</button>
              <button onClick={() => setShowAlumniModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Job Modal */}
      {showJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Briefcase className="w-5 h-5 text-blue-600" /> Post Job Opportunity</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Job Title *</label><input className="input-field" placeholder="e.g. Business Analyst" value={jobForm.title} onChange={e => setJobForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Company *</label><input className="input-field" value={jobForm.company} onChange={e => setJobForm(p => ({ ...p, company: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Location</label><input className="input-field" value={jobForm.location} onChange={e => setJobForm(p => ({ ...p, location: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Type</label>
                  <select className="select-field" value={jobForm.job_type} onChange={e => setJobForm(p => ({ ...p, job_type: e.target.value }))}>
                    {Object.entries(jobTypeLabel).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Experience</label><input className="input-field" placeholder="0-2 years" value={jobForm.experience_required} onChange={e => setJobForm(p => ({ ...p, experience_required: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Salary Range</label><input className="input-field" placeholder="₹5-8 LPA" value={jobForm.salary_range} onChange={e => setJobForm(p => ({ ...p, salary_range: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Description</label><textarea className="input-field" rows="2" value={jobForm.description} onChange={e => setJobForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Last Date</label><input className="input-field" type="date" value={jobForm.last_date} onChange={e => setJobForm(p => ({ ...p, last_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitJob} className="btn-primary flex-1">Post</button>
              <button onClick={() => setShowJobModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create Alumni Event</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Title *</label><input className="input-field" value={eventForm.title} onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Type</label>
                  <select className="select-field" value={eventForm.type} onChange={e => setEventForm(p => ({ ...p, type: e.target.value }))}>
                    {['meetup','reunion','webinar','networking','workshop','conference'].map(t => <option key={t}>{t}</option>)}
                  </select></div>
                <div><label className="text-sm font-medium block mb-1">Date *</label><input className="input-field" type="date" value={eventForm.date} onChange={e => setEventForm(p => ({ ...p, date: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Venue</label><input className="input-field" value={eventForm.venue} onChange={e => setEventForm(p => ({ ...p, venue: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Description</label><textarea className="input-field" rows="2" value={eventForm.description} onChange={e => setEventForm(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitEvent} className="btn-primary flex-1">Create</button>
              <button onClick={() => setShowEventModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
