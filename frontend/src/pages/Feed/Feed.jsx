import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Heart, MessageSquare, Plus, Send, X, Megaphone, Users, Pin } from 'lucide-react';

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [booths, setBooths] = useState([]);
  const [tab, setTab] = useState('feed');
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [showAddBooth, setShowAddBooth] = useState(false);

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([api.get('/feed/posts'), api.get('/feed/booths')]);
      setPosts(p.data); setBooths(b.data);
    } finally { setLoading(false); }
  }

  async function handlePost() {
    if (!newPost.trim()) return;
    try { await api.post('/feed/posts', { content: newPost }); setNewPost(''); toast.success('Posted!'); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  async function handleLike(postId) {
    try { await api.post(`/feed/posts/${postId}/like`); fetchData(); }
    catch {}
  }

  async function openComments(post) {
    setSelectedPost(post);
    const res = await api.get(`/feed/posts/${post.id}/comments`);
    setComments(res.data);
  }

  async function handleComment() {
    if (!newComment.trim() || !selectedPost) return;
    try { await api.post(`/feed/posts/${selectedPost.id}/comments`, { content: newComment }); setNewComment(''); openComments(selectedPost); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  async function handleDelete(postId) {
    try { await api.delete(`/feed/posts/${postId}`); toast.success('Post deleted'); fetchData(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canAddBooth = ['admin','hod','registrar'].includes(user.role);
  const typeColors = { announcement: 'badge-red', event: 'badge-blue', achievement: 'badge-green', poll: 'badge-orange', general: 'badge-gray' };
  const roleColors = { admin: 'bg-red-100 text-red-800', faculty: 'bg-green-100 text-green-800', student: 'bg-blue-100 text-blue-800', hod: 'bg-purple-100 text-purple-800' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Feed & Booths</h1>
        {canAddBooth && <button className="btn-primary" onClick={() => setShowAddBooth(true)}><Plus className="w-4 h-4" /> Create Booth</button>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['feed','booths'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab===t?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{t}</button>
        ))}
      </div>

      {tab === 'feed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Post composer */}
            <div className="card">
              <div className="flex gap-3">
                <div className="w-9 h-9 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{user.name?.charAt(0)}</div>
                <div className="flex-1">
                  <textarea value={newPost} onChange={e => setNewPost(e.target.value)} rows={3}
                    className="input-field resize-none" placeholder="Share something with the campus community..." />
                  <div className="flex justify-end mt-2">
                    <button onClick={handlePost} disabled={!newPost.trim()} className="btn-primary py-1.5 disabled:opacity-50">
                      <Send className="w-4 h-4" /> Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            {loading ? <div className="card text-center py-12"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
            : posts.map(p => (
              <div key={p.id} className={`card ${p.is_pinned ? 'border-l-4 border-msrim-orange' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">{p.author_name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{p.author_name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${roleColors[p.author_role] || 'badge-gray'}`}>{p.author_role}</span>
                      {p.is_pinned && <Pin className="w-3 h-3 text-msrim-orange" />}
                      <span className={typeColors[p.post_type] || 'badge-gray'}>{p.post_type}</span>
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{new Date(p.created_at).toLocaleString()}</p>
                    <p className="text-gray-800 mt-2 leading-relaxed">{p.content}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <button onClick={() => handleLike(p.id)} className={`flex items-center gap-1.5 text-sm ${p.user_liked ? 'text-red-500 font-medium' : 'text-gray-400 hover:text-red-500'}`}>
                        <Heart className={`w-4 h-4 ${p.user_liked ? 'fill-current' : ''}`} /> {p.like_count}
                      </button>
                      <button onClick={() => openComments(p)} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-msrim-blue">
                        <MessageSquare className="w-4 h-4" /> {p.comment_count}
                      </button>
                      {(p.author_id === user.id || ['admin','registrar'].includes(user.role)) && (
                        <button onClick={() => handleDelete(p.id)} className="text-xs text-red-400 hover:text-red-600 ml-auto">Delete</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!loading && !posts.length && <div className="card text-center py-12 text-gray-400"><Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No posts yet</p></div>}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-msrim-orange" /> Booths</h3>
              {booths.slice(0,5).map(b => (
                <div key={b.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="w-8 h-8 bg-gradient-to-br from-msrim-blue to-msrim-orange rounded-lg flex items-center justify-center text-white font-bold text-xs">{b.name?.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{b.type} · {b.post_count} posts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'booths' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {booths.map(b => (
            <div key={b.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-msrim-blue to-msrim-orange rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0">{b.name?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold">{b.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge-blue capitalize text-xs">{b.type}</span>
                    <span className={b.is_active ? 'badge-green' : 'badge-red'}>{b.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-2">{b.description}</p>
                  <p className="text-xs text-gray-400 mt-2">By {b.created_by_name} · {b.post_count} posts</p>
                </div>
              </div>
            </div>
          ))}
          {!booths.length && <div className="card col-span-3 text-center py-12 text-gray-400">No booths created yet</div>}
        </div>
      )}

      {/* Comments Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => e.target===e.currentTarget && setSelectedPost(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold">Comments ({comments.length})</h3>
              <button onClick={() => setSelectedPost(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">{selectedPost.content}</div>
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 bg-msrim-blue rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{c.author_name?.charAt(0)}</div>
                  <div className="flex-1 bg-gray-50 rounded-lg p-2">
                    <p className="text-xs font-semibold text-gray-700">{c.author_name}</p>
                    <p className="text-sm text-gray-800">{c.content}</p>
                  </div>
                </div>
              ))}
              {!comments.length && <p className="text-center text-gray-400 text-sm py-4">No comments yet</p>}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input value={newComment} onChange={e => setNewComment(e.target.value)} onKeyPress={e => e.key==='Enter' && handleComment()}
                className="input-field flex-1" placeholder="Add a comment..." />
              <button onClick={handleComment} className="btn-primary px-3"><Send className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {showAddBooth && <AddBoothModal onClose={() => { setShowAddBooth(false); fetchData(); }} />}
    </div>
  );
}

function AddBoothModal({ onClose }) {
  const [form, setForm] = useState({ name:'', description:'', type:'club' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/feed/booths', form); toast.success('Booth created!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Create Booth</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Name *</label><input required value={form.name} onChange={e=>set('name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={e=>set('type',e.target.value)} className="select-field">{['club','department','event','committee','other'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating...':'Create'}</button></div>
        </form>
      </div>
    </div>
  );
}
