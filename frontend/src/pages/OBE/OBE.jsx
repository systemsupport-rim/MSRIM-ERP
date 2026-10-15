import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Star, Plus, X, Target } from 'lucide-react';

export default function OBE() {
  const { user } = useAuth();
  const [cos, setCos] = useState([]);
  const [pos, setPos] = useState([]);
  const [mapping, setMapping] = useState(null);
  const [tab, setTab] = useState('outcomes');
  const [showAddCO, setShowAddCO] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/obe/course-outcomes'),
      api.get('/obe/program-outcomes'),
      api.get('/obe/mapping', { params: { program_id: 1 } })
    ]).then(([c, p, m]) => { setCos(c.data); setPos(p.data); setMapping(m.data); }).finally(() => setLoading(false));
  }, []);

  async function handleMapChange(coId, poId, strength) {
    try { await api.post('/obe/mapping', { co_id: coId, po_id: poId, strength: parseInt(strength) }); const res = await api.get('/obe/mapping', { params: { program_id: 1 } }); setMapping(res.data); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canEdit = ['faculty','admin','hod'].includes(user.role);
  const bloomColors = { Remembering:'badge-gray', Understanding:'badge-blue', Applying:'badge-green', Analysing:'badge-yellow', Evaluating:'badge-orange', Creating:'badge-red' };
  const strengthColors = { 1: 'bg-blue-200 text-blue-800', 2: 'bg-blue-400 text-white', 3: 'bg-msrim-blue text-white' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Outcome Based Education (OBE)</h1>
          <p className="text-gray-500 text-sm mt-1">Course Outcomes, Program Outcomes & Attainment</p>
        </div>
        {canEdit && tab === 'outcomes' && <button className="btn-primary" onClick={() => setShowAddCO(true)}><Plus className="w-4 h-4" /> Add Course Outcome</button>}
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['outcomes','program-outcomes','co-po-mapping'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${tab===t?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>{t.replace(/-/g,' ')}</button>
        ))}
      </div>

      {tab === 'outcomes' && (
        <div className="space-y-4">
          {loading ? <div className="card text-center py-12"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
          : cos.map(co => (
            <div key={co.id} className="card flex items-start gap-4">
              <div className="w-10 h-10 bg-msrim-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-msrim-blue font-bold text-sm">{co.code}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800">{co.description}</span>
                  <span className={bloomColors[co.bloom_level]||'badge-gray'}>{co.bloom_level}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{co.course_name} · {co.course_code}</p>
              </div>
            </div>
          ))}
          {!loading && !cos.length && <div className="card text-center py-12 text-gray-400">No course outcomes defined</div>}
        </div>
      )}

      {tab === 'program-outcomes' && (
        <div className="space-y-3">
          {pos.map(po => (
            <div key={po.id} className="card flex items-start gap-4">
              <div className="w-10 h-10 bg-msrim-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-msrim-orange font-bold text-sm">{po.code}</span>
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800">{po.description}</p>
                <p className="text-xs text-gray-400 mt-1">{po.program_name} · {po.category}</p>
              </div>
            </div>
          ))}
          {!pos.length && <div className="card text-center py-12 text-gray-400">No program outcomes defined</div>}
        </div>
      )}

      {tab === 'co-po-mapping' && mapping && (
        <div className="card overflow-x-auto">
          <h3 className="font-semibold mb-4">CO-PO Mapping Matrix</h3>
          <p className="text-xs text-gray-400 mb-3">1 = Low · 2 = Medium · 3 = High correlation</p>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 text-gray-500">Course Outcome</th>
                {mapping.pos?.map(po => <th key={po.id} className="p-2 text-center text-msrim-blue font-bold">{po.code}</th>)}
              </tr>
            </thead>
            <tbody>
              {mapping.cos?.map(co => (
                <tr key={co.id} className="border-b hover:bg-gray-50">
                  <td className="p-2">
                    <p className="font-medium">{co.code}</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{co.description}</p>
                  </td>
                  {mapping.pos?.map(po => {
                    const strength = mapping.mapMatrix?.[co.id]?.[po.id] || 0;
                    return (
                      <td key={po.id} className="p-2 text-center">
                        {canEdit ? (
                          <select value={strength} onChange={e => handleMapChange(co.id, po.id, e.target.value)}
                            className={`w-12 text-center text-xs font-bold rounded py-0.5 border-0 outline-none cursor-pointer ${strength > 0 ? strengthColors[strength] : 'bg-gray-100 text-gray-400'}`}>
                            <option value="0">—</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                          </select>
                        ) : (
                          <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${strength > 0 ? strengthColors[strength] : 'bg-gray-100 text-gray-400'}`}>
                            {strength || '—'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddCO && <AddCOModal onClose={() => { setShowAddCO(false); api.get('/obe/course-outcomes').then(r => setCos(r.data)); }} />}
    </div>
  );
}

function AddCOModal({ onClose }) {
  const [form, setForm] = useState({ course_id:'', code:'', description:'', bloom_level:'Understanding' });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  useEffect(() => { api.get('/courses').then(r => setCourses(r.data)); }, []);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/obe/course-outcomes', form); toast.success('CO added!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Add Course Outcome</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Course *</label><select required value={form.course_id} onChange={e=>set('course_id',e.target.value)} className="select-field"><option value="">Select Course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">CO Code *</label><input required value={form.code} onChange={e=>set('code',e.target.value)} className="input-field" placeholder="CO1" /></div>
            <div><label className="block text-sm font-medium mb-1">Bloom's Level</label><select value={form.bloom_level} onChange={e=>set('bloom_level',e.target.value)} className="select-field">{['Remembering','Understanding','Applying','Analysing','Evaluating','Creating'].map(b=><option key={b}>{b}</option>)}</select></div>
          </div>
          <div><label className="block text-sm font-medium mb-1">Description *</label><textarea required value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={3} /></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Adding...':'Add CO'}</button></div>
        </form>
      </div>
    </div>
  );
}
