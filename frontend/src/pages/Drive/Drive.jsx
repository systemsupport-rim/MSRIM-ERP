import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { HardDrive, FolderOpen, FileText, Download, Plus, Search, Trash2, X, File, Upload } from 'lucide-react';

const fileTypeIcons = { pdf: '📄', doc: '📝', docx: '📝', ppt: '📊', pptx: '📊', xls: '📈', xlsx: '📈', mp4: '🎬', mp3: '🎵', zip: '📦', image: '🖼️', document: '📄', video: '🎬', presentation: '📊', other: '📎' };

export default function Drive() {
  const { user } = useAuth();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [showAddFile, setShowAddFile] = useState(false);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [selectedFolder, search]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = {};
      if (selectedFolder !== null) params.folder_id = selectedFolder;
      if (search) params.search = search;
      const [fRes, fldRes, sRes] = await Promise.all([
        api.get('/drive/files', { params }),
        !search ? api.get('/drive/folders', { params: { parent_id: selectedFolder || '' } }) : Promise.resolve({ data: [] }),
        api.get('/drive/stats')
      ]);
      setFiles(fRes.data); setFolders(fldRes.data); setStats(sRes.data);
    } finally { setLoading(false); }
  }

  async function handleDelete(fileId) {
    if (!confirm('Delete this file?')) return;
    try { await api.delete(`/drive/files/${fileId}`); toast.success('File deleted'); fetchData(); }
    catch { toast.error('Failed'); }
  }

  async function handleDownload(file) {
    await api.post(`/drive/files/${file.id}/download`);
    toast.success(`"${file.name}" download recorded`);
    fetchData();
  }

  const canUpload = ['admin','registrar','faculty','hod'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drive</h1>
          <p className="text-gray-500 text-sm mt-1">Campus Document Repository</p>
        </div>
        {canUpload && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowAddFolder(true)}><FolderOpen className="w-4 h-4" /> New Folder</button>
            <button className="btn-primary" onClick={() => setShowAddFile(true)}><Upload className="w-4 h-4" /> Upload File</button>
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Total Files</p><p className="text-3xl font-bold text-msrim-blue">{stats.files}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Folders</p><p className="text-3xl font-bold text-green-600">{stats.folders}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Total Downloads</p><p className="text-3xl font-bold text-msrim-orange">{stats.totalDownloads}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">File Types</p><p className="text-3xl font-bold text-purple-600">{stats.byType?.length || 0}</p></div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files..." className="bg-transparent text-sm outline-none w-full" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Folders Panel */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="font-semibold mb-3 text-sm text-gray-500 uppercase tracking-wide">Folders</h3>
            <div className="space-y-1">
              <button onClick={() => setSelectedFolder(null)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedFolder===null?'bg-msrim-blue text-white':'text-gray-600 hover:bg-gray-100'}`}>
                <HardDrive className="w-4 h-4" /> All Files
              </button>
              {folders.map(f => (
                <button key={f.id} onClick={() => setSelectedFolder(f.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${selectedFolder===f.id?'bg-msrim-blue text-white':'text-gray-600 hover:bg-gray-100'}`}>
                  <FolderOpen className="w-4 h-4" />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-xs opacity-70">{f.file_count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Files Panel */}
        <div className="lg:col-span-3">
          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold">{selectedFolder ? folders.find(f=>f.id===selectedFolder)?.name || 'Folder' : 'All Files'}</h3>
              <span className="text-gray-400 text-sm">{files.length} files</span>
            </div>
            {loading ? (
              <div className="p-12 text-center"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {files.map(f => (
                  <div key={f.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="text-2xl flex-shrink-0">{fileTypeIcons[f.file_type] || fileTypeIcons.other}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{f.name}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        <span>By {f.uploaded_by_name}</span>
                        <span>·</span>
                        <span>{new Date(f.created_at).toLocaleDateString()}</span>
                        {f.file_size > 0 && <><span>·</span><span>{(f.file_size/1024/1024).toFixed(1)} MB</span></>}
                        <span>·</span>
                        <span>⬇️ {f.download_count} downloads</span>
                      </div>
                      {f.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{f.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${f.access_role==='all'?'badge-green':f.access_role==='student'?'badge-blue':'badge-orange'}`}>{f.access_role}</span>
                      <button onClick={() => handleDownload(f)} className="btn-secondary py-1.5 px-3 text-xs">
                        <Download className="w-3 h-3" /> Download
                      </button>
                      {canUpload && f.uploaded_by === user.id && (
                        <button onClick={() => handleDelete(f.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {!files.length && !loading && (
                  <div className="p-12 text-center text-gray-400">
                    <File className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No files found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddFile && <UploadFileModal folders={[...folders]} selectedFolder={selectedFolder} onClose={() => { setShowAddFile(false); fetchData(); }} />}
      {showAddFolder && <AddFolderModal onClose={() => { setShowAddFolder(false); fetchData(); }} />}
    </div>
  );
}

function UploadFileModal({ folders, selectedFolder, onClose }) {
  const [form, setForm] = useState({ folder_id: selectedFolder||'', name:'', file_type:'document', description:'', access_role:'all', tags:'', file_url:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/drive/files', { ...form, file_size: 1024000 }); toast.success('File uploaded!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Upload File</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">File Name *</label><input required value={form.name} onChange={e=>set('name',e.target.value)} className="input-field" placeholder="Document name.pdf" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Type</label>
              <select value={form.file_type} onChange={e=>set('file_type',e.target.value)} className="select-field">
                {['document','pdf','presentation','video','link','other'].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium mb-1">Access</label>
              <select value={form.access_role} onChange={e=>set('access_role',e.target.value)} className="select-field">
                <option value="all">Everyone</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Folder</label>
            <select value={form.folder_id} onChange={e=>set('folder_id',e.target.value)} className="select-field">
              <option value="">Root / No Folder</option>
              {folders.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={2} /></div>
          <div><label className="block text-sm font-medium mb-1">URL / Link</label><input value={form.file_url} onChange={e=>set('file_url',e.target.value)} className="input-field" placeholder="https://..." /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Uploading...':'Upload'}</button></div>
        </form>
      </div>
    </div>
  );
}

function AddFolderModal({ onClose }) {
  const [form, setForm] = useState({ name:'', access_role:'all' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/drive/folders', form); toast.success('Folder created!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">New Folder</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Folder Name *</label><input required value={form.name} onChange={e=>set('name',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Access</label>
            <select value={form.access_role} onChange={e=>set('access_role',e.target.value)} className="select-field">
              <option value="all">Everyone</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating...':'Create'}</button></div>
        </form>
      </div>
    </div>
  );
}
