import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Video, Users, FileText, TrendingUp, Cloud, Monitor, AlertTriangle } from 'lucide-react';

const INTEGRATIONS = [
  {
    id: 'zoom', label: 'Zoom', icon: Video, color: 'text-blue-600 bg-blue-50',
    desc: 'Configure Zoom for virtual classes and webinars',
    fields: [
      { key:'zoom_api_key',    label:'API Key',     type:'text',     placeholder:'Your Zoom API Key' },
      { key:'zoom_secret',     label:'API Secret',  type:'password', placeholder:'Your Zoom API Secret' },
    ]
  },
  {
    id: 'extraaedge', label: 'Extraaedge', icon: TrendingUp, color: 'text-orange-600 bg-orange-50',
    desc: 'CRM integration for admissions and lead management',
    fields: [
      { key:'extraaedge_key',  label:'API Key',     type:'text',     placeholder:'Extraaedge API Key' },
    ]
  },
  {
    id: 'npf', label: 'No Paper Forms', icon: FileText, color: 'text-green-600 bg-green-50',
    desc: 'Digital form submissions and e-signatures',
    fields: [
      { key:'npf_api_key',     label:'API Key',     type:'text',     placeholder:'NPF API Key' },
    ]
  },
  {
    id: 'leadsquared', label: 'LeadSquared', icon: Users, color: 'text-purple-600 bg-purple-50',
    desc: 'Lead management and marketing automation',
    fields: [
      { key:'leadsquared_host',label:'Host URL',    type:'url',      placeholder:'https://api.leadsquared.com' },
      { key:'leadsquared_key', label:'Access Key',  type:'text',     placeholder:'Your LeadSquared Access Key' },
    ]
  },
  {
    id: 'salesforce', label: 'Salesforce', icon: Cloud, color: 'text-sky-600 bg-sky-50',
    desc: 'CRM and student relationship management',
    fields: [
      { key:'salesforce_instance', label:'Instance URL', type:'url',  placeholder:'https://your-org.salesforce.com' },
    ]
  },
  {
    id: 'seb', label: 'SEB', icon: Monitor, color: 'text-red-600 bg-red-50',
    desc: 'Safe Exam Browser for secure online examinations',
    fields: [
      { key:'seb_config', label:'Config Hash / URL', type:'text',    placeholder:'SEB configuration hash' },
    ]
  },
];

export default function Integrations() {
  const { user } = useAuth();
  const [tab, setTab] = useState('zoom');
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/institution/settings', { params: { category:'integrations' } }).then(r => {
      const int = r.data.integrations || {};
      const flat = {};
      Object.entries(int).forEach(([k,v]) => { flat[k] = v.value || ''; });
      setSettings(flat);
    }).finally(() => setLoading(false));
  }, []);

  async function save(intId) {
    const integration = INTEGRATIONS.find(i => i.id === intId);
    if (!integration) return;
    const relevant = {};
    integration.fields.forEach(f => { relevant[f.key] = settings[f.key] || ''; });
    setSaving(true);
    try {
      await api.put('/institution/settings', { category:'integrations', settings: relevant });
      toast.success(`${integration.label} settings saved.`);
    } catch { toast.error('Failed to save.'); }
    finally { setSaving(false); }
  }

  const active = INTEGRATIONS.find(i => i.id === tab);

  if (!['admin'].includes(user.role)) return <div className="card p-8 text-center text-gray-400">Access restricted to Admin only.</div>;
  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const isConfigured = (int) => int.fields.some(f => settings[f.key]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-gray-500 text-sm mt-1">Configure third-party service integrations</p>
      </div>

      <div className="card p-5 bg-amber-50 border-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">API keys and secrets are stored in the database. Ensure your server is secured with HTTPS and access is restricted to authorised personnel only.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {INTEGRATIONS.map(int => {
          const configured = isConfigured(int);
          return (
            <button key={int.id} onClick={() => setTab(int.id)}
              className={`card p-4 text-center cursor-pointer hover:shadow-md transition-all ${tab===int.id?'ring-2 ring-msrim-blue':''}`}>
              <div className={`w-10 h-10 rounded-xl ${int.color} flex items-center justify-center mx-auto mb-2`}>
                <int.icon className="w-5 h-5" />
              </div>
              <p className="font-medium text-sm">{int.label}</p>
              <p className={`text-xs mt-0.5 ${configured?'text-green-600':'text-gray-400'}`}>{configured?'Configured':'Not set'}</p>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${active.color}`}><active.icon className="w-5 h-5" /></div>
            <div>
              <h3 className="font-bold text-lg">{active.label}</h3>
              <p className="text-gray-400 text-sm">{active.desc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.fields.map(field => (
              <div key={field.key}>
                <label className="block text-sm font-medium mb-1">{field.label}</label>
                <input
                  type={field.type}
                  value={settings[field.key] || ''}
                  onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                  className="input-field font-mono"
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={() => save(tab)} disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" /> {saving ? 'Saving…' : `Save ${active.label} Settings`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
