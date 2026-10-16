import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Star } from 'lucide-react';

const ROLES = ['admin','faculty','student','hod','registrar','librarian','accounts','placement','parent','staff'];

export default function OBESettings() {
  const { user } = useAuth();
  const [access, setAccess] = useState({});
  const [saving, setSaving] = useState(false);

  const OBE_FEATURES = [
    { key:'obe_dashboard', label:'OBE Dashboard', desc:'View CO/PO attainment charts' },
    { key:'obe_edit', label:'Edit OBE Data', desc:'Update course outcomes and attainment' },
    { key:'obe_reports', label:'OBE Reports', desc:'Download attainment reports' },
    { key:'obe_settings', label:'OBE Configuration', desc:'Modify OBE settings and thresholds' },
  ];

  useEffect(() => {
    api.get('/institution/settings', { params: { category:'obe_access' } }).then(r => {
      const obe = r.data.obe_access || {};
      const initial = {};
      OBE_FEATURES.forEach(f => {
        ROLES.forEach(r => {
          initial[`${f.key}_${r}`] = obe[`${f.key}_${r}`]?.value === '1';
        });
      });
      setAccess(initial);
    });
  }, []);

  async function save() {
    setSaving(true);
    const settings = {};
    Object.entries(access).forEach(([k,v]) => { settings[k] = v ? '1' : '0'; });
    try {
      await api.put('/institution/settings', { category:'obe_access', settings });
      toast.success('OBE access settings saved.');
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  }

  if (!['admin','registrar'].includes(user.role)) return <div className="card p-8 text-center text-gray-400">Access restricted to Admin and Registrar.</div>;

  const displayRoles = ['admin','hod','faculty','student','registrar'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">OBE Access Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure which roles can access OBE features</p>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center gap-2"><Star className="w-4 h-4 text-msrim-blue" /><h3 className="font-semibold">Feature Access by Role</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Feature</th>
              {displayRoles.map(r => <th key={r} className="table-th text-center capitalize">{r}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {OBE_FEATURES.map(f => (
                <tr key={f.key} className="hover:bg-gray-50">
                  <td className="table-td">
                    <p className="font-medium text-sm">{f.label}</p>
                    <p className="text-xs text-gray-400">{f.desc}</p>
                  </td>
                  {displayRoles.map(r => (
                    <td key={r} className="table-td text-center">
                      <input type="checkbox" checked={!!access[`${f.key}_${r}`]}
                        onChange={e => setAccess(a => ({ ...a, [`${f.key}_${r}`]: e.target.checked }))}
                        className="w-4 h-4 cursor-pointer" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Access Settings'}
        </button>
      </div>
    </div>
  );
}
