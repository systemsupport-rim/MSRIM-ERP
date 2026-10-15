import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, Plus, X, Edit2, UserX, UserCheck, Trash2, Users, Building2, Save } from 'lucide-react';

const ROLE_COLORS = {
  registrar: 'bg-purple-100 text-purple-700 border-purple-200',
  accounts:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  placement: 'bg-orange-100 text-orange-700 border-orange-200',
  librarian: 'bg-pink-100 text-pink-700 border-pink-200',
  hod:       'bg-blue-100 text-blue-700 border-blue-200',
  admin:     'bg-red-100 text-red-700 border-red-200',
};

const ROLE_AVATAR = {
  registrar: 'bg-purple-600',
  accounts:  'bg-indigo-600',
  placement: 'bg-orange-500',
  librarian: 'bg-pink-600',
  hod:       'bg-blue-700',
  admin:     'bg-red-600',
  faculty:   'bg-msrim-blue',
};

export default function Faculty() {
  const { user } = useAuth();
  const [tab, setTab]         = useState('faculty');
  const [faculty, setFaculty] = useState([]);
  const [staff, setStaff]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selected, setSelected]       = useState(null);
  const [showAdd, setShowAdd]         = useState(false);
  const [editFaculty, setEditFaculty] = useState(null);
  const [editStaff, setEditStaff]     = useState(null);
  const canManage = ['admin', 'registrar'].includes(user.role);

  useEffect(() => { fetchAll(); }, [search]);

  async function fetchAll() {
    setLoading(true);
    try {
      const params = {}; if (search) params.search = search;
      const [fRes, uRes] = await Promise.all([
        api.get('/faculty', { params }),
        canManage ? api.get('/auth/users') : Promise.resolve({ data: [] }),
      ]);
      setFaculty([...fRes.data].sort((a, b) => (a.name || '').localeCompare(b.name || '')));
      // Staff = all non-student, non-faculty users (admin staff, accounts, library, placement, registrar)
      setStaff(uRes.data
        .filter(u =>
          !['student','faculty'].includes(u.role) &&
          (search ? u.name?.toLowerCase().includes(search.toLowerCase()) || u.department?.toLowerCase().includes(search.toLowerCase()) : true)
        )
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
    } finally { setLoading(false); }
  }

  const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  const filteredStaff = deptFilter ? staff.filter(s => s.department === deptFilter) : staff;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Faculty & Staff</h1>
          <p className="text-gray-500 text-sm mt-1">
            {tab === 'faculty' ? `${faculty.length} faculty members` : `${filteredStaff.length} administration staff`}
          </p>
        </div>
        {canManage && tab === 'faculty' && (
          <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Add Faculty</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('faculty')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab==='faculty'?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>
          <Users className="w-4 h-4" /> Faculty <span className="bg-msrim-blue/10 text-msrim-blue text-xs px-1.5 py-0.5 rounded-full">{faculty.length}</span>
        </button>
        <button onClick={() => setTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab==='staff'?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>
          <Building2 className="w-4 h-4" /> Administration Staff <span className="bg-msrim-blue/10 text-msrim-blue text-xs px-1.5 py-0.5 rounded-full">{staff.length}</span>
        </button>
      </div>

      {/* Search + dept filter */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 min-w-48 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'faculty' ? 'Search faculty...' : 'Search staff or department...'}
            className="bg-transparent text-sm outline-none w-full" />
        </div>
        {tab === 'staff' && (
          <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="select-field w-56">
            <option value="">All Departments</option>
            {depts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      {/* Faculty tab */}
      {tab === 'faculty' && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : faculty.map(f => (
          <div key={f.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4 cursor-pointer" onClick={() => setSelected(f)}>
              <div className="w-12 h-12 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {f.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{f.name}</h3>
                <p className="text-gray-500 text-sm">{f.designation || '—'}</p>
                <p className="text-gray-400 text-xs">{f.dept_name}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="badge-blue text-xs">{f.employee_id}</span>
                  <span className={`text-xs ${f.is_active === 0 ? 'badge-red' : 'badge-green'}`}>{f.is_active === 0 ? 'Inactive' : `${f.experience_years} yrs`}</span>
                </div>
              </div>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                <button onClick={() => setEditFaculty(f)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-msrim-blue text-msrim-blue hover:bg-blue-50 font-medium transition-colors">
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={async () => {
                  const action = f.is_active === 0 ? 'activate' : 'deactivate';
                  if (!window.confirm(`${action === 'activate' ? 'Activate' : 'Deactivate'} ${f.name}?`)) return;
                  try { await api.put(`/faculty/${f.id}/${action}`); toast.success(`Faculty ${action}d`); fetchAll(); }
                  catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                }} className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors
                  ${f.is_active === 0 ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-yellow-300 text-yellow-700 hover:bg-yellow-50'}`}>
                  {f.is_active === 0 ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                  {f.is_active === 0 ? 'Activate' : 'Deactivate'}
                </button>
                {user.role === 'admin' && (
                  <button onClick={async () => {
                    if (!window.confirm(`Permanently remove ${f.name}?`)) return;
                    try { await api.delete(`/faculty/${f.id}`); toast.success('Faculty removed'); fetchAll(); }
                    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                  }} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium transition-colors">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {!loading && !faculty.length && <div className="col-span-3 card text-center py-12 text-gray-400">No faculty found</div>}
      </div>
      )}

      {/* Staff tab — card grid matching Faculty layout */}
      {tab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 text-center py-12">
              <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : filteredStaff.map(s => (
            <div key={s.id} className={`card hover:shadow-md transition-shadow ${!s.is_active ? 'opacity-60' : ''}`}>
              {/* Card header */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${s.is_active ? (ROLE_AVATAR[s.role] || 'bg-gray-500') : 'bg-gray-400'}`}>
                  {s.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
                  <p className="text-gray-500 text-sm truncate">{s.department || '—'}</p>
                  <p className="text-gray-400 text-xs font-mono mt-0.5">{s.username}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${ROLE_COLORS[s.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {s.role}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Email & phone */}
              <div className="mt-3 space-y-1">
                {s.email && <p className="text-xs text-gray-400 truncate">✉ {s.email}</p>}
                {s.phone && <p className="text-xs text-gray-400">📞 {s.phone}</p>}
              </div>

              {/* Actions */}
              {canManage && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                  <button onClick={() => setEditStaff(s)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-msrim-blue text-msrim-blue hover:bg-blue-50 font-medium transition-colors">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={async () => {
                    const action = s.is_active ? 'deactivate' : 'activate';
                    if (!window.confirm(`${s.is_active ? 'Deactivate' : 'Activate'} ${s.name}?`)) return;
                    try { await api.put(`/auth/users/${s.id}/toggle-active`); toast.success(`Account ${action}d`); fetchAll(); }
                    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                  }} className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border font-medium transition-colors
                    ${s.is_active ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                    {s.is_active ? <><UserX className="w-3 h-3" />Deactivate</> : <><UserCheck className="w-3 h-3" />Activate</>}
                  </button>
                  <button onClick={async () => {
                    const pwd = window.prompt(`Reset password for ${s.name}:`);
                    if (!pwd) return;
                    try { await api.put(`/auth/users/${s.id}/reset-password`, { password: pwd }); toast.success('Password reset'); }
                    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
                  }} className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                    🔑 Reset
                  </button>
                </div>
              )}
            </div>
          ))}
          {!loading && filteredStaff.length === 0 && (
            <div className="col-span-3 card text-center py-12 text-gray-400">No administration staff found</div>
          )}
        </div>
      )}

      {selected && (
        <FacultyDetailModal
          faculty={selected}
          canManage={canManage}
          onClose={() => { setSelected(null); fetchAll(); }}
        />
      )}
      {showAdd && <AddFacultyModal onClose={() => { setShowAdd(false); fetchAll(); }} />}
      {editFaculty && <EditFacultyModal faculty={editFaculty} onClose={() => { setEditFaculty(null); fetchAll(); }} />}
      {editStaff   && <EditStaffModal   staff={editStaff}     onClose={() => { setEditStaff(null);   fetchAll(); }} />}
    </div>
  );
}

function FacultyDetailModal({ faculty: initialFaculty, canManage, onClose }) {
  const [faculty, setFaculty] = useState(initialFaculty);
  const [tab, setTab] = useState('details');
  const [attendance, setAttendance] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    designation: faculty.designation || '',
    qualification: faculty.qualification || '',
    specialization: faculty.specialization || '',
    experience_years: faculty.experience_years || 0,
    employment_type: faculty.employment_type || 'full-time',
    phone: faculty.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    if (tab === 'attendance' && !attendance) {
      api.get(`/faculty/${faculty.id}/attendance`).then(r => setAttendance(r.data));
    }
  }, [tab]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.put(`/faculty/${faculty.id}`, editForm);
      setFaculty(f => ({ ...f, ...editForm }));
      toast.success('Faculty updated'); setEditing(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${faculty.name}?`)) return;
    setDeactivating(true);
    try {
      await api.put(`/faculty/${faculty.id}/deactivate`);
      toast.success('Faculty deactivated'); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setDeactivating(false); }
  }

  const setEdit = (k, v) => setEditForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold">{faculty.name?.charAt(0)}</div>
            <div>
              <h2 className="font-bold text-xl">{faculty.name}</h2>
              <p className="text-gray-500 text-sm">{faculty.designation} · {faculty.dept_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && !editing && (
              <button onClick={() => setEditing(true)} className="btn-secondary p-2"><Edit2 className="w-4 h-4" /></button>
            )}
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex gap-1 p-4 border-b bg-gray-50">
          {[['details', 'Details'], ['attendance', 'Attendance']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${tab === id ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'details' && !editing && (
            <div className="grid grid-cols-2 gap-4">
              {[['Employee ID', faculty.employee_id], ['Email', faculty.email], ['Phone', faculty.phone],
                ['Qualification', faculty.qualification], ['Specialization', faculty.specialization],
                ['Experience', `${faculty.experience_years} years`], ['Joining Date', faculty.joining_date],
                ['Employment Type', faculty.employment_type]].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{k}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{v || '—'}</p>
                </div>
              ))}
              {faculty.courses?.length > 0 && (
                <div className="col-span-2 mt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-2">Courses Handling</p>
                  {faculty.courses.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm">{c.name}</span>
                      <span className="badge-blue">{c.code}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'details' && editing && (
            <div className="grid grid-cols-2 gap-4">
              {[['Designation', 'designation'], ['Qualification', 'qualification'], ['Specialization', 'specialization'], ['Phone', 'phone']].map(([l, k]) => (
                <div key={k}>
                  <label className="block text-sm font-medium mb-1">{l}</label>
                  <input value={editForm[k]} onChange={e => setEdit(k, e.target.value)} className="input-field" />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">Experience (years)</label>
                <input type="number" value={editForm.experience_years} onChange={e => setEdit('experience_years', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employment Type</label>
                <select value={editForm.employment_type} onChange={e => setEdit('employment_type', e.target.value)} className="select-field">
                  {['full-time', 'part-time', 'visiting', 'contract'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2 flex gap-2 justify-end pt-2">
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          )}

          {tab === 'attendance' && (
            <div>
              {!attendance ? (
                <div className="text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">Attendance Rate</p>
                    <span className={`text-lg font-bold ${parseFloat(attendance.summary?.percentage || 0) < 75 ? 'text-red-500' : 'text-green-600'}`}>{attendance.summary?.percentage || 0}%</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {attendance.records?.slice(0, 20).map((r, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-sm">
                        <span className="text-gray-600">{r.date}</span>
                        <span className={`badge-${r.status === 'present' ? 'green' : r.status === 'absent' ? 'red' : 'yellow'}`}>{r.status}</span>
                      </div>
                    ))}
                    {!attendance.records?.length && <p className="text-gray-400 text-center py-4">No attendance records</p>}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {canManage && (
          <div className="px-6 pb-6 flex justify-end">
            <button onClick={handleDeactivate} disabled={deactivating} className="btn-danger text-sm">
              <UserX className="w-4 h-4" /> {deactivating ? 'Deactivating...' : 'Deactivate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AddFacultyModal({ onClose }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', employee_id: '', department_id: '1', designation: '', qualification: '', experience_years: '0', joining_date: '', employment_type: 'full-time' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/faculty', form); toast.success('Faculty added!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Add Faculty</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          {[['Full Name *', 'name', 'text', true], ['Email *', 'email', 'email', true], ['Phone', 'phone', 'tel', false],
            ['Employee ID *', 'employee_id', 'text', true],
            ['Qualification', 'qualification', 'text', false], ['Experience (yrs)', 'experience_years', 'number', false],
            ['Joining Date', 'joining_date', 'date', false]].map(([l, k, t, r]) => (
            <div key={k}>
              <label className="block text-sm font-medium mb-1">{l}</label>
              <input type={t} required={r} value={form[k]} onChange={e => set(k, e.target.value)} className="input-field" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1">Designation</label>
            <select value={form.designation} onChange={e => set('designation', e.target.value)} className="select-field">
              <option value="">Select designation</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Employment Type</label>
            <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className="select-field">
              {['full-time', 'part-time', 'visiting', 'contract'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Adding...' : 'Add Faculty'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Shared designations from MSRIM Excel ─────────────────────────────────────
const DESIGNATIONS = [
  'Adjunct Faculty','Admission Co-Ordinator','Admissions Counselor',
  'Assistant Librarian','Assistant Professor','Assistant Registrar',
  'Associate Professor','Attender - Evaluation','Attender Library',
  'Chairperson & Professor','Chairperson and Associate Professor',
  'Chairperson and Senior Assistant Professor','Chief of Examination',
  'Computer Lab Assistant','Digital Marketing Executive','Driver',
  'Executive Assistant','Head - Ramaiah Japan Center','Head Admissions',
  'Head Placements & Corporate Relations','Librarian','Library Assistant',
  'Manager - Accounts & Administration','Manager Admin',
  'Office Assistant - Accounts','Office Assistant - Admin',
  'Office Assistant - Evaluation','Placement Executive',
  'Placements – Senior Executive','Professor','Professor and Dean',
  'Receptionist','Security Officer','Senior Assistant Professor',
  'Site Engineer','Sweeper','Watchman',
];

// ── Edit Faculty Modal ────────────────────────────────────────────────────────
function EditFacultyModal({ faculty: f, onClose }) {
  const [form, setForm] = useState({
    name:             f.name || '',
    email:            f.email || '',
    phone:            f.phone || '',
    designation:      f.designation || '',
    qualification:    f.qualification || '',
    specialization:   f.specialization || '',
    experience_years: f.experience_years || 0,
    employment_type:  f.employment_type || 'full-time',
    department_id:    f.department_id || '',
  });
  const [depts,   setDepts]   = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    api.get('/structure/departments').then(r => setDepts(r.data)).catch(() => {});
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/faculty/${f.id}`, form);
      toast.success('Faculty updated successfully');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-xl">Edit Faculty</h2>
            <p className="text-sm text-gray-500 mt-0.5">{f.name} · {f.employee_id}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="Mobile number" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <select value={form.designation} onChange={e => set('designation', e.target.value)} className="select-field">
              <option value="">Select designation</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select value={form.department_id} onChange={e => set('department_id', e.target.value)} className="select-field">
              <option value="">Select department</option>
              {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
            <input type="number" min="0" value={form.experience_years} onChange={e => set('experience_years', parseInt(e.target.value) || 0)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
            <input value={form.qualification} onChange={e => set('qualification', e.target.value)} className="input-field" placeholder="e.g. Ph.D, MBA" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
            <input value={form.specialization} onChange={e => set('specialization', e.target.value)} className="input-field" placeholder="e.g. Finance, Marketing" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
            <select value={form.employment_type} onChange={e => set('employment_type', e.target.value)} className="select-field">
              {['full-time','part-time','visiting','adjunct','contract'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Staff Modal ──────────────────────────────────────────────────────────
function EditStaffModal({ staff: s, onClose }) {
  const [form, setForm] = useState({
    name:        s.name || '',
    email:       s.email || '',
    phone:       s.phone || '',
    department:  s.department || '',
    designation: s.designation || '',
    role:        s.role || 'registrar',
  });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const ROLES = ['admin','registrar','hod','faculty','librarian','accounts','placement'];
  const DEPTS = [
    'Administration','Admissions Department','Accounts Department',
    'Business Analytics & Data Science','Examination Department',
    'Finance, Banking & Insurance','HR & General Management',
    'International Affairs','IT Department','Library',
    'Marketing & International Business','Operations & Supply Chain Mgmt',
    'Placements & Corporate Relations',
  ];

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      await api.put(`/auth/users/${s.id}/profile`, {
        name: form.name, email: form.email, phone: form.phone,
        department: form.department, designation: form.designation,
      });
      if (form.role !== s.role) {
        await api.put(`/auth/users/${s.id}/role`, { role: form.role });
      }
      toast.success('Staff profile updated');
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-xl">Edit Staff Profile</h2>
            <p className="text-sm text-gray-500 mt-0.5 font-mono">{s.username}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
            <select value={form.designation} onChange={e => set('designation', e.target.value)} className="select-field">
              <option value="">Select designation</option>
              {DESIGNATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
            <select value={form.department} onChange={e => set('department', e.target.value)} className="select-field">
              <option value="">Select department</option>
              {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="select-field">
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
