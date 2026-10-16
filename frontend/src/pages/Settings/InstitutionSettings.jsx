import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Building2 } from 'lucide-react';

export default function InstitutionSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/institution/settings', { params: { category:'institution' } }).then(r => {
      const inst = r.data.institution || {};
      setSettings({ name: inst.name?.value||'', short_name: inst.short_name?.value||'', address: inst.address?.value||'', phone: inst.phone?.value||'', email: inst.email?.value||'', website: inst.website?.value||'', affiliation: inst.affiliation?.value||'', accreditation: inst.accreditation?.value||'' });
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    if (!['admin'].includes(user.role)) return toast.error('Only admins can change institution settings.');
    setSaving(true);
    try {
      await api.put('/institution/settings', { category:'institution', settings });
      toast.success('Institution settings saved.');
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  }

  if (!['admin'].includes(user.role)) return <div className="card p-8 text-center text-gray-400">Access restricted to Admin only.</div>;
  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  const fields = [
    ['name','Institution Name','text'],['short_name','Short Name','text'],
    ['address','Address','textarea'],['phone','Phone','text'],
    ['email','Email','email'],['website','Website','url'],
    ['affiliation','Affiliation / University','text'],['accreditation','Accreditation','text'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Institution Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure institution profile, contact and accreditation details</p>
      </div>

      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-msrim-blue/10 rounded-xl"><Building2 className="w-5 h-5 text-msrim-blue" /></div>
          <h3 className="font-semibold">Institution Profile</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map(([key, label, type]) => (
            <div key={key} className={type === 'textarea' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              {type === 'textarea' ? (
                <textarea value={settings[key]||''} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))} className="input-field" rows={3} />
              ) : (
                <input type={type} value={settings[key]||''} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))} className="input-field" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
