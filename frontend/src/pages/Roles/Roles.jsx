import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { Shield, Plus, Trash2, Edit2, Check, X, Save, AlertTriangle, Lock, ChevronDown, ChevronRight, Search, Users, CheckSquare, Square } from 'lucide-react';
import toast from 'react-hot-toast';

// Privilege catalogue grouped by module category
const PRIVILEGE_GROUPS = [
  { label: 'Academic', color: 'blue', privileges: ['Academic Management','Course Registration','Curriculum Management','Timetable Management','LMS Management','OBE Dashboard','Mentor Management','Degree Management'] },
  { label: 'Examinations', color: 'violet', privileges: ['Examination Management','EMS Question Bank','EMS Result Declaration','Exam Enrollment Management','Certificates Management'] },
  { label: 'Admissions & Students', color: 'green', privileges: ['Admission Management','Student Records','Parent Management','Scholarship Management'] },
  { label: 'Finance & Fees', color: 'emerald', privileges: ['Academic Fee Management','Fee Management','Inventory Management'] },
  { label: 'HR & Attendance', color: 'teal', privileges: ['HR Management','Leave Management','Staff Attendance','Bulk Attendance','Attendance Console'] },
  { label: 'Faculty & Staff', color: 'cyan', privileges: ['Faculty Records Management','Access Management','User Management'] },
  { label: 'Campus Life', color: 'orange', privileges: ['Placement Management','Library Management','Hostel Management','Infrastructure Management','Venue Booking','Transport Management','Gate Pass Management','Visitor Management','ID Card Configuration'] },
  { label: 'Communication', color: 'rose', privileges: ['Notices','Feedback Management','Survey Management','Post Moderation','Content Management'] },
  { label: 'Quality & Research', color: 'amber', privileges: ['NAAC Management','Research Management'] },
  { label: 'System', color: 'slate', privileges: ['Roles and Privileges','Drive'] },
];

const ALL_PRIVILEGES = PRIVILEGE_GROUPS.flatMap(g => g.privileges);

const BUILT_IN = ['admin','registrar','hod','faculty','student','accounts','librarian','placement','parent','staff'];

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  registrar: 'bg-blue-100 text-blue-700 border-blue-200',
  hod: 'bg-violet-100 text-violet-700 border-violet-200',
  faculty: 'bg-green-100 text-green-700 border-green-200',
  student: 'bg-amber-100 text-amber-700 border-amber-200',
  accounts: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  librarian: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  placement: 'bg-orange-100 text-orange-700 border-orange-200',
  parent: 'bg-pink-100 text-pink-700 border-pink-200',
  staff: 'bg-slate-100 text-slate-700 border-slate-200',
};

const GROUP_COLOR_MAP = {
  blue: { bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  violet: { bg: 'bg-violet-50', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  green: { bg: 'bg-green-50', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  emerald: { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  teal: { bg: 'bg-teal-50', badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  cyan: { bg: 'bg-cyan-50', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
  orange: { bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  rose: { bg: 'bg-rose-50', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  amber: { bg: 'bg-amber-50', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  slate: { bg: 'bg-slate-50', badge: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
};

export default function RolesPrivileges() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editPrivileges, setEditPrivileges] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(() => Object.fromEntries(PRIVILEGE_GROUPS.map(g => [g.label, true])));

  // Add Role modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePrivs, setNewRolePrivs] = useState([]);

  // Edit role name modal
  const [editingName, setEditingName] = useState(null);
  const [editNameVal, setEditNameVal] = useState('');

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadRoles = useCallback(async () => {
    try {
      const r = await api.get('/roles');
      setRoles(r.data);
      if (!selectedRole && r.data.length) {
        const first = r.data[0];
        setSelectedRole(first.role);
        setEditPrivileges(first.privileges.filter(p => p !== '__none__'));
      }
    } catch { toast.error('Failed to load roles'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const selectRole = (r) => {
    if (dirty) { if (!window.confirm('Discard unsaved changes?')) return; }
    setSelectedRole(r.role);
    setEditPrivileges(r.privileges.filter(p => p !== '__none__'));
    setDirty(false);
  };

  const togglePrivilege = (priv) => {
    setEditPrivileges(prev =>
      prev.includes(priv) ? prev.filter(p => p !== priv) : [...prev, priv]
    );
    setDirty(true);
  };

  const toggleGroup = (group) => {
    const groupPrivs = group.privileges;
    const allOn = groupPrivs.every(p => editPrivileges.includes(p));
    setEditPrivileges(prev =>
      allOn ? prev.filter(p => !groupPrivs.includes(p)) : [...new Set([...prev, ...groupPrivs])]
    );
    setDirty(true);
  };

  const savePrivileges = async () => {
    setSaving(true);
    try {
      await api.put(`/roles/${selectedRole}/privileges`, { privileges: editPrivileges });
      toast.success(`Saved privileges for ${selectedRole}`);
      setDirty(false);
      loadRoles();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
    setSaving(false);
  };

  const createRole = async () => {
    const name = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return toast.error('Role name required');
    try {
      await api.post('/roles', { role: name, privileges: newRolePrivs });
      toast.success(`Role "${name}" created`);
      setShowAddModal(false); setNewRoleName(''); setNewRolePrivs([]);
      await loadRoles();
      setSelectedRole(name); setEditPrivileges(newRolePrivs); setDirty(false);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const renameRole = async () => {
    const newName = editNameVal.trim().toLowerCase().replace(/\s+/g, '_');
    if (!newName) return toast.error('Name required');
    try {
      await api.patch(`/roles/${editingName}/rename`, { new_name: newName });
      toast.success('Role renamed');
      setEditingName(null);
      if (selectedRole === editingName) setSelectedRole(newName);
      loadRoles();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const deleteRole = async () => {
    try {
      await api.delete(`/roles/${deleteTarget}`);
      toast.success(`Role "${deleteTarget}" deleted`);
      setDeleteTarget(null);
      if (selectedRole === deleteTarget) { setSelectedRole(null); setEditPrivileges([]); }
      loadRoles();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
  };

  const currentRole = roles.find(r => r.role === selectedRole);
  const isBuiltIn = currentRole?.is_builtin ?? true;

  const filteredGroups = PRIVILEGE_GROUPS.map(g => ({
    ...g,
    privileges: search ? g.privileges.filter(p => p.toLowerCase().includes(search.toLowerCase())) : g.privileges,
  })).filter(g => g.privileges.length > 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading roles...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roles & Privileges</h1>
          <p className="text-gray-500 text-sm mt-1">Manage system roles and configure module-level access permissions</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* ── Role List ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1 bg-white rounded-2xl border flex flex-col">
          <div className="p-4 border-b">
            <p className="font-semibold text-gray-800 text-sm">System Roles</p>
            <p className="text-xs text-gray-400 mt-0.5">{roles.length} roles configured</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {roles.map(r => {
              const colorClass = ROLE_COLORS[r.role] || 'bg-indigo-100 text-indigo-700 border-indigo-200';
              const active = selectedRole === r.role;
              return (
                <div key={r.role}
                  onClick={() => selectRole(r)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${active ? 'bg-msrim-blue text-white shadow-md' : 'hover:bg-gray-50'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-xs uppercase border ${active ? 'bg-white/20 text-white border-white/30' : colorClass}`}>
                    {r.role.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium capitalize truncate ${active ? 'text-white' : 'text-gray-800'}`}>{r.role.replace(/_/g, ' ')}</p>
                    <p className={`text-xs ${active ? 'text-blue-200' : 'text-gray-400'}`}>
                      {r.privileges.filter(p => p !== '__none__').length} privileges
                      {r.is_builtin && <span className={`ml-1 ${active ? 'text-blue-200' : 'text-gray-400'}`}>· built-in</span>}
                    </p>
                  </div>
                  {!r.is_builtin && (
                    <div className={`flex gap-0.5 opacity-0 group-hover:opacity-100 ${active ? 'opacity-100' : ''}`} onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingName(r.role); setEditNameVal(r.role); }}
                        className={`p-1 rounded hover:bg-white/20 ${active ? 'text-white' : 'text-gray-400 hover:text-gray-600'}`}>
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => setDeleteTarget(r.role)}
                        className={`p-1 rounded hover:bg-red-100 ${active ? 'text-white hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}>
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {r.is_builtin && <Lock className={`w-3 h-3 flex-shrink-0 ${active ? 'text-blue-200' : 'text-gray-300'}`} />}
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t">
            <button onClick={() => setShowAddModal(true)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Add Custom Role
            </button>
          </div>
        </div>

        {/* ── Privileges Editor ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 bg-white rounded-2xl border flex flex-col">
          {selectedRole ? (
            <>
              {/* Editor header */}
              <div className="p-5 border-b flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-gray-900 capitalize text-lg">{selectedRole.replace(/_/g, ' ')}</h2>
                    {isBuiltIn
                      ? <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" />Built-in</span>
                      : <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">Custom</span>
                    }
                    {dirty && <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Unsaved</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{editPrivileges.length} of {ALL_PRIVILEGES.length} privileges enabled</p>
                </div>
                <div className="flex gap-2">
                  {dirty && (
                    <button onClick={() => { setEditPrivileges(currentRole?.privileges.filter(p => p !== '__none__') || []); setDirty(false); }}
                      className="btn-secondary text-sm flex items-center gap-1.5"><X className="w-4 h-4" />Discard</button>
                  )}
                  <button onClick={savePrivileges} disabled={!dirty || saving}
                    className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-all ${dirty ? 'bg-msrim-blue text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    <Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="px-5 pt-4 pb-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search privileges..." className="pl-9 pr-4 py-2 border rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Privilege groups */}
              <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-3">
                {filteredGroups.map(group => {
                  const c = GROUP_COLOR_MAP[group.color];
                  const groupEnabled = group.privileges.filter(p => editPrivileges.includes(p)).length;
                  const allOn = groupEnabled === group.privileges.length;
                  const someOn = groupEnabled > 0 && !allOn;
                  const expanded = expandedGroups[group.label];

                  return (
                    <div key={group.label} className="border rounded-xl overflow-hidden">
                      {/* Group header */}
                      <div className={`flex items-center justify-between px-4 py-2.5 cursor-pointer ${c.bg} select-none`}
                        onClick={() => setExpandedGroups(prev => ({ ...prev, [group.label]: !expanded }))}>
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                          <span className="font-medium text-sm text-gray-800">{group.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.badge}`}>
                            {groupEnabled}/{group.privileges.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); toggleGroup(group); }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white border text-gray-600 hover:text-gray-900 font-medium transition-colors">
                            {allOn ? 'Deselect all' : 'Select all'}
                          </button>
                          {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>

                      {/* Privileges grid */}
                      {expanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-1 p-3 bg-white">
                          {group.privileges.map(priv => {
                            const on = editPrivileges.includes(priv);
                            return (
                              <label key={priv}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all select-none ${on ? 'bg-green-50 hover:bg-green-100' : 'bg-gray-50 hover:bg-gray-100'}`}>
                                <div onClick={() => togglePrivilege(priv)}
                                  className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${on ? 'bg-green-500' : 'bg-white border-2 border-gray-300'}`}>
                                  {on && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className={`text-xs font-medium leading-tight ${on ? 'text-green-800' : 'text-gray-500'}`}>{priv}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                <p>Select a role to edit its privileges</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Role comparison table ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border">
        <div className="p-5 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Role Comparison Matrix</h3>
          <Users className="w-5 h-5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 w-48">Privilege</th>
                {roles.map(r => (
                  <th key={r.role} className="px-3 py-3 font-semibold text-gray-600 capitalize text-center whitespace-nowrap">
                    {r.role.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Academic Management','Examination Management','Fee Management','Attendance Console','Leave Management','LMS Management','Placement Management','Library Management','HR Management','Hostel Management','NAAC Management','Research Management','Roles and Privileges'].map(priv => (
                <tr key={priv} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{priv}</td>
                  {roles.map(r => {
                    const has = r.privileges.includes(priv);
                    return (
                      <td key={r.role} className="px-3 py-2.5 text-center">
                        {has
                          ? <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 rounded-full"><Check className="w-3 h-3 text-green-600" /></span>
                          : <span className="inline-flex items-center justify-center w-5 h-5 bg-gray-100 rounded-full"><X className="w-3 h-3 text-gray-300" /></span>
                        }
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Role Modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">Add Custom Role</h2>
              <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                  placeholder="e.g. exam_controller" className="input-field" />
                {newRoleName && <p className="text-xs text-gray-400 mt-1">Stored as: <span className="font-mono">{newRoleName.toLowerCase().replace(/\s+/g,'_')}</span></p>}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Starting Privileges</label>
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setNewRolePrivs([...ALL_PRIVILEGES])} className="text-blue-600 hover:underline">All</button>
                    <button onClick={() => setNewRolePrivs([])} className="text-gray-500 hover:underline">None</button>
                  </div>
                </div>
                <div className="space-y-1 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {PRIVILEGE_GROUPS.map(g => (
                    <div key={g.label}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1 py-1">{g.label}</p>
                      {g.privileges.map(p => (
                        <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={newRolePrivs.includes(p)} onChange={() => setNewRolePrivs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className="w-3.5 h-3.5" />
                          <span className="text-xs text-gray-700">{p}</span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{newRolePrivs.length} privileges selected</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={createRole} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Create Role</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ──────────────────────────────────────────────────── */}
      {editingName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">Rename Role</h2>
              <button onClick={() => setEditingName(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Name</label>
              <input value={editNameVal} onChange={e => setEditNameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && renameRole()}
                className="input-field" placeholder="New role name" autoFocus />
            </div>
            <div className="flex justify-end gap-2 p-5 border-t">
              <button onClick={() => setEditingName(null)} className="btn-secondary">Cancel</button>
              <button onClick={renameRole} className="btn-primary">Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="font-semibold text-gray-900 mb-1">Delete Role</h2>
              <p className="text-gray-500 text-sm">Are you sure you want to delete the <strong className="text-gray-800">"{deleteTarget}"</strong> role? This cannot be undone.</p>
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={deleteRole} className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors">Delete Role</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
