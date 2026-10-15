import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Heart, Plus, CheckCircle, X, Star } from 'lucide-react';

export default function Feedback() {
  const { user } = useAuth();
  const [forms, setForms] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [responding, setResponding] = useState(null);
  const [ratings, setRatings] = useState({});

  useEffect(() => {
    Promise.all([api.get('/feedback/forms'), api.get('/feedback/stats')])
      .then(([f, s]) => { setForms(f.data); setStats(s.data); }).finally(() => setLoading(false));
  }, []);

  async function handleRespond(formId) {
    try {
      await api.post(`/feedback/forms/${formId}/respond`, { response_data: ratings });
      toast.success('Response submitted!'); setResponding(null); setRatings({});
      const res = await api.get('/feedback/forms'); setForms(res.data);
    } catch(err) { toast.error(err.response?.data?.error||'Already responded'); }
  }

  async function handleClose(formId) {
    await api.put(`/feedback/forms/${formId}/close`);
    toast.success('Form closed'); const res = await api.get('/feedback/forms'); setForms(res.data);
  }

  const canCreate = ['admin','hod','registrar','faculty'].includes(user.role);
  const typeColors = { course:'badge-blue', faculty:'badge-green', infrastructure:'badge-yellow', event:'badge-orange', general:'badge-gray', exit:'badge-red' };
  const statusColors = { active:'badge-green', closed:'badge-red', draft:'badge-gray' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IQAC / Feedback Management</h1>
          <p className="text-gray-500 text-sm mt-1">Internal Quality Assurance Cell</p>
        </div>
        {canCreate && <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Create Form</button>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[['Total Forms',stats.total,'text-msrim-blue'],['Active',stats.active,'text-green-600'],['Responses',stats.responses,'text-msrim-orange'],['Unique Students',stats.uniqueStudents,'text-purple-600'],['Faculty Feedback',stats.uniqueFaculty,'text-indigo-600']].map(([l,v,c]) => (
            <div key={l} className="card"><p className="text-gray-500 text-sm">{l}</p><p className={`text-3xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? <div className="col-span-2 card text-center py-12"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        : forms.map(f => (
          <div key={f.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold">{f.title}</h3>
                  <span className={typeColors[f.type]||'badge-gray'}>{f.type}</span>
                  <span className={statusColors[f.status]||'badge-gray'}>{f.status}</span>
                </div>
                {f.course_name && <p className="text-gray-500 text-sm mt-1">Course: {f.course_name}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span>📝 {f.response_count} responses</span>
              {f.is_anonymous ? <span>🔒 Anonymous</span> : <span>👤 Named</span>}
              {f.end_date && <span>⏰ Ends: {new Date(f.end_date).toLocaleDateString()}</span>}
            </div>
            <div className="flex gap-2">
              {user.role === 'student' && f.status === 'active' && !f.has_responded && (
                <button onClick={() => setResponding(f)} className="btn-primary text-sm py-1.5 flex-1 justify-center"><Heart className="w-3 h-3" /> Give Feedback</button>
              )}
              {user.role === 'student' && f.has_responded && (
                <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle className="w-4 h-4" /> Already responded</div>
              )}
              {canCreate && f.status === 'active' && (
                <button onClick={() => handleClose(f.id)} className="btn-secondary text-sm py-1.5">Close Form</button>
              )}
            </div>
          </div>
        ))}
        {!loading && !forms.length && <div className="col-span-2 card text-center py-12 text-gray-400">No feedback forms</div>}
      </div>

      {responding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-bold text-xl">{responding.title}</h2>
              <button onClick={() => setResponding(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <FeedbackFormRespond formId={responding.id} onSubmit={(data) => { setRatings(data); handleRespond(responding.id); }} onCancel={() => setResponding(null)} />
            </div>
          </div>
        </div>
      )}

      {showAdd && <CreateFeedbackModal onClose={() => { setShowAdd(false); api.get('/feedback/forms').then(r => setForms(r.data)); }} />}
    </div>
  );
}

function FeedbackFormRespond({ formId, onSubmit, onCancel }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  useEffect(() => { api.get(`/feedback/forms/${formId}`).then(r => setQuestions(r.data.questions || [])); }, [formId]);
  return (
    <div className="space-y-6">
      {questions.map(q => (
        <div key={q.id}>
          <p className="font-medium text-gray-800 mb-2">{q.question_text} {q.is_required && <span className="text-red-500">*</span>}</p>
          {q.question_type === 'rating' && (
            <div className="flex gap-2">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setAnswers(a => ({...a,[q.id]:n}))}
                  className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${answers[q.id]===n?'bg-msrim-blue text-white':'bg-gray-100 text-gray-600 hover:bg-blue-50'}`}>{n}</button>
              ))}
              {answers[q.id] && <span className="self-center text-sm text-gray-500">{['Very Poor','Poor','Average','Good','Excellent'][answers[q.id]-1]}</span>}
            </div>
          )}
          {q.question_type === 'text' && <textarea className="input-field" rows={3} value={answers[q.id]||''} onChange={e => setAnswers(a => ({...a,[q.id]:e.target.value}))} placeholder="Your response..." />}
          {q.question_type === 'yes_no' && (
            <div className="flex gap-3">
              {['Yes','No'].map(v => <button key={v} onClick={() => setAnswers(a => ({...a,[q.id]:v}))} className={`px-4 py-2 rounded-lg font-medium text-sm ${answers[q.id]===v?'bg-msrim-blue text-white':'bg-gray-100 text-gray-600'}`}>{v}</button>)}
            </div>
          )}
        </div>
      ))}
      {!questions.length && <p className="text-gray-400 text-center py-4">Loading questions...</p>}
      <div className="flex justify-end gap-3"><button onClick={onCancel} className="btn-secondary">Cancel</button><button onClick={() => onSubmit(answers)} className="btn-primary">Submit Feedback</button></div>
    </div>
  );
}

function CreateFeedbackModal({ onClose }) {
  const [form, setForm] = useState({ title:'',description:'',type:'course',target_role:'student',academic_year_id:'1',start_date:'',end_date:'',is_anonymous:true });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/feedback/forms', { ...form, questions: [{text:'How would you rate your overall experience?',type:'rating',required:true},{text:'Please share your comments',type:'text',required:false}] }); toast.success('Form created!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Create Feedback Form</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>set('title',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Type</label><select value={form.type} onChange={e=>set('type',e.target.value)} className="select-field">{['course','faculty','infrastructure','event','general','exit'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">For</label><select value={form.target_role} onChange={e=>set('target_role',e.target.value)} className="select-field"><option value="student">Students</option><option value="faculty">Faculty</option><option value="all">Everyone</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Start Date</label><input type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">End Date</label><input type="date" value={form.end_date} onChange={e=>set('end_date',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} className="input-field" rows={2} /></div>
          <div className="col-span-2 flex items-center gap-2"><input type="checkbox" id="anon" checked={form.is_anonymous} onChange={e=>set('is_anonymous',e.target.checked)} className="w-4 h-4" /><label htmlFor="anon" className="text-sm">Anonymous Responses</label></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Creating...':'Create'}</button></div>
        </form>
      </div>
    </div>
  );
}
