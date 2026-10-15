import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { DollarSign, CheckCircle, Clock, Plus, X, Receipt } from 'lucide-react';

export default function Fees() {
  const { user } = useAuth();
  if (user.role === 'student') return <StudentFees />;
  return <AdminFees />;
}

function StudentFees() {
  const [data, setData] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students').then(async r => {
      const stu = r.data[0];
      if (stu) {
        const [summary, pays] = await Promise.all([
          api.get(`/fees/student/${stu.id}/summary`),
          api.get('/fees/payments')
        ]);
        setData(summary.data); setPayments(pays.data);
      }
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Fee Details</h1>
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-gradient-to-br from-msrim-blue to-msrim-blue-light text-white">
              <p className="text-blue-100 text-sm">Total Fee</p>
              <p className="text-3xl font-bold mt-1">₹{(data.totalDue||0).toLocaleString()}</p>
            </div>
            <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
              <p className="text-green-100 text-sm">Amount Paid</p>
              <p className="text-3xl font-bold mt-1">₹{(data.totalPaid||0).toLocaleString()}</p>
            </div>
            <div className={`card ${data.pending > 0 ? 'bg-gradient-to-br from-red-500 to-red-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'} text-white`}>
              <p className="text-sm opacity-80">Pending</p>
              <p className="text-3xl font-bold mt-1">₹{(data.pending||0).toLocaleString()}</p>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-4">Fee Structure</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b"><th className="table-th">Fee Type</th><th className="table-th">Amount</th><th className="table-th">Due Date</th><th className="table-th">Semester</th></tr></thead>
                <tbody>
                  {(data.structures||[]).map(s => (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="table-td font-medium">{s.fee_type}</td>
                      <td className="table-td font-semibold">₹{s.amount.toLocaleString()}</td>
                      <td className="table-td">{s.due_date ? new Date(s.due_date).toLocaleDateString() : '—'}</td>
                      <td className="table-td">Semester {s.semester}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-msrim-orange" /> Payment History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b"><th className="table-th">Receipt No</th><th className="table-th">Fee Type</th><th className="table-th">Amount</th><th className="table-th">Date</th><th className="table-th">Mode</th><th className="table-th">Status</th></tr></thead>
            <tbody>
              {payments.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="table-td font-mono text-xs">{p.receipt_number}</td>
                  <td className="table-td">{p.fee_type}</td>
                  <td className="table-td font-semibold text-green-700">₹{p.amount_paid.toLocaleString()}</td>
                  <td className="table-td">{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td className="table-td capitalize">{p.payment_mode}</td>
                  <td className="table-td"><span className={p.status==='paid'?'badge-green':'badge-yellow'}>{p.status}</span></td>
                </tr>
              ))}
              {!payments.length && <tr><td colSpan={6} className="table-td text-center text-gray-400 py-6">No payment records</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminFees() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/fees/payments'), api.get('/fees/stats')])
      .then(([p, s]) => { setPayments(p.data); setStats(s.data); }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Record Payment</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-500 text-sm">Total Collected</p>
          <p className="text-3xl font-bold text-msrim-blue">₹{((stats?.totalCollected||0)/100000).toFixed(2)}L</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">Pending Payments</p>
          <p className="text-3xl font-bold text-red-500">{stats?.pendingCount || 0}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">Recent Transactions</p>
          <p className="text-3xl font-bold text-green-600">{payments.length}</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Payment Records</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="table-th">Student</th><th className="table-th">Enrollment</th>
              <th className="table-th">Fee Type</th><th className="table-th">Amount</th>
              <th className="table-th">Date</th><th className="table-th">Mode</th>
              <th className="table-th">Receipt</th><th className="table-th">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? <tr><td colSpan={8} className="table-td text-center py-8"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              : payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="table-td font-medium">{p.student_name}</td>
                  <td className="table-td font-mono text-xs">{p.enrollment_number}</td>
                  <td className="table-td">{p.fee_type}</td>
                  <td className="table-td font-bold text-green-700">₹{p.amount_paid.toLocaleString()}</td>
                  <td className="table-td">{new Date(p.payment_date).toLocaleDateString()}</td>
                  <td className="table-td capitalize">{p.payment_mode}</td>
                  <td className="table-td font-mono text-xs text-gray-500">{p.receipt_number}</td>
                  <td className="table-td"><span className={p.status==='paid'?'badge-green':p.status==='pending'?'badge-yellow':'badge-gray'}>{p.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddPaymentModal onClose={() => { setShowAdd(false); api.get('/fees/payments').then(r => setPayments(r.data)); }} />}
    </div>
  );
}

function AddPaymentModal({ onClose }) {
  const [form, setForm] = useState({ student_id:'',fee_structure_id:'',amount_paid:'',payment_mode:'online',transaction_id:'',remarks:'' });
  const [students, setStudents] = useState([]);
  const [structures, setStructures] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/students'), api.get('/fees/structures')]).then(([s,f]) => { setStudents(s.data); setStructures(f.data); });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await api.post('/fees/payments', form);
      toast.success(`Payment recorded! Receipt: ${res.data.receipt_number}`); onClose();
    } catch(err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="font-bold text-xl">Record Fee Payment</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student <span className="text-red-500">*</span></label>
            <select required value={form.student_id} onChange={e => set('student_id',e.target.value)} className="select-field">
              <option value="">Select Student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.enrollment_number})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fee Type <span className="text-red-500">*</span></label>
            <select required value={form.fee_structure_id} onChange={e => set('fee_structure_id',e.target.value)} className="select-field">
              <option value="">Select Fee Type</option>
              {structures.map(s => <option key={s.id} value={s.id}>{s.fee_type} — ₹{s.amount.toLocaleString()} (Sem {s.semester})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount <span className="text-red-500">*</span></label>
              <input required type="number" value={form.amount_paid} onChange={e => set('amount_paid',e.target.value)} className="input-field" placeholder="125000" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Mode</label>
              <select value={form.payment_mode} onChange={e => set('payment_mode',e.target.value)} className="select-field">
                {['online','cash','dd','cheque'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Transaction ID</label>
            <input value={form.transaction_id} onChange={e => set('transaction_id',e.target.value)} className="input-field" placeholder="TXN123..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Processing...' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
