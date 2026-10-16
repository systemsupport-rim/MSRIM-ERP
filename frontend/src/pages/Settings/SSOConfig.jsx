import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Shield, Key, AlertTriangle } from 'lucide-react';

export default function SSOConfig() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ enabled:'0', provider:'', client_id:'', tenant_id:'' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/institution/settings', { params: { category:'sso' } }).then(r => {
      const sso = r.data.sso || {};
      setSettings({ enabled: sso.enabled?.value||'0', provider: sso.provider?.value||'', client_id: sso.client_id?.value||'', tenant_id: sso.tenant_id?.value||'' });
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put('/institution/settings', { category:'sso', settings });
      toast.success('SSO configuration saved.');
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  }

  if (!['admin'].includes(user.role)) return <div className="card p-8 text-center text-gray-400">Access restricted to Admin only.</div>;
  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">SSO Configuration</h1>
        <p className="text-gray-500 text-sm mt-1">Configure Single Sign-On with Google, Microsoft or LDAP</p>
      </div>

      <div className="card p-5 bg-amber-50 border-amber-200 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">SSO changes affect all users. Test in a staging environment before enabling in production. Incorrect configuration can lock out all users.</p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 rounded-xl"><Shield className="w-4 h-4 text-blue-600" /></div>
          <h3 className="font-semibold">SSO Settings</h3>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <input type="checkbox" id="sso-enabled" checked={settings.enabled === '1'} onChange={e=>setSettings(s=>({...s,enabled:e.target.checked?'1':'0'}))} className="w-4 h-4" />
          <label htmlFor="sso-enabled" className="font-medium text-sm cursor-pointer">Enable SSO Authentication</label>
          {settings.enabled === '1' && <span className="badge-green ml-2">Enabled</span>}
        </div>

        <div><label className="block text-sm font-medium mb-1">Provider</label>
          <select value={settings.provider} onChange={e=>setSettings(s=>({...s,provider:e.target.value}))} className="select-field w-64">
            <option value="">Select provider…</option>
            <option value="google">Google Workspace</option>
            <option value="microsoft">Microsoft Azure AD</option>
            <option value="ldap">LDAP / Active Directory</option>
          </select>
        </div>

        {settings.provider && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Client ID / App ID</label>
              <input value={settings.client_id} onChange={e=>setSettings(s=>({...s,client_id:e.target.value}))} className="input-field font-mono" placeholder="your-client-id" />
            </div>
            {settings.provider === 'microsoft' && (
              <div><label className="block text-sm font-medium mb-1">Tenant ID</label>
                <input value={settings.tenant_id} onChange={e=>setSettings(s=>({...s,tenant_id:e.target.value}))} className="input-field font-mono" placeholder="your-tenant-id" />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save SSO Config'}
          </button>
        </div>
      </div>
    </div>
  );
}
