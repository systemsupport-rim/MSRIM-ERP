import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { FileText, ClipboardList, Map, Award, Plus, X, Zap, CheckCircle, Eye, UserCheck } from 'lucide-react';

export default function ExamsEnhanced({ tab: initialTab = 'hall-tickets' }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(initialTab);
  const [exams, setExams] = useState([]);
  const [hallTickets, setHallTickets] = useState([]);
  const [questionPapers, setQuestionPapers] = useState([]);
  const [seating, setSeating] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [certs, setCerts] = useState([]);
  const [answerSheets, setAnswerSheets] = useState([]);
  const [faculty, setFaculty] = useState([]);
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
      api.get('/exams/stats'),
      api.get('/exams/answer-sheets'),
      api.get('/faculty').catch(() => ({ data: [] })),
    ]).then(([ex, ht, qp, gs, ct, st, ans, fac]) => {
      setExams(ex.data); setHallTickets(ht.data); setQuestionPapers(qp.data);
      setSchemas(gs.data); setCerts(ct.data); setStats(st.data);
      setAnswerSheets(ans.data); setFaculty(fac.data || []);
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

  async function collectAnswerSheets() {
    if (!selectedExam) return toast.error('Select an exam first');
    try {
      const res = await api.post('/exams/answer-sheets/collect', { examination_id: selectedExam });
      toast.success(res.data.message);
      const r = await api.get('/exams/answer-sheets');
      setAnswerSheets(r.data);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  }

  async function evaluateSheet(id, marks_awarded, remarks) {
    try {
      await api.put(`/exams/answer-sheets/${id}/evaluate`, { marks_awarded, remarks });
      toast.success('Evaluation saved.');
      const r = await api.get('/exams/answer-sheets');
      setAnswerSheets(r.data);
    } catch { toast.error('Failed to evaluate.'); }
  }

  async function approveQP(id) {
    try {
      await api.put(`/exams/question-papers/${id}/approve`);
      toast.success('Question paper approved.');
      const r = await api.get('/exams/question-papers');
      setQuestionPapers(r.data);
    } catch { toast.error('Failed.'); }
  }

  async function submitQPForReview(id) {
    try {
      await api.put(`/exams/question-papers/${id}/submit-review`);
      toast.success('Submitted for review.');
      const r = await api.get('/exams/question-papers');
      setQuestionPapers(r.data);
    } catch { toast.error('Failed.'); }
  }

  async function generateMasking() {
    if (!selectedExam) return toast.error('Select an exam first');
    try { const res = await api.post('/exams/masking-sheets/generate', { examination_id: selectedExam }); toast.success(res.data.message); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); }
  }

  const canManage = ['admin','registrar','hod'].includes(user.role);

  const tabs = [
    { id: 'hall-tickets',    label: 'Hall Tickets',     icon: ClipboardList },
    { id: 'question-papers', label: 'QP Creation',      icon: FileText },
    { id: 'qp-review',       label: 'QP Review',        icon: Eye },
    { id: 'answer-sheets',   label: 'Answer Sheets',    icon: UserCheck },
    { id: 'seating',         label: 'Seating Plan',     icon: Map },
    { id: 'grading',         label: 'Grading Schema',   icon: Award },
    { id: 'certificates',    label: 'Certificates',     icon: Award },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Examination Management</h1>
        <p className="text-gray-500 text-sm mt-1">Hall Tickets · Question Papers · Seating · Masking · Certificates</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            ['Hall Tickets',   stats.hallTickets,    'text-msrim-blue'],
            ['Question Papers',stats.questionPapers, 'text-green-600'],
            ['Answer Sheets',  stats.answerSheets,   'text-purple-600'],
            ['Marks Entered',  stats.marksEntered,   'text-teal-600'],
            ['Backlogs',       stats.backlogs,       'text-orange-600'],
            ['Declarations',   stats.declarations,   'text-msrim-orange'],
          ].map(([l,v,c]) => (
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
              <button onClick={collectAnswerSheets} className="btn-secondary text-sm py-2"><UserCheck className="w-3 h-3" /> Collect Sheets</button>
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

      {tab === 'qp-review' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Question Paper Review</h3>
            <p className="text-xs text-gray-400">Review and approve / reject submitted question papers</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Exam</th><th className="table-th">Version</th>
                <th className="table-th">Questions</th><th className="table-th">Prepared By</th>
                <th className="table-th">Status</th><th className="table-th">Review Remarks</th>
                {canManage && <th className="table-th">Actions</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {questionPapers.map(qp => (
                  <tr key={qp.id} className="hover:bg-gray-50">
                    <td className="table-td font-medium">{qp.exam_name}</td>
                    <td className="table-td">Ver. {qp.version}</td>
                    <td className="table-td">{qp.total_questions}</td>
                    <td className="table-td">{qp.prepared_by_name || '—'}</td>
                    <td className="table-td">
                      <span className={qp.status==='approved'?'badge-green':qp.status==='under_review'?'badge-yellow':qp.status==='rejected'?'badge-red':'badge-gray'}>{qp.status}</span>
                    </td>
                    <td className="table-td text-xs text-gray-500">{qp.review_remarks || '—'}</td>
                    {canManage && (
                      <td className="table-td">
                        <div className="flex gap-1">
                          {qp.status === 'draft' && (
                            <button onClick={() => submitQPForReview(qp.id)} className="text-xs px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100">Submit for Review</button>
                          )}
                          {qp.status === 'under_review' && (
                            <>
                              <button onClick={() => approveQP(qp.id)} className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approve</button>
                              <button onClick={() => { const r = prompt('Rejection reason:'); if (r) api.put(`/exams/question-papers/${qp.id}/reject`, { remarks: r }).then(() => { toast.success('Rejected.'); api.get('/exams/question-papers').then(res => setQuestionPapers(res.data)); }); }}
                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {!questionPapers.length && <tr><td colSpan={canManage ? 7 : 6} className="table-td text-center py-8 text-gray-400">No question papers submitted for review</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'answer-sheets' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="font-semibold">Answer Sheet Management ({answerSheets.length})</h3>
            <p className="text-xs text-gray-400">Select exam above → "Collect Sheets" to register answer sheets</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="table-th">Sheet No.</th><th className="table-th">Student</th>
                <th className="table-th">Enrollment</th><th className="table-th">Exam</th>
                <th className="table-th">Evaluator</th><th className="table-th">Marks</th>
                <th className="table-th">Status</th>
                {canManage && <th className="table-th">Evaluate</th>}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {(selectedExam ? answerSheets.filter(a => a.examination_id === parseInt(selectedExam)) : answerSheets).slice(0, 30).map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="table-td font-mono text-xs text-msrim-blue font-bold">{a.answer_sheet_number}</td>
                    <td className="table-td font-medium">{a.student_name}</td>
                    <td className="table-td text-xs">{a.enrollment_number}</td>
                    <td className="table-td text-sm">{a.exam_name}</td>
                    <td className="table-td text-sm">{a.evaluator_name || '—'}</td>
                    <td className="table-td font-bold">{a.marks_awarded ?? '—'}</td>
                    <td className="table-td">
                      <span className={a.status==='finalized'?'badge-green':a.status==='evaluated'?'badge-blue':a.status==='assigned'?'badge-yellow':'badge-gray'}>{a.status}</span>
                    </td>
                    {canManage && (
                      <td className="table-td">
                        {a.status !== 'finalized' && (
                          <button onClick={() => { const m = prompt(`Enter marks for ${a.student_name}:`); if (m !== null) evaluateSheet(a.id, parseFloat(m), ''); }}
                            className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Evaluate</button>
                        )}
                        {a.status === 'evaluated' && (
                          <button onClick={() => api.put(`/exams/answer-sheets/${a.id}/finalize`).then(() => { toast.success('Finalized.'); api.get('/exams/answer-sheets').then(r => setAnswerSheets(r.data)); })}
                            className="ml-1 text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">Finalize</button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {!answerSheets.length && <tr><td colSpan={canManage ? 8 : 7} className="table-td text-center py-8 text-gray-400">No answer sheets. Select exam and click "Collect Sheets".</td></tr>}
              </tbody>
            </table>
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
