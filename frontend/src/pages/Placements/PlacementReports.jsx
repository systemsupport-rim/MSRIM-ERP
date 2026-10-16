import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Briefcase, Award, Building2, Download } from 'lucide-react';

const COLORS = ['#1a56db','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

export default function PlacementReports() {
  const [data, setData] = useState(null);
  const [batchData, setBatchData] = useState(null);
  const [batch, setBatch] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => { fetchOverall(); }, []);
  useEffect(() => { if (tab === 'batch') fetchBatch(); }, [tab, batch]);

  async function fetchOverall() {
    setLoading(true);
    try { const r = await api.get('/jobs/stats/overview'); setData(r.data); }
    finally { setLoading(false); }
  }

  async function fetchBatch() {
    setLoading(true);
    try { const r = await api.get(`/student-placement/reports/batch/${batch}`); setBatchData(r.data); }
    catch { setBatchData(null); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Placement Reports & Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">NBA/NAAC-ready reports · Year-wise & department-wise analysis</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {[['overview','Overall Analytics'],['batch','Batch Report'],['companies','Company-wise']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-md text-sm font-medium ${tab===id?'bg-white text-msrim-blue shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div className="py-16 text-center text-gray-400">Loading reports…</div>}

      {/* Overview Tab */}
      {!loading && tab === 'overview' && data && (
        <div className="space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Companies', value: data.overview.total_companies, icon: Building2, color: 'text-msrim-blue' },
              { label: 'Total Jobs Posted', value: data.overview.total_jobs, icon: Briefcase, color: 'text-sky-600' },
              { label: 'Total Offers', value: data.overview.total_offers || 0, icon: Users, color: 'text-green-600' },
              { label: 'Avg Package', value: data.overview.avg_package ? `₹${parseFloat(data.overview.avg_package).toFixed(1)}L` : '—', icon: Award, color: 'text-msrim-orange' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className={`text-xl font-bold ${color}`}>{value ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dept-wise */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Department-wise Placements</h3>
              {data.byDept?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.byDept} margin={{ top:0,right:0,left:-20,bottom:30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dept" tick={{ fontSize:11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize:11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="placed" fill="#1a56db" radius={[4,4,0,0]} name="Placed" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm py-8 text-center">No placement data yet</p>}
            </div>

            {/* Sector-wise */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Sector-wise Placement</h3>
              {data.bySector?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.bySector} dataKey="placements" nameKey="sector" cx="50%" cy="50%" outerRadius={80}
                      label={({ sector, percent }) => `${sector} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {data.bySector.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-400 text-sm py-8 text-center">No data yet</p>}
            </div>

            {/* Drive type */}
            <div className="card">
              <h3 className="font-semibold text-gray-700 mb-4">Job Type Breakdown</h3>
              <div className="space-y-3">
                {data.byType?.map(t => (
                  <div key={t.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium capitalize">{t.type}</span>
                      <span className="text-sm text-gray-500">{t.count} jobs · {t.avg_pkg ? `₹${parseFloat(t.avg_pkg).toFixed(1)}L avg` : '—'}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-msrim-blue rounded-full" style={{ width: `${Math.min(100,(t.count/(data.overview.total_jobs||1))*100)}%` }} />
                    </div>
                  </div>
                )) || <p className="text-gray-400 text-sm">No data</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Report Tab */}
      {!loading && tab === 'batch' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Batch Year:</label>
            <select value={batch} onChange={e => setBatch(e.target.value)} className="select-field w-32">
              {[2026,2025,2024,2023,2022].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {batchData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Students', value: batchData.summary.total_students, color: 'text-msrim-blue' },
                  { label: 'Students Placed', value: batchData.summary.placed, color: 'text-green-600' },
                  { label: 'Placement %', value: batchData.summary.placement_pct + '%', color: 'text-purple-600' },
                  { label: 'Avg Package', value: batchData.summary.avg_package ? `₹${batchData.summary.avg_package.toFixed(1)}L` : '—', color: 'text-msrim-orange' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="card text-center">
                    <p className={`text-3xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>

              <div className="card p-0 overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold">Student-wise Placement Status — Batch {batch}</h3>
                  <span className="text-sm text-gray-500">{batchData.students?.length} students</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="table-th">Student</th><th className="table-th">Enroll No.</th>
                        <th className="table-th">CGPA</th><th className="table-th">Applications</th>
                        <th className="table-th">Offers</th><th className="table-th">Best Package</th>
                        <th className="table-th">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {batchData.students?.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="table-td font-medium">{s.name}</td>
                          <td className="table-td text-gray-500">{s.enrollment_number}</td>
                          <td className="table-td">{s.cgpa || '—'}</td>
                          <td className="table-td">{s.applications}</td>
                          <td className="table-td">{s.offers}</td>
                          <td className="table-td text-green-600 font-semibold">{s.best_offer ? `₹${s.best_offer}L` : '—'}</td>
                          <td className="table-td">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.offers>0?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>
                              {s.offers>0?'Placed':'Not Placed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="card text-center py-12 text-gray-400">No placement data for batch {batch}</div>
          )}
        </div>
      )}

      {/* Company-wise Tab */}
      {!loading && tab === 'companies' && data && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h3 className="font-semibold">Company-wise Hiring Summary</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="table-th">Company</th><th className="table-th">Sector</th>
                  <th className="table-th">Offers</th><th className="table-th">Avg Package</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.bySector?.length ? (
                  <tr><td colSpan={4} className="table-td text-center py-8 text-gray-400">No offer data yet</td></tr>
                ) : (
                  <tr><td colSpan={4} className="table-td text-center py-8 text-gray-400">No data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
