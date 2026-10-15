import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  KeyRound, Users, Shield, Eye, EyeOff, Save, Search, RefreshCw,
  UserCheck, UserX, Lock, Unlock, AlertTriangle, CheckCircle,
  Settings, ChevronDown, X, Edit2, Trash2
} from 'lucide-react';

const ROLE_COLORS = {
  admin:     'bg-red-100 text-red-700 border-red-200',
  registrar: 'bg-purple-100 text-purple-700 border-purple-200',
  hod:       'bg-blue-100 text-blue-700 border-blue-200',
  faculty:   'bg-green-100 text-green-700 border-green-200',
  student:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  librarian: 'bg-pink-100 text-pink-700 border-pink-200',
  accounts:  'bg-indigo-100 text-indigo-700 border-indigo-200',
  placement: 'bg-orange-100 text-orange-700 border-orange-200',
};

const ROLES = ['admin','registrar','hod','faculty','student','librarian','accounts','placement'];

export default function AdminPrivileges() {
  const { user: currentUser } = useAuth();
  const [tab, setTab]         = useState('users');
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser]     = useState(null);
  const [resetUser, setResetUser]   = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/auth/users');
      setUsers(r.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = users.filter(u => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (search && !u.name?.toLowerCase().includes(search.toLowerCase()) &&
        !u.username?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = ROLES.map(r => ({ role: r, count: users.filter(u => u.role === r).length })).filter(r => r.count > 0);

  async function toggleActive(u) {
    const action = u.is_active ? 'deactivate' : 'activate';
    if (!window.confirm(`${u.is_active ? 'Deactivate' : 'Activate'} account for ${u.name}?`)) return;
    try {
      await api.put(`/auth/users/${u.id}/toggle-active`);
      toast.success(`Account ${action}d`);
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  async function changeRole(userId, newRole) {
    try {
      await api.put(`/auth/users/${userId}/role`, { role: newRole });
      toast.success('Role updated');
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-msrim-blue" /> Admin Privileges
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage user accounts, roles, access and passwords</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Refresh</button>
      </div>

      {/* Role stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {stats.map(s => (
          <button key={s.role} onClick={() => setRoleFilter(r => r === s.role ? '' : s.role)}
            className={`card p-3 text-center transition-all hover:shadow-md ${roleFilter === s.role ? 'ring-2 ring-msrim-blue' : ''}`}>
            <p className="text-xl font-bold text-msrim-blue">{s.count}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium border capitalize ${ROLE_COLORS[s.role] || 'bg-gray-100 text-gray-600'}`}>{s.role}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[['users','All Users'],['inactive','Inactive Accounts']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>
            {label}{id==='inactive' && <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{users.filter(u=>!u.is_active).length}</span>}
          </button>
        ))}
      </div>

      {/* Search & filter */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input-field pl-9" placeholder="Search by name or username..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-field w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || roleFilter) && <button onClick={() => { setSearch(''); setRoleFilter(''); }} className="btn-secondary text-sm">Clear</button>}
        <span className="self-center text-sm text-gray-500">{filtered.length} users</span>
      </div>

      {/* Users table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="table-th">User</th>
              <th className="table-th">Username</th>
              <th className="table-th">Role</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="py-10 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : (tab === 'inactive' ? filtered.filter(u => !u.is_active) : filtered).map(u => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.is_active ? 'opacity-60' : ''}`}>
                <td className="table-td">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${u.is_active ? 'bg-msrim-blue' : 'bg-gray-400'}`}>
                      {u.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="table-td font-mono text-xs text-gray-500">{u.username}</td>
                <td className="table-td">
                  {u.id === currentUser.id ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${ROLE_COLORS[u.role] || ''}`}>{u.role}</span>
                  ) : (
                    <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
                      className={`text-xs font-medium border rounded-full px-2 py-0.5 capitalize cursor-pointer focus:outline-none focus:ring-1 focus:ring-msrim-blue ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  )}
                </td>
                <td className="table-td">
                  <span className={`flex items-center gap-1 text-xs font-medium w-fit px-2 py-0.5 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {u.is_active ? <><CheckCircle className="w-3 h-3" />Active</> : <><AlertTriangle className="w-3 h-3" />Inactive</>}
                  </span>
                </td>
                <td className="table-td">
                  <div className="flex items-center gap-1.5">
                    {u.id !== currentUser.id && (
                      <button onClick={() => toggleActive(u)} title={u.is_active ? 'Deactivate account' : 'Activate account'}
                        className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors ${u.is_active ? 'border-yellow-300 text-yellow-700 hover:bg-yellow-50' : 'border-green-300 text-green-700 hover:bg-green-50'}`}>
                        {u.is_active ? <><UserX className="w-3 h-3" />Deactivate</> : <><UserCheck className="w-3 h-3" />Activate</>}
                      </button>
                    )}
                    <button onClick={() => setResetUser(u)} title="Reset password"
                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium transition-colors">
                      <Lock className="w-3 h-3" /> Reset Password
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="text-center py-10 text-gray-400">No users found</p>
        )}
      </div>

      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => { setResetUser(null); load(); }} />}
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const strength = (p) => {
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const s = strength(form.password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][s];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][s];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.put(`/auth/users/${user.id}/reset-password`, { password: form.password });
      toast.success(`Password reset for ${user.name}`);
      onClose();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-bold text-xl">Reset Password</h2>
            <p className="text-sm text-gray-500 mt-0.5">{user.name} · <span className="font-mono">{user.username}</span></p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
            <div className="relative">
              <input required type={show ? 'text' : 'password'} value={form.password} onChange={e => set('password', e.target.value)}
                className="input-field pr-10" placeholder="Enter new password" />
              <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= s ? strengthColor : 'bg-gray-200'} transition-all`} />)}
                </div>
                <p className={`text-xs mt-1 ${['','text-red-500','text-yellow-600','text-blue-600','text-green-600'][s]}`}>{strengthLabel} password</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
            <input required type={show ? 'text' : 'password'} value={form.confirm} onChange={e => set('confirm', e.target.value)}
              className={`input-field ${form.confirm && form.confirm !== form.password ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Confirm new password" />
            {form.confirm && form.confirm !== form.password && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
            {form.confirm && form.confirm === form.password && form.confirm.length > 0 && <p className="text-xs text-green-600 mt-1">✓ Passwords match</p>}
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>The user will be required to use this new password on their next login. Make sure to share it securely.</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading || form.password !== form.confirm} className="btn-primary disabled:opacity-50">
              <Lock className="w-4 h-4" />{loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
