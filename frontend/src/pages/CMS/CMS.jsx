import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Plus, X, Edit2, Trash2, Eye, Send } from 'lucide-react';

const CATEGORIES = ['general','announcement','policy','banner','faq','other'];
const CAT_COLORS = { general:'badge-gray', announcement:'badge-blue', policy:'badge-yellow', banner:'bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-medium', faq:'badge-green', other:'badge-gray' };

export default function CMS() {
  const { user } = useAuth();
  const [content, setContent] = useState([]);
  const [filters, setFilters] = useState({ category:'', status:'' });
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', content:'', category:'general', status:'draft' });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [filters]);

  async function fetchData() {
    setLoading(true);
    const params = {};
    if (filters.category) params.category = filters.category;
    if (filters.status)   params.status   = filters.status;
    api.get('/cms', { params }).then(r => setContent(r.data)).finally(() => setLoading(false));
  }

  async function save() {
    if (!form.title) return toast.error('Title required.');
    try {
      if (editing) { await api.put(`/cms/${editing}`, form); toast.success('Updated.'); }
      else { await api.post('/cms', form); toast.success('Created.'); }
      setEditing(null); setShowForm(false);
      setForm({ title:'', content:'', category:'general', status:'draft' });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed.'); }
  }

  async function publish(id) {
    await api.put(`/cms/${id}`, { status:'published' });
    toast.success('Published!'); fetchData();
  }

  async function del(id) {
    if (!confirm('Delete this content?')) return;
    await api.delete(`/cms/${id}`);
    toast.success('Deleted.'); fetchData();
  }

  function startEdit(item) {
    setForm({ title: item.title, content: item.content || '', category: item.category, status: item.status });
    setEditing(item.id);
    setShowForm(true);
  }

  const canManage = ['admin','registrar'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage website content, announcements, policies and banners</p>
        </div>
        {canManage && <button onClick={() => { setEditing(null); setForm({ title:'', content:'', category:'general', status:'draft' }); setShowForm(true); }} className="btn-primary"><Plus className="w-4 h-4" /> New Content</button>}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filters.category} onChange={e=>setFilters(f=>({...f,category:e.target.value}))} className="select-field w-40">
          <option value="">All Categories</option>
          {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filters.status} onChange={e=>setFilters(f=>({...f,status:e.target.value}))} className="select-field w-36">
          <option value="">All Status</option>
          {['draft','published','archived'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="space-y-3">
        {loading ? <div className="p-8 text-center text-gray-400">Loading…</div> : content.map(c => (
          <div key={c.id} className="card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="font-bold text-gray-800">{c.title}</h3>
                  <span className={CAT_COLORS[c.category]||'badge-gray'}>{c.category}</span>
                  <span className={c.status==='published'?'badge-green':c.status==='archived'?'badge-gray':'badge-yellow'}>{c.status}</span>
                </div>
                {c.content && <p className="text-gray-500 text-sm line-clamp-2">{c.content.replace(/<[^>]+>/g,'')}</p>}
                <div className="flex gap-4 text-xs text-gray-400 mt-2">
                  <span>By: {c.author || '—'}</span>
                  {c.published_at && <span>Published: {new Date(c.published_at).toLocaleDateString()}</span>}
                  <span>Updated: {new Date(c.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
              {canManage && (
                <div className="flex gap-1 flex-shrink-0">
                  {c.status === 'draft' && <button onClick={() => publish(c.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Publish"><Send className="w-4 h-4" /></button>}
                  <button onClick={() => startEdit(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => del(c.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!loading && !content.length && <div className="card p-8 text-center text-gray-400">No content found. Create your first content item.</div>}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg">{editing ? 'Edit Content' : 'New Content'}</h3>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="block text-sm font-medium mb-1">Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} className="input-field" placeholder="Content title" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Category</label>
                  <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))} className="select-field">
                    {CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Status</label>
                  <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="select-field">
                    {['draft','published','archived'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Content</label>
                <textarea value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} className="input-field" rows={8} placeholder="Content body…" />
              </div>
            </div>
            <div className="p-5 pt-0 flex gap-2">
              <button onClick={save} className="btn-primary flex-1">{editing?'Update':'Publish'}</button>
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
