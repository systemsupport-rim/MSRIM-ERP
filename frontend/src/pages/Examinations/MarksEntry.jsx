import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Save, Search, ClipboardList } from 'lucide-react';

export default function MarksEntry() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState('');
  const [examData, setExamData] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/examinations').then(r => setExams(r.data));
  }, []);

  useEffect(() => {
    if (!selectedExam) return;
    setLoading(true);
    api.get(`/exams/marks?examination_id=${selectedExam}`)
      .then(r => {
        setExamData(r.data);
        const initial = {};
        r.data.students.forEach(s => {
          initial[s.id] = {
            marks_obtained: s.marks_obtained ?? '',
            remarks: s.result_remarks || '',
          };
        });
        setMarks(initial);
      })
      .finally(() => setLoading(false));
  }, [selectedExam]);

  function setStudentMark(studentId, field, value) {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], [field]: value } }));
  }

  async function saveMarks() {
    if (!examData) return;
    const results = examData.students
      .filter(s => marks[s.id]?.marks_obtained !== '')
      .map(s => ({
        student_id: s.id,
        examination_id: parseInt(selectedExam),
        marks_obtained: parseFloat(marks[s.id]?.marks_obtained) || 0,
        remarks: marks[s.id]?.remarks || '',
      }));
    if (!results.length) return toast.error('No marks to save.');
    setSaving(true);
    try {
      await api.post('/exams/marks/bulk', { results });
      toast.success(`${results.length} marks saved successfully!`);
      const r = await api.get(`/exams/marks?examination_id=${selectedExam}`);
      setExamData(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save marks.');
    } finally { setSaving(false); }
  }

  const getGrade = (marks_obtained, total) => {
    if (!total || marks_obtained === '' || marks_obtained === null) return '—';
    const pct = (parseFloat(marks_obtained) / total) * 100;
    if (pct >= 90) return 'O'; if (pct >= 80) return 'A+'; if (pct >= 70) return 'A';
    if (pct >= 60) return 'B+'; if (pct >= 50) return 'B'; if (pct >= 40) return 'C'; return 'F';
  };

  const gradeColor = g => ({ O:'text-green-700 bg-green-100', 'A+':'text-green-600 bg-green-50', A:'text-blue-600 bg-blue-50', 'B+':'text-blue-500 bg-blue-50', B:'text-indigo-500 bg-indigo-50', C:'text-yellow-600 bg-yellow-50', F:'text-red-600 bg-red-100', '—':'text-gray-400 bg-gray-50' }[g] || 'text-gray-400 bg-gray-50');

  const canEdit = ['admin','registrar','faculty','hod'].includes(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Marks Entry</h1>
        <p className="text-gray-500 text-sm mt-1">Enter marks for students examination-wise</p>
      </div>

      <div className="card p-4 flex items-end gap-4 flex-wrap">
        <div className="flex-1 min-w-64">
          <label className="block text-sm font-medium mb-1">Select Examination</label>
          <select value={selectedExam} onChange={e => setSelectedExam(e.target.value)} className="select-field">
            <option value="">Choose examination...</option>
            {exams.map(e => (
              <option key={e.id} value={e.id}>{e.course_code} — {e.name} ({e.exam_type}){e.exam_date ? ` · ${new Date(e.exam_date).toLocaleDateString()}` : ''}</option>
            ))}
          </select>
        </div>
        {examData && canEdit && (
          <button onClick={saveMarks} disabled={saving} className="btn-primary py-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save All Marks'}
          </button>
        )}
      </div>

      {examData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Exam', examData.exam.name],
              ['Course', examData.exam.course_name],
              ['Total Marks', examData.exam.total_marks],
              ['Passing Marks', examData.exam.passing_marks],
            ].map(([l, v]) => (
              <div key={l} className="card p-3">
                <p className="text-gray-400 text-xs">{l}</p>
                <p className="font-bold text-gray-800">{v}</p>
              </div>
            ))}
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-msrim-blue" />
                Students ({examData.students.length})
              </h3>
              <p className="text-xs text-gray-400">
                Entered: {examData.students.filter(s => s.marks_obtained !== null).length} /
                Pending: {examData.students.filter(s => s.marks_obtained === null).length}
              </p>
            </div>
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="table-th">#</th>
                      <th className="table-th">Student</th>
                      <th className="table-th">Enrollment No.</th>
                      <th className="table-th">Marks Obtained <span className="text-gray-400 font-normal">/ {examData.exam.total_marks}</span></th>
                      <th className="table-th">Grade</th>
                      <th className="table-th">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {examData.students.map((s, idx) => {
                      const grade = getGrade(marks[s.id]?.marks_obtained, examData.exam.total_marks);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="table-td text-gray-400">{idx + 1}</td>
                          <td className="table-td font-medium">{s.name}</td>
                          <td className="table-td font-mono text-xs">{s.enrollment_number}</td>
                          <td className="table-td">
                            {canEdit ? (
                              <input
                                type="number"
                                min="0"
                                max={examData.exam.total_marks}
                                value={marks[s.id]?.marks_obtained ?? ''}
                                onChange={e => setStudentMark(s.id, 'marks_obtained', e.target.value)}
                                className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-msrim-blue"
                                placeholder="—"
                              />
                            ) : (
                              <span className="font-bold">{s.marks_obtained ?? '—'}</span>
                            )}
                          </td>
                          <td className="table-td">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${gradeColor(grade)}`}>{grade}</span>
                          </td>
                          <td className="table-td">
                            {canEdit ? (
                              <input
                                type="text"
                                value={marks[s.id]?.remarks || ''}
                                onChange={e => setStudentMark(s.id, 'remarks', e.target.value)}
                                className="w-40 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-msrim-blue"
                                placeholder="Optional"
                              />
                            ) : (
                              <span className="text-gray-500 text-sm">{s.result_remarks || '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button onClick={saveMarks} disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save All Marks'}
              </button>
            </div>
          )}
        </>
      )}

      {!selectedExam && (
        <div className="card p-12 text-center text-gray-400">
          <Search className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">Select an examination to enter marks</p>
        </div>
      )}
    </div>
  );
}
