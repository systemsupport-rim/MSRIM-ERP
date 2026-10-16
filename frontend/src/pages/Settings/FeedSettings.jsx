import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Megaphone } from 'lucide-react';

export default function FeedSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ max_posts_per_day:'10', moderation_enabled:'1', allow_student_posts:'1' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/institution/settings', { params: { category:'feed' } }).then(r => {
      const feed = r.data.feed || {};
      setSettings({ max_posts_per_day: feed.max_posts_per_day?.value||'10', moderation_enabled: feed.moderation_enabled?.value||'1', allow_student_posts: feed.allow_student_posts?.value||'1' });
    }).finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put('/institution/settings', { category:'feed', settings });
      toast.success('Feed settings saved.');
    } catch { toast.error('Failed.'); }
    finally { setSaving(false); }
  }

  if (!['admin'].includes(user.role)) return <div className="card p-8 text-center text-gray-400">Access restricted to Admin only.</div>;
  if (loading) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Feed Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Configure Feed & Booths posting rules and moderation</p>
      </div>
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2"><Megaphone className="w-5 h-5 text-msrim-blue" /><h3 className="font-semibold">Feed Configuration</h3></div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Posts Per Day (per user)</label>
          <input type="number" min="1" max="100" value={settings.max_posts_per_day} onChange={e=>setSettings(s=>({...s,max_posts_per_day:e.target.value}))} className="input-field w-32" />
        </div>
        <div className="space-y-3">
          {[['moderation_enabled','Enable Post Moderation','All posts require admin/faculty approval before going live'],['allow_student_posts','Allow Student Posts','Students can create posts in the feed']].map(([key,label,desc]) => (
            <label key={key} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input type="checkbox" checked={settings[key]==='1'} onChange={e=>setSettings(s=>({...s,[key]:e.target.checked?'1':'0'}))} className="w-4 h-4 mt-0.5" />
              <div><p className="font-medium text-sm">{label}</p><p className="text-xs text-gray-400">{desc}</p></div>
            </label>
          ))}
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={save} disabled={saving} className="btn-primary"><Save className="w-4 h-4" />{saving?'Saving…':'Save Settings'}</button>
        </div>
      </div>
    </div>
  );
}
