import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { TrendingUp, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Plus, CheckCircle, Clock, Banknote, Building2, FileText, Check, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import toast from 'react-hot-toast';

const formatINR = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)} K`;
  return `₹${(n || 0).toFixed(0)}`;
};

export default function Finance() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [budgetHeads, setBudgetHeads] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExpModal, setShowExpModal] = useState(false);
  const [showIncModal, setShowIncModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [expForm, setExpForm] = useState({ budget_head_id: '', department: '', amount: '', description: '', vendor_name: '', payment_mode: 'bank_transfer' });
  const [incForm, setIncForm] = useState({ budget_head_id: '', amount: '', description: '', source: '', receipt_date: '' });
  const [budgetForm, setBudgetForm] = useState({ head_id: '', academic_year_id: '1', department: '', allocated_amount: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st, heads, alloc, exp, inc] = await Promise.all([
        api.get('/finance/stats'),
        api.get('/finance/budget-heads'),
        api.get('/finance/allocations'),
        api.get('/finance/expenses'),
        api.get('/finance/income'),
      ]);
      setStats(st.data); setBudgetHeads(heads.data); setAllocations(alloc.data); setExpenses(exp.data); setIncome(inc.data);
    } catch { toast.error('Failed to load finance data'); }
    setLoading(false);
  };

  const submitExpense = async () => {
    if (!expForm.budget_head_id || !expForm.amount) return toast.error('Fill required fields');
    try { await api.post('/finance/expenses', expForm); toast.success('Expense voucher created!'); setShowExpModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitIncome = async () => {
    if (!incForm.budget_head_id || !incForm.amount) return toast.error('Fill required fields');
    try { await api.post('/finance/income', incForm); toast.success('Income entry recorded!'); setShowIncModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitBudget = async () => {
    if (!budgetForm.head_id || !budgetForm.allocated_amount) return toast.error('Fill required fields');
    try { await api.post('/finance/allocations', budgetForm); toast.success('Budget allocated!'); setShowBudgetModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const approveExpense = async (id, action) => {
    try { await api.put(`/finance/expenses/${id}/action`, { action }); toast.success(`Expense ${action}d!`); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const isAdmin = ['admin', 'accounts'].includes(user?.role);
  const tabs = ['dashboard', 'expenses', 'income', 'budget'];

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #10b981 0%, transparent 50%), radial-gradient(circle at 70% 50%, #06b6d4 0%, transparent 50%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 rounded-xl p-2.5"><Banknote className="w-6 h-6" /></div>
              <span className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">SAP FI EQUIVALENT · FINANCE MANAGEMENT</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Finance & Budget Management</h1>
            <p className="text-emerald-200 text-sm max-w-lg">Enterprise-grade financial control — budget allocation, expense tracking, income management, and real-time utilization analytics for MSRIM.</p>
          </div>
          {isAdmin && (
            <div className="hidden md:flex gap-2">
              <button onClick={() => setShowExpModal(true)} className="bg-white text-emerald-900 hover:bg-emerald-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all">
                <Plus className="w-4 h-4" /> Add Expense
              </button>
              <button onClick={() => setShowIncModal(true)} className="bg-white/20 hover:bg-white/30 font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
                <ArrowUpRight className="w-4 h-4" /> Record Income
              </button>
            </div>
          )}
        </div>

        {stats && (
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Budget', value: formatINR(stats.totalBudget), sub: 'Allocated', icon: PieChart, color: 'text-teal-300' },
              { label: 'Utilized', value: formatINR(stats.totalUtilized), sub: `${stats.utilizationRate}% used`, icon: TrendingUp, color: 'text-emerald-300' },
              { label: 'Total Income', value: formatINR(stats.totalIncome), sub: 'Received', icon: ArrowUpRight, color: 'text-cyan-300' },
              { label: 'Pending Approval', value: stats.pendingExp?.c || 0, sub: formatINR(stats.pendingExp?.v || 0), icon: Clock, color: 'text-yellow-300' },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-emerald-200 mt-0.5">{label}</p>
                <p className="text-xs text-white/50">{sub}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Budget Utilization Bar */}
      {stats && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-600" /> Budget Utilization</h3>
            <span className="text-sm font-bold text-emerald-600">{stats.utilizationRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${Math.min(parseFloat(stats.utilizationRate) || 0, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>₹0</span>
            <span>{formatINR(stats.totalBudget)} Total</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          {/* Dashboard */}
          {tab === 'dashboard' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart className="w-4 h-4 text-emerald-600" /> Budget by Head</h3>
                {stats.headStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={stats.headStats}>
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => formatINR(v)} />
                      <Tooltip formatter={v => formatINR(v)} />
                      <Bar dataKey="allocated" name="Allocated" fill="#10b981" radius={[4,4,0,0]} />
                      <Bar dataKey="utilized" name="Utilized" fill="#06b6d4" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-400 text-sm text-center py-8">No budget data yet</p>}
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4">Financial Summary</h3>
                <div className="space-y-3">
                  {[
                    ['Total Budget Allocated', formatINR(stats.totalBudget), 'text-msrim-blue'],
                    ['Total Utilized', formatINR(stats.totalUtilized), 'text-orange-600'],
                    ['Balance Remaining', formatINR(stats.totalBudget - stats.totalUtilized), 'text-emerald-600'],
                    ['Total Income Recorded', formatINR(stats.totalIncome), 'text-teal-600'],
                    ['Pending Vouchers', `${stats.pendingExp?.c || 0} (${formatINR(stats.pendingExp?.v || 0)})`, 'text-yellow-600'],
                    ['Approved Vouchers', `${stats.approvedExp?.c || 0} (${formatINR(stats.approvedExp?.v || 0)})`, 'text-green-600'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between items-center py-2 border-b last:border-0">
                      <span className="text-sm text-gray-500">{k}</span>
                      <span className={`font-semibold ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Expenses */}
          {tab === 'expenses' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Expense Vouchers ({expenses.length})</h3>
                <button onClick={() => setShowExpModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> New Voucher</button>
              </div>
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr>{['Voucher #','Head','Department','Amount','Vendor','Status','Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {expenses.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="table-td font-mono text-xs text-msrim-blue">{e.voucher_number}</td>
                          <td className="table-td">{e.head_name}</td>
                          <td className="table-td">{e.department}</td>
                          <td className="table-td font-semibold text-red-600">{formatINR(e.amount)}</td>
                          <td className="table-td">{e.vendor_name || '—'}</td>
                          <td className="table-td"><span className={{ pending:'badge-yellow',approved:'badge-green',paid:'badge-blue',rejected:'badge-red' }[e.status]}>{e.status}</span></td>
                          <td className="table-td">
                            {isAdmin && e.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={() => approveExpense(e.id, 'approve')} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => approveExpense(e.id, 'reject')} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {expenses.length === 0 && <div className="text-center py-8 text-gray-400">No expense vouchers yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* Income */}
          {tab === 'income' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Income Entries ({income.length})</h3>
                {isAdmin && <button onClick={() => setShowIncModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Record Income</button>}
              </div>
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr>{['Entry #','Head','Amount','Source','Date','Recorded By'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {income.map(i => (
                        <tr key={i.id} className="hover:bg-gray-50">
                          <td className="table-td font-mono text-xs text-msrim-blue">{i.entry_number}</td>
                          <td className="table-td">{i.head_name}</td>
                          <td className="table-td font-semibold text-emerald-600">{formatINR(i.amount)}</td>
                          <td className="table-td">{i.source || '—'}</td>
                          <td className="table-td text-gray-400">{i.receipt_date}</td>
                          <td className="table-td">{i.created_by_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {income.length === 0 && <div className="text-center py-8 text-gray-400">No income entries yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* Budget */}
          {tab === 'budget' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Budget Allocations ({allocations.length})</h3>
                {isAdmin && <button onClick={() => setShowBudgetModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Allocate Budget</button>}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {allocations.map(a => {
                  const pct = a.allocated_amount > 0 ? (a.utilized_amount / a.allocated_amount) * 100 : 0;
                  return (
                    <div key={a.id} className="card hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{a.head_name} <span className="text-xs text-gray-400">({a.head_code})</span></h4>
                          <p className="text-xs text-gray-400 capitalize">{a.category} {a.department && `· ${a.department}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-msrim-blue">{formatINR(a.allocated_amount)}</p>
                          <p className="text-xs text-gray-400">{formatINR(a.utilized_amount)} used</p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#10b981' }} />
                      </div>
                      <p className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(1)}% utilized</p>
                    </div>
                  );
                })}
                {allocations.length === 0 && <div className="card text-center py-8 text-gray-400">No budget allocations yet</div>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense Modal */}
      {showExpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowDownRight className="w-5 h-5 text-red-500" /> New Expense Voucher</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Budget Head *</label>
                <select className="select-field" value={expForm.budget_head_id} onChange={e => setExpForm(p => ({ ...p, budget_head_id: e.target.value }))}>
                  <option value="">Select head...</option>
                  {budgetHeads.filter(h => h.category !== 'income').map(h => <option key={h.id} value={h.id}>{h.name} ({h.code})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Amount (₹) *</label><input className="input-field" type="number" placeholder="0.00" value={expForm.amount} onChange={e => setExpForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Department</label><input className="input-field" placeholder="Dept." value={expForm.department} onChange={e => setExpForm(p => ({ ...p, department: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Vendor Name</label><input className="input-field" placeholder="Vendor/Supplier" value={expForm.vendor_name} onChange={e => setExpForm(p => ({ ...p, vendor_name: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Description</label><textarea className="input-field" rows="2" placeholder="Purpose of expense" value={expForm.description} onChange={e => setExpForm(p => ({ ...p, description: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Payment Mode</label>
                <select className="select-field" value={expForm.payment_mode} onChange={e => setExpForm(p => ({ ...p, payment_mode: e.target.value }))}>
                  <option value="bank_transfer">Bank Transfer</option><option value="cheque">Cheque</option><option value="cash">Cash</option><option value="upi">UPI</option>
                </select></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitExpense} className="btn-primary flex-1">Submit</button>
              <button onClick={() => setShowExpModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Income Modal */}
      {showIncModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ArrowUpRight className="w-5 h-5 text-emerald-500" /> Record Income</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Budget Head *</label>
                <select className="select-field" value={incForm.budget_head_id} onChange={e => setIncForm(p => ({ ...p, budget_head_id: e.target.value }))}>
                  <option value="">Select head...</option>
                  {budgetHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Amount (₹) *</label><input className="input-field" type="number" value={incForm.amount} onChange={e => setIncForm(p => ({ ...p, amount: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Receipt Date</label><input className="input-field" type="date" value={incForm.receipt_date} onChange={e => setIncForm(p => ({ ...p, receipt_date: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Source</label><input className="input-field" placeholder="e.g. Tuition fees, Grant" value={incForm.source} onChange={e => setIncForm(p => ({ ...p, source: e.target.value }))} /></div>
              <div><label className="text-sm font-medium block mb-1">Description</label><textarea className="input-field" rows="2" value={incForm.description} onChange={e => setIncForm(p => ({ ...p, description: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitIncome} className="btn-primary flex-1">Record</button>
              <button onClick={() => setShowIncModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Allocation Modal */}
      {showBudgetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Allocate Budget</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Budget Head *</label>
                <select className="select-field" value={budgetForm.head_id} onChange={e => setBudgetForm(p => ({ ...p, head_id: e.target.value }))}>
                  <option value="">Select head...</option>
                  {budgetHeads.map(h => <option key={h.id} value={h.id}>{h.name} ({h.code})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Amount (₹) *</label><input className="input-field" type="number" value={budgetForm.allocated_amount} onChange={e => setBudgetForm(p => ({ ...p, allocated_amount: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Department</label><input className="input-field" value={budgetForm.department} onChange={e => setBudgetForm(p => ({ ...p, department: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitBudget} className="btn-primary flex-1">Allocate</button>
              <button onClick={() => setShowBudgetModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
