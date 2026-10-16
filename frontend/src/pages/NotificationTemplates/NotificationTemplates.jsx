import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Edit2, Mail, MessageSquare, Bell, Smartphone } from 'lucide-react';

const TYPE_ICONS = { email: Mail, sms: MessageSquare, push: Bell, 'in-app': Smartphone };
const TYPE_COLORS = { email:'badge-blue', sms:'badge-green', push:'badge-yellow', 'in-app':'badge-gray' };

export default function NotificationTemplates() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [filterType, setFilterType] = useState('');
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:'', type:'email', event_key:'', subject:'', body:'' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notification-templates', { params: filterType ? { type: filterType } : {} })
      .then(r => setTemplates(r.data)).finally(() => setLoading(false));
  }, [filterType]);

  async function save() {
    if (!form.name || !form.body) return toast.error('Name and body are required.');
    try {
      if (editing) { await api.put(`/notification-templates/${editing}`, form); toast.success('Updated.'); }
      else { await api.post('/notification-templates', form); toast.success('Template created.'); }
      setEditing(null); setShowForm(false);
      setForm({ name:'', type:'email', event_key:'', subject:'', body:'' });
      const r = await api.get('/notification-templates');
      setTemplates(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  async function toggleActive(id, is_active) {
    await api.put(`/notification-templates/${id}`, { is_active: !is_active });
    const r = await api.get('/notification-templates');
    setTemplates(r.data);
  }

  function startEdit(t) {
    setForm({ name: t.name, type: t.type, event_key: t.event_key||'', subject: t.subject||'', body: t.body });
    setEditing(t.id); setShowForm(true);
  }

  const canManage = ['admin','registrar'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Notification Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Email, SMS, push and in-app notification templates</p>
        </div>
        {canManage && <button onClick={() => { setEditing(null); setForm({ name:'', type:'email', event_key:'', subject:'', body:'' }); setShowForm(true); }} className="btn-primary"><Plus className="w-4 h-4" /> New Template</button>}
      </div>

      <div className="flex gap-2">
        {['','email','sms','push','in-app'].map(t => (
          <button key={t} onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterType===t?'bg-msrim-blue text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <div className="col-span-2 p-8 text-center text-gray-400">Loading…</div> : templates.map(t => {
          const Icon = TYPE_ICONS[t.type] || Bell;
          return (
            <div key={t.id} className={`card p-4 ${!t.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-xl flex-shrink-0"><Icon className="w-4 h-4 text-gray-600" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-sm">{t.name}</h3>
                      <span className={TYPE_COLORS[t.type]||'badge-gray'}>{t.type}</span>
                      {!t.is_active && <span className="badge-gray">Inactive</span>}
                    </div>
                    {t.event_key && <p className="text-xs text-gray-400 font-mono mt-0.5">{t.event_key}</p>}
                    {t.subject && <p className="text-xs text-gray-500 mt-1">Subject: {t.subject}</p>}
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.body}</p>
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEdit(t)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => toggleActive(t.id, t.is_active)} className={`p-1.5 rounded-lg ${t.is_active?'text-green-600 hover:bg-green-50':'text-gray-400 hover:bg-gray-50'}`}>
                      {t.is_active ? '●' : '○'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {!loading && !templates.length && <div className="col-span-2 card p-8 text-center text-gray-400">No templates found.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-lg">{editing ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-sm font-medium mb-1">Name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" placeholder="e.g. Admission Confirmation Email" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="select-field">
                    {['email','sms','push','in-app'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Event Key</label>
                  <input value={form.event_key} onChange={e=>setForm(f=>({...f,event_key:e.target.value}))} className="input-field font-mono text-sm" placeholder="admission.confirmed" />
                </div>
              </div>
              {(form.type === 'email') && <div><label className="block text-sm font-medium mb-1">Subject</label><input value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))} className="input-field" placeholder="Email subject line" /></div>}
              <div><label className="block text-sm font-medium mb-1">Body * <span className="text-gray-400 text-xs font-normal">Use {'{{variable}}'} for dynamic values</span></label>
                <textarea value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} className="input-field font-mono text-sm" rows={6} placeholder={'Dear {{name}},\n\nYour admission has been confirmed...'} />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-2">
              <button onClick={save} className="btn-primary flex-1">{editing?'Update':'Create'}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
