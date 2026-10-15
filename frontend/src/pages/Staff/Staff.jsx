import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, X, Edit2, UserX, UserCheck, Save } from 'lucide-react';
import { DESIGNATIONS } from '../Faculty/Faculty';

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
};

export default function Staff() {
  const { user } = useAuth();
  const [staff,      setStaff]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [selected,   setSelected]   = useState(null);
  const [editing,    setEditing]    = useState(null);
  const canManage = ['admin', 'registrar'].includes(user.role);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const res = canManage ? await api.get('/auth/users') : { data: [] };
      setStaff(res.data
        .filter(u => !['student', 'faculty'].includes(u.role))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      );
    } finally { setLoading(false); }
  }

  const depts = [...new Set(staff.map(s => s.department).filter(Boolean))].sort();
  const filtered = staff.filter(s => {
    const matchSearch = !search ||
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.department?.toLowerCase().includes(search.toLowerCase()) ||
      s.designation?.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || s.department === deptFilter;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Administration Staff</h1>
          <p className="text-gray-500 text-sm mt-1">{filtered.length} staff members</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 flex-1 min-w-48 max-w-sm">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search staff, designation or department..."
            className="bg-transparent text-sm outline-none w-full" />
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="select-field w-56">
          <option value="">All Departments</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12">
            <div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className={`card hover:shadow-md transition-shadow ${!s.is_active ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-4 cursor-pointer" onClick={() => setSelected(s)}>
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

            {s.designation && <p className="text-xs text-msrim-blue font-medium mt-2 truncate">{s.designation}</p>}

            <div className="mt-2 space-y-1">
              {s.email      && <p className="text-xs text-gray-400 truncate">✉ {s.email}</p>}
              {s.phone      && <p className="text-xs text-gray-400">📞 {s.phone}</p>}
              {s.employee_id && <p className="text-xs text-gray-400 font-mono">ID: {s.employee_id}</p>}
              {s.joining_date && <p className="text-xs text-gray-400">Joined: {s.joining_date}</p>}
            </div>

            {canManage && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 flex-wrap">
                <button onClick={() => setEditing(s)}
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
        {!loading && filtered.length === 0 && (
          <div className="col-span-3 card text-center py-12 text-gray-400">No administration staff found</div>
        )}
      </div>

      {selected && (
        <StaffDetailModal staff={selected} canManage={canManage} onClose={() => { setSelected(null); fetchAll(); }}
          onEdit={s => { setSelected(null); setEditing(s); }} />
      )}
      {editing && (
        <EditStaffModal staff={editing} onClose={() => { setEditing(null); fetchAll(); }} />
      )}
    </div>
  );
}

// ── Staff Detail Modal ────────────────────────────────────────────────────────
function StaffDetailModal({ staff: s, onClose, canManage, onEdit }) {
  const fields = [
    ['Employee ID',  s.employee_id],
    ['Email',        s.email],
    ['Phone',        s.phone],
    ['Department',   s.department],
    ['Designation',  s.designation],
    ['Gender',       s.gender],
    ['Joining Date', s.joining_date],
    ['Role',         s.role],
    ['Username',     s.username],
    ['Status',       s.is_active ? 'Active' : 'Inactive'],
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${ROLE_AVATAR[s.role] || 'bg-gray-500'}`}>
              {s.name?.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-xl">{s.name}</h2>
              <p className="text-sm text-gray-500">{s.designation || s.role} · {s.department || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button onClick={() => onEdit(s)} className="btn-secondary p-2" title="Edit"><Edit2 className="w-4 h-4" /></button>
            )}
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {fields.map(([label, value]) => value ? (
            <div key={label}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm font-medium text-gray-800 mt-0.5 capitalize">{value}</p>
            </div>
          ) : null)}
        </div>
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
