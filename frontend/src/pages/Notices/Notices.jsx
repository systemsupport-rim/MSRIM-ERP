import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Bell, Pin, PinOff, Plus, AlertCircle, BookOpen, Briefcase, DollarSign, Calendar, X, Edit2 } from 'lucide-react';

const categoryConfig = {
  general: { color: 'badge-gray', icon: Bell, label: 'General' },
  academic: { color: 'badge-blue', icon: BookOpen, label: 'Academic' },
  exam: { color: 'badge-yellow', icon: AlertCircle, label: 'Exam' },
  placement: { color: 'badge-orange', icon: Briefcase, label: 'Placement' },
  fee: { color: 'badge-blue', icon: DollarSign, label: 'Fee' },
  event: { color: 'badge-green', icon: Calendar, label: 'Event' },
  urgent: { color: 'badge-red', icon: AlertCircle, label: 'Urgent' },
};

export default function Notices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  useEffect(() => { fetchNotices(); }, [category]);

  async function fetchNotices() {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      const res = await api.get('/notices', { params });
      setNotices(res.data);
    } finally { setLoading(false); }
  }

  async function handleDelete(id) {
    try { await api.delete(`/notices/${id}`); toast.success('Notice deleted'); fetchNotices(); }
    catch { toast.error('Failed to delete'); }
  }

  async function handlePin(notice, e) {
    e.stopPropagation();
    try {
      const res = await api.patch(`/notices/${notice.id}/pin`);
      toast.success(res.data.message);
      fetchNotices();
    } catch { toast.error('Failed'); }
  }

  const canManage = ['admin', 'registrar'].includes(user.role);
  const canPost = ['admin', 'registrar', 'hod', 'faculty', 'placement'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notice Board</h1>
          <p className="text-gray-500 text-sm mt-1">{notices.length} notices</p>
        </div>
        {canPost && <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Post Notice</button>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategory('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${!category ? 'bg-msrim-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>All</button>
        {Object.entries(categoryConfig).map(([k, v]) => (
          <button key={k} onClick={() => setCategory(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${category === k ? 'bg-msrim-blue text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {notices.filter(n => n.is_pinned).length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2"><Pin className="w-3 h-3" /> Pinned</p>
          {notices.filter(n => n.is_pinned).map(n => (
            <NoticeCard key={n.id} notice={n} onView={setSelected}
              onDelete={canManage ? handleDelete : null}
              onPin={canManage ? handlePin : null}
              onEdit={canManage ? setEditTarget : null}
              pinned />
          ))}
        </div>
      )}

      <div className="space-y-3">
        {!loading && notices.filter(n => !n.is_pinned).length > 0 && (
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Notices</p>
        )}
        {loading ? (
          <div className="card text-center py-12"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        ) : notices.filter(n => !n.is_pinned).map(n => (
          <NoticeCard key={n.id} notice={n} onView={setSelected}
            onDelete={canManage ? handleDelete : null}
            onPin={canManage ? handlePin : null}
            onEdit={canManage ? setEditTarget : null} />
        ))}
        {!loading && !notices.length && (
          <div className="card text-center py-12 text-gray-400">No notices to display</div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between p-6 border-b">
              <div className="flex-1 pr-4">
                <span className={`${categoryConfig[selected.category]?.color || 'badge-gray'} text-xs`}>{selected.category}</span>
                <h2 className="font-bold text-xl mt-2">{selected.title}</h2>
                <p className="text-gray-500 text-sm mt-1">By {selected.published_by_name} · {new Date(selected.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selected.content}</p>
            </div>
          </div>
        </div>
      )}

      {editTarget && <EditNoticeModal notice={editTarget} onClose={() => { setEditTarget(null); fetchNotices(); }} />}
      {showAdd && <AddNoticeModal onClose={() => { setShowAdd(false); fetchNotices(); }} />}
    </div>
  );
}

function NoticeCard({ notice, onView, onDelete, onPin, onEdit, pinned }) {
  const config = categoryConfig[notice.category] || categoryConfig.general;
  const Icon = config.icon;

  return (
    <div className={`card hover:shadow-md transition-shadow cursor-pointer ${pinned ? 'border-l-4 border-msrim-orange' : ''}`} onClick={() => onView(notice)}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg flex-shrink-0 ${pinned ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <Icon className={`w-5 h-5 ${pinned ? 'text-msrim-orange' : 'text-gray-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold text-gray-900">{notice.title}</h3>
            {pinned && <Pin className="w-3 h-3 text-msrim-orange" />}
            <span className={config.color}>{notice.category}</span>
          </div>
          <p className="text-gray-500 text-sm line-clamp-2">{notice.content}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>By {notice.published_by_name}</span>
            <span>·</span>
            <span>{new Date(notice.created_at).toLocaleDateString('en-IN')}</span>
            {notice.target_role !== 'all' && <><span>·</span><span className="capitalize">For: {notice.target_role}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {onPin && (
            <button onClick={e => onPin(notice, e)} className={`p-1.5 rounded-lg transition-colors ${notice.is_pinned ? 'text-msrim-orange hover:bg-orange-50' : 'text-gray-400 hover:bg-gray-100'}`} title={notice.is_pinned ? 'Unpin' : 'Pin'}>
              {notice.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
            </button>
          )}
          {onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(notice); }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(notice.id); }} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditNoticeModal({ notice, onClose }) {
  const [form, setForm] = useState({ title: notice.title, content: notice.content, category: notice.category, is_pinned: !!notice.is_pinned });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.put(`/notices/${notice.id}`, form); toast.success('Notice updated!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Edit Notice</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content *</label>
            <textarea required value={form.content} onChange={e => set('content', e.target.value)} className="input-field" rows={5} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="select-field">
                {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="pin-edit" checked={form.is_pinned} onChange={e => set('is_pinned', e.target.checked)} className="w-4 h-4 accent-msrim-orange" />
              <label htmlFor="pin-edit" className="text-sm font-medium cursor-pointer">Pinned</label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddNoticeModal({ onClose }) {
  const [form, setForm] = useState({ title: '', content: '', category: 'general', target_role: 'all', is_pinned: false, expires_at: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/notices', form); toast.success('Notice posted!'); onClose(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Post Notice</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input required value={form.title} onChange={e => set('title', e.target.value)} className="input-field" placeholder="Notice title..." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content *</label>
            <textarea required value={form.content} onChange={e => set('content', e.target.value)} className="input-field" rows={5} placeholder="Notice details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="select-field">
                {Object.entries(categoryConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Audience</label>
              <select value={form.target_role} onChange={e => set('target_role', e.target.value)} className="select-field">
                <option value="all">Everyone</option>
                <option value="student">Students Only</option>
                <option value="faculty">Faculty Only</option>
                <option value="admin">Admin Only</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={e => set('is_pinned', e.target.checked)} className="w-4 h-4 accent-msrim-orange" />
              <span className="text-sm font-medium">Pin this notice</span>
            </label>
            <div className="flex-1">
              <input type="date" value={form.expires_at} onChange={e => set('expires_at', e.target.value)} className="input-field text-sm" placeholder="Expiry (optional)" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Posting...' : 'Post Notice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
