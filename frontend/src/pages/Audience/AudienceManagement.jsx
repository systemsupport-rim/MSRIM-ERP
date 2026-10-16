import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Users, Target, Edit2, Trash2 } from 'lucide-react';

const TYPE_COLORS = { custom:'badge-blue', 'role-based':'badge-green', 'program-based':'badge-yellow', 'department-based':'bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium' };

export default function AudienceManagement() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', description:'', type:'custom', criteria:{} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/audience'),
      api.get('/structure/programs').catch(() => ({ data: [] })),
    ]).then(([g, p]) => {
      setGroups(g.data); setPrograms(p.data);
    }).finally(() => setLoading(false));
  }, []);

  async function create() {
    if (!form.name) return toast.error('Name required.');
    try {
      const res = await api.post('/audience', form);
      toast.success(`Audience group created. ${res.data.member_count} members.`);
      setShowForm(false);
      setForm({ name:'', description:'', type:'custom', criteria:{} });
      const r = await api.get('/audience');
      setGroups(r.data);
    } catch { toast.error('Failed.'); }
  }

  async function del(id) {
    if (!confirm('Delete this audience group?')) return;
    await api.delete(`/audience/${id}`);
    toast.success('Deleted.');
    const r = await api.get('/audience');
    setGroups(r.data);
  }

  async function toggle(id, is_active) {
    await api.put(`/audience/${id}`, { is_active: !is_active });
    const r = await api.get('/audience');
    setGroups(r.data);
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);

  const ROLES = ['admin','faculty','staff','student','hod','registrar','librarian','accounts','placement','parent'];

  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Audience Management</h1>
          <p className="text-gray-500 text-sm mt-1">Create audience groups for targeted notifications and communications</p>
        </div>
        {canManage && <button onClick={() => setShowForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Group</button>}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Groups', groups.length, 'text-msrim-blue'],
          ['Active', groups.filter(g=>g.is_active).length, 'text-green-600'],
          ['Total Reach', groups.reduce((a,g)=>a+g.member_count,0), 'text-orange-600'],
          ['Role-based', groups.filter(g=>g.type==='role-based').length, 'text-purple-600'],
        ].map(([l,v,c]) => (
          <div key={l} className="card p-4"><p className="text-gray-400 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => {
          const criteria = typeof g.criteria === 'string' ? JSON.parse(g.criteria || '{}') : (g.criteria || {});
          return (
            <div key={g.id} className={`card p-4 ${!g.is_active?'opacity-60':''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  <div className="p-2 bg-msrim-blue/10 rounded-xl flex-shrink-0"><Users className="w-4 h-4 text-msrim-blue" /></div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm truncate">{g.name}</h3>
                    <span className={TYPE_COLORS[g.type]||'badge-gray'}>{g.type.replace('-',' ')}</span>
                    {g.description && <p className="text-xs text-gray-400 mt-1 truncate">{g.description}</p>}
                    {criteria.role && <p className="text-xs text-gray-500 mt-0.5">Role: {criteria.role}</p>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-msrim-blue">{g.member_count}</p>
                  <p className="text-xs text-gray-400">members</p>
                </div>
              </div>
              {canManage && (
                <div className="mt-3 pt-3 border-t flex gap-2">
                  <button onClick={() => toggle(g.id, g.is_active)} className={`text-xs px-2 py-1 rounded-lg ${g.is_active?'bg-green-50 text-green-700':'bg-gray-100 text-gray-500'}`}>{g.is_active?'Active':'Inactive'}</button>
                  <button onClick={() => del(g.id)} className="text-xs p-1 text-red-400 hover:text-red-600 ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )}
            </div>
          );
        })}
        {!groups.length && <div className="col-span-3 card p-8 text-center text-gray-400">No audience groups. Create one to start targeting communications.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">New Audience Group</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Group Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Description</label><input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="input-field" /></div>
              <div><label className="block text-sm font-medium mb-1">Type</label>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value,criteria:{}}))} className="select-field">
                  {['custom','role-based','program-based','department-based'].map(t=><option key={t} value={t}>{t.replace('-',' ')}</option>)}
                </select>
              </div>
              {form.type === 'role-based' && (
                <div><label className="block text-sm font-medium mb-1">Role</label>
                  <select value={form.criteria.role||''} onChange={e=>setForm(f=>({...f,criteria:{role:e.target.value}}))} className="select-field">
                    <option value="">Select role…</option>
                    {ROLES.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              )}
              {form.type === 'program-based' && (
                <div><label className="block text-sm font-medium mb-1">Program</label>
                  <select value={form.criteria.program_id||''} onChange={e=>setForm(f=>({...f,criteria:{program_id:e.target.value}}))} className="select-field">
                    <option value="">Select program…</option>
                    {programs.map(p=><option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={create} className="btn-primary flex-1">Create Group</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
