import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FileText, ClipboardList, Map, Award, Plus, X, Zap } from 'lucide-react';

export default function ExamsEnhanced({ tab: initialTab = 'hall-tickets' }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [exams, setExams] = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [seating, setSeating] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [certs, setCerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedExam, setSelectedExam] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/examinations'),
      api.get('/exams/hall-tickets'),
      api.get('/exams/question-papers'),
      api.get('/exams/grading-schemas'),
      api.get('/exams/certificates'),
      api.get('/exams/stats')
    ]).then(([ex, ht, qp, gs, ct, st]) => {
      setExams(ex.data); setHallTickets(ht.data); setQuestionPapers(qp.data); setSchemas(gs.data); setCerts(ct.data); setStats(st.data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedExam) {
      api.get(`/exams/seating/${selectedExam}`).then(r => setSeating(r.data));
    }
  }, [selectedExam]);

  async function generateHallTickets() {
    if (!selectedExam) return toast.error('Select an exam first');
    try { const res = await api.post('/exams/hall-tickets/generate', { examination_id: selectedExam }); toast.success(res.data.message); const r = await api.get('/exams/hall-tickets'); setHallTickets(r.data); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  async function generateSeating() {
    if (!selectedExam) return toast.error('Select an exam first');
    try { await api.post('/exams/seating/generate', { examination_id: selectedExam }); toast.success('Seating plan generated!'); const r = await api.get(`/exams/seating/${selectedExam}`); setSeating(r.data); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  async function generateMasking() {
    if (!selectedExam) return toast.error('Select an exam first');
    try { const res = await api.post('/exams/masking-sheets/generate', { examination_id: selectedExam }); toast.success(res.data.message); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);

  const tabs = [
    { id: 'hall-tickets', label: 'Hall Tickets', icon: ClipboardList },
    { id: 'question-papers', label: 'Question Papers', icon: FileText },
    { id: 'seating', label: 'Seating Plan', icon: Map },
    { id: 'grading', label: 'Grading Schema', icon: Award },
    { id: 'certificates', label: 'Certificates', icon: Award },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Examination Management</h1>
        <p className="text-gray-500 text-sm mt-1">Hall Tickets · Question Papers · Seating · Masking · Certificates</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {[['Hall Tickets',stats.hallTickets,'text-msrim-blue'],['Question Papers',stats.questionPapers,'text-green-600'],['Seating Plans',stats.seatingPlans,'text-msrim-orange'],['Masking Sheets',stats.maskingSheets,'text-purple-600'],['Grading Schemas',stats.gradingSchemas,'text-indigo-600'],['Cert. Templates',stats.certTemplates,'text-pink-600'],['Invigilators',stats.invigilators,'text-teal-600']].map(([l,v,c]) => (
            <div key={l} className="card p-3"><p className="text-gray-400 text-xs">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
          ))}
        </div>
      )}

      {/* Exam selector */}
      <div className="card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium mb-1">Select Examination</label>
            <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="select-field">
              <option value="">Choose examination...</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.course_code} - {e.name} ({e.exam_type}) {e.exam_date ? `· ${new Date(e.exam_date).toLocaleDateString()}` : ''}</option>)}
            </select>
          </div>
          {canManage && selectedExam && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={generateHallTickets} className="btn-primary text-sm py-2"><Zap className="w-3 h-3" /> Hall Tickets</button>
              <button onClick={generateSeating} className="btn-secondary text-sm py-2"><Map className="w-3 h-3" /> Seating Plan</button>
              <button onClick={generateMasking} className="btn-secondary text-sm py-2"><FileText className="w-3 h-3" /> Masking Sheets</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium ${tab===t.id?'bg-white text-msrim-blue shadow-sm':'text-gray-500'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === 'hall-tickets' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Hall Tickets ({hallTickets.length})</h3>
            <p className="text-sm text-gray-400">Select an exam above and click "Hall Tickets" to generate</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Hall Ticket No.</th><th className="table-th">Student</th>
                <th className="table-th">Enrollment</th><th className="table-th">Exam</th>
                <th className="table-th">Exam Date</th><th className="table-th">Room</th><th className="table-th">Seat</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(selectedExam ? hallTickets.filter(h => h.examination_id === parseInt(selectedExam)) : hallTickets).slice(0,20).map(h => (
                  <tr key={h.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono font-bold text-msrim-blue">{h.hall_ticket_number}</td>
                    <td className="table-td font-medium">{h.student_name}</td>
                    <td className="table-td text-xs">{h.enrollment_number}</td>
                    <td className="table-td">{h.exam_name}</td>
                    <td className="table-td">{h.exam_date ? new Date(h.exam_date).toLocaleDateString() : '—'}</td>
                    <td className="table-td">{h.room || '—'}</td>
                    <td className="table-td">{h.seat_number || '—'}</td>
                  </tr>
                ))}
                {!hallTickets.length && <tr><td colSpan={7} className="table-td text-center py-8 text-gray-400">No hall tickets generated yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'question-papers' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            {canManage && <button className="btn-primary" onClick={() => toast('Question paper module - select exam and add sections')}><Plus className="w-4 h-4" /> Create Question Paper</button>}
          </div>
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="table-th">Exam</th><th className="table-th">Version</th>
                  <th className="table-th">Questions</th><th className="table-th">Prepared By</th>
                  <th className="table-th">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {questionPapers.map(qp => (
                    <tr key={qp.id} className="hover:bg-gray-50">
                      <td className="table-td font-medium">{qp.exam_name}</td>
                      <td className="table-td">Version {qp.version}</td>
                      <td className="table-td">{qp.total_questions}</td>
                      <td className="table-td">{qp.prepared_by_name || '—'}</td>
                      <td className="table-td"><span className={qp.status==='approved'?'badge-green':qp.status==='draft'?'badge-gray':'badge-yellow'}>{qp.status}</span></td>
                    </tr>
                  ))}
                  {!questionPapers.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">No question papers</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'seating' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-semibold">Seating Plan</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Student</th><th className="table-th">Enrollment</th>
                <th className="table-th">Room</th><th className="table-th">Seat No.</th><th className="table-th">Row · Col</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {seating.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{s.student_name}</td>
                    <td className="table-td text-xs">{s.enrollment_number}</td>
                    <td className="table-td">{s.room_number || '—'}{s.building_name ? ` (${s.building_name})` : ''}</td>
                    <td className="table-td font-bold text-msrim-blue">{s.seat_number}</td>
                    <td className="table-td text-xs text-gray-500">R{s.row_num} C{s.col_num}</td>
                  </tr>
                ))}
                {!seating.length && <tr><td colSpan={5} className="table-td text-center py-8 text-gray-400">{selectedExam ? 'No seating plan generated' : 'Select an exam to view seating plan'}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'grading' && (
        <div className="space-y-4">
          {schemas.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold">{s.name}</h3>
                  <p className="text-gray-500 text-sm">{s.program_name}</p>
                  {s.description && <p className="text-gray-600 text-sm mt-1">{s.description}</p>}
                </div>
                <span className={s.is_active ? 'badge-green' : 'badge-gray'}>{s.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {s.schema_data && (() => {
                try {
                  const d = JSON.parse(s.schema_data);
                  return (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {d.grades?.map(g => <span key={g.grade} className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-lg text-sm font-medium">{g.grade}: ≥{g.min}%</span>)}
                    </div>
                  );
                } catch { return null; }
              })()}
            </div>
          ))}
        </div>
      )}

      {tab === 'certificates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certs.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-msrim-orange/10 rounded-lg flex-shrink-0"><Award className="w-5 h-5 text-msrim-orange" /></div>
                <div>
                  <h3 className="font-bold">{c.name}</h3>
                  <span className={`badge-blue mt-1 inline-block capitalize`}>{c.type}</span>
                  {c.program_name && <p className="text-gray-400 text-xs mt-1">{c.program_name}</p>}
                  <span className={`mt-2 inline-block ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          ))}
          {!certs.length && <div className="col-span-3 card text-center py-12 text-gray-400">No certificate templates configured</div>}
        </div>
      )}
    </div>
  );
}
