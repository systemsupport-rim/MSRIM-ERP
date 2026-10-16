import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart3, TrendingUp, Award, AlertCircle, Download } from 'lucide-react';

export default function YearResults() {
  const [results, setResults] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [filters, setFilters] = useState({ program_id: '', semester: '', academic_year_id: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/structure/programs'), api.get('/structure/academic-years')]).then(([p, ay]) => {
      setPrograms(p.data || []); setAcademicYears(ay.data || []);
    }).catch(() => {});
  }, []);

  function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.program_id) params.set('program_id', filters.program_id);
    if (filters.semester) params.set('semester', filters.semester);
    if (filters.academic_year_id) params.set('academic_year_id', filters.academic_year_id);
    api.get(`/exams/year-results?${params}`)
      .then(r => setResults(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const gradeColor = pct => {
    if (!pct) return 'bg-gray-100 text-gray-500';
    if (pct >= 75) return 'bg-green-100 text-green-700';
    if (pct >= 60) return 'bg-blue-100 text-blue-700';
    if (pct >= 50) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const classLabel = pct => {
    if (!pct) return '—';
    if (pct >= 75) return 'Distinction';
    if (pct >= 60) return 'First Class';
    if (pct >= 50) return 'Second Class';
    if (pct >= 40) return 'Pass';
    return 'Fail';
  };

  const passing = results.filter(r => (r.percentage || 0) >= 40).length;
  const failing = results.filter(r => r.percentage !== null && (r.percentage || 0) < 40).length;
  const distinction = results.filter(r => (r.percentage || 0) >= 75).length;
  const avgPct = results.length ? (results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Year Results</h1>
        <p className="text-gray-500 text-sm mt-1">Consolidated academic results by student, program and semester</p>
      </div>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Program</label>
          <select value={filters.program_id} onChange={e => setFilters(f => ({ ...f, program_id: e.target.value }))} className="select-field w-44">
            <option value="">All Programs</option>
            {programs.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Semester</label>
          <select value={filters.semester} onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))} className="select-field w-32">
            <option value="">All</option>
            {[1,2,3,4,5,6].map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Academic Year</label>
          <select value={filters.academic_year_id} onChange={e => setFilters(f => ({ ...f, academic_year_id: e.target.value }))} className="select-field w-40">
            <option value="">All Years</option>
            {academicYears.map(ay => <option key={ay.id} value={ay.id}>{ay.name}</option>)}
          </select>
        </div>
        <button onClick={load} className="btn-primary py-2">Apply Filters</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ['Total Students', results.length, 'text-msrim-blue', BarChart3],
          ['Pass', passing, 'text-green-600', Award],
          ['Fail', failing, 'text-red-600', AlertCircle],
          ['Avg %', avgPct + '%', 'text-msrim-orange', TrendingUp],
        ].map(([l, v, c, Icon]) => (
          <div key={l} className="card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-gray-100 ${c}`}><Icon className="w-5 h-5" /></div>
            <div><p className="text-gray-400 text-xs">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Results ({results.length} students)</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading results...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Student</th>
                  <th className="table-th">Enrollment</th>
                  <th className="table-th">Program</th>
                  <th className="table-th">Sem</th>
                  <th className="table-th">Exams</th>
                  <th className="table-th">Marks</th>
                  <th className="table-th">%</th>
                  <th className="table-th">Class</th>
                  <th className="table-th">Backlogs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, idx) => (
                  <tr key={r.student_id} className="hover:bg-gray-50">
                    <td className="table-td text-gray-400">{idx + 1}</td>
                    <td className="table-td font-medium">{r.student_name}</td>
                    <td className="table-td font-mono text-xs">{r.enrollment_number}</td>
                    <td className="table-td text-xs">{r.program_code}</td>
                    <td className="table-td text-center">{r.semester}</td>
                    <td className="table-td text-center">{r.exams_appeared || 0}</td>
                    <td className="table-td text-sm">{r.total_marks_obtained ?? '—'} / {r.total_max_marks ?? '—'}</td>
                    <td className="table-td">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColor(r.percentage)}`}>
                        {r.percentage ? `${r.percentage}%` : '—'}
                      </span>
                    </td>
                    <td className="table-td">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${gradeColor(r.percentage)}`}>
                        {classLabel(r.percentage)}
                      </span>
                    </td>
                    <td className="table-td text-center">
                      {r.failures > 0
                        ? <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">{r.failures}</span>
                        : <span className="text-green-600 text-xs font-bold">—</span>}
                    </td>
                  </tr>
                ))}
                {!results.length && (
                  <tr><td colSpan={10} className="table-td text-center py-12 text-gray-400">No results found. Enter marks first.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
