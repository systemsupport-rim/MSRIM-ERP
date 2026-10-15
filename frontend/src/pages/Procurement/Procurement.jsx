import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { ShoppingCart, Package, Truck, Building2, BarChart3, Plus, AlertTriangle, CheckCircle, Clock, Star, Check, X, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const formatINR = (n) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : `₹${n||0}`;
const statusExp = { pending: 'badge-yellow', approved: 'badge-green', po_raised: 'badge-blue', received: 'badge-green', rejected: 'badge-red' };
const poStatus = { draft: 'badge-gray', sent: 'badge-blue', partial_received: 'badge-yellow', received: 'badge-green', cancelled: 'badge-red' };
const priorityCol = { low: 'badge-gray', normal: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };

export default function Procurement() {
  const { user } = useAuth();
  const [tab, setTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPRModal, setShowPRModal] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [prForm, setPrForm] = useState({ department: '', item_description: '', quantity: '', unit: 'nos', estimated_cost: '', priority: 'normal', required_by: '' });
  const [vendorForm, setVendorForm] = useState({ name: '', code: '', category: '', contact_person: '', email: '', phone: '', address: '', gstin: '' });
  const [poForm, setPoForm] = useState({ pr_id: '', vendor_id: '', total_amount: '', tax_amount: '', delivery_date: '' });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [st, v, r, o, inv] = await Promise.all([
        api.get('/procurement/stats'),
        api.get('/procurement/vendors'),
        api.get('/procurement/requisitions'),
        api.get('/procurement/orders'),
        api.get('/procurement/inventory'),
      ]);
      setStats(st.data); setVendors(v.data); setRequisitions(r.data); setOrders(o.data); setInventory(inv.data);
    } catch { toast.error('Failed to load procurement data'); }
    setLoading(false);
  };

  const submitPR = async () => {
    if (!prForm.item_description || !prForm.quantity) return toast.error('Fill required fields');
    try { await api.post('/procurement/requisitions', prForm); toast.success('Purchase Requisition raised!'); setShowPRModal(false); setPrForm({ department:'',item_description:'',quantity:'',unit:'nos',estimated_cost:'',priority:'normal',required_by:'' }); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitVendor = async () => {
    if (!vendorForm.name || !vendorForm.code) return toast.error('Name and code required');
    try { await api.post('/procurement/vendors', vendorForm); toast.success('Vendor registered!'); setShowVendorModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const submitPO = async () => {
    if (!poForm.vendor_id || !poForm.total_amount) return toast.error('Fill required fields');
    try { await api.post('/procurement/orders', poForm); toast.success('Purchase Order created!'); setShowPOModal(false); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const approvePR = async (id, action) => {
    try { await api.put(`/procurement/requisitions/${id}/action`, { action }); toast.success(`PR ${action}d!`); loadAll(); }
    catch { toast.error('Failed'); }
  };

  const isAdmin = ['admin','accounts','hod'].includes(user?.role);
  const tabs = ['dashboard','requisitions','purchase-orders','vendors','inventory'];

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-900 via-amber-900 to-yellow-900 p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 50%, #f97316 0%, transparent 50%), radial-gradient(circle at 75% 50%, #eab308 0%, transparent 50%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 rounded-xl p-2.5"><ShoppingCart className="w-6 h-6" /></div>
              <span className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">SAP MM EQUIVALENT · SMART PROCUREMENT</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Procurement & Materials Management</h1>
            <p className="text-orange-200 text-sm max-w-lg">End-to-end procurement — from purchase requisition to delivery. Vendor management, PO tracking, and real-time inventory for MSRIM.</p>
          </div>
          <div className="hidden md:flex gap-2">
            <button onClick={() => setShowPRModal(true)} className="bg-white text-orange-900 hover:bg-orange-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Raise PR
            </button>
            {isAdmin && (
              <button onClick={() => setShowVendorModal(true)} className="bg-white/20 hover:bg-white/30 font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" /> Add Vendor
              </button>
            )}
          </div>
        </div>
        {stats && (
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Active Vendors', value: stats.totalVendors, icon: Building2, color: 'text-amber-300' },
              { label: 'Total PRs', value: stats.totalPRs, icon: ShoppingCart, color: 'text-orange-300' },
              { label: 'Pending PRs', value: stats.pendingPRs, icon: Clock, color: 'text-yellow-300' },
              { label: 'PO Value', value: formatINR(stats.poValue), icon: BarChart3, color: 'text-red-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-orange-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock Alert */}
      {stats?.lowStock > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700 font-medium">{stats.lowStock} inventory item{stats.lowStock > 1 ? 's' : ''} below minimum stock level — review required.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-shrink-0 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.replace('-', ' ')}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          {/* Dashboard */}
          {tab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <h3 className="font-semibold mb-4">Recent Requisitions</h3>
                {stats?.recentPRs?.map(pr => (
                  <div key={pr.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{pr.item_description}</p>
                      <p className="text-xs text-gray-400">{pr.pr_number} · {pr.requested_by_name}</p>
                    </div>
                    <span className={priorityCol[pr.priority]}>{pr.priority}</span>
                  </div>
                ))}
                {!stats?.recentPRs?.length && <p className="text-gray-400 text-sm text-center py-4">No requisitions yet</p>}
              </div>
              <div className="card">
                <h3 className="font-semibold mb-4 flex items-center gap-2"><Package className="w-4 h-4" /> Inventory Status</h3>
                <div className="space-y-2">
                  {inventory.slice(0, 6).map(item => {
                    const pct = item.min_stock > 0 ? (item.current_stock / item.min_stock) * 100 : 100;
                    return (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <p className="text-xs font-medium truncate">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.current_stock} {item.unit}</p>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct < 50 ? '#ef4444' : pct < 100 ? '#f59e0b' : '#10b981' }} />
                          </div>
                        </div>
                        {pct < 100 && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                      </div>
                    );
                  })}
                  {inventory.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No inventory items</p>}
                </div>
              </div>
            </div>
          )}

          {/* Requisitions */}
          {tab === 'requisitions' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Purchase Requisitions ({requisitions.length})</h3>
                <button onClick={() => setShowPRModal(true)} className="btn-orange text-sm"><Plus className="w-4 h-4" /> Raise PR</button>
              </div>
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr>{['PR #','Item','Department','Qty','Est. Cost','Priority','Status','Action'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {requisitions.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="table-td font-mono text-xs text-msrim-blue">{r.pr_number}</td>
                          <td className="table-td font-medium">{r.item_description}</td>
                          <td className="table-td">{r.department}</td>
                          <td className="table-td">{r.quantity} {r.unit}</td>
                          <td className="table-td">{r.estimated_cost ? formatINR(r.estimated_cost) : '—'}</td>
                          <td className="table-td"><span className={priorityCol[r.priority]}>{r.priority}</span></td>
                          <td className="table-td"><span className={statusExp[r.status]}>{r.status.replace('_',' ')}</span></td>
                          <td className="table-td">
                            {isAdmin && r.status === 'pending' && (
                              <div className="flex gap-1">
                                <button onClick={() => approvePR(r.id, 'approve')} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200"><Check className="w-3.5 h-3.5" /></button>
                                <button onClick={() => approvePR(r.id, 'reject')} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {requisitions.length === 0 && <div className="text-center py-8 text-gray-400">No requisitions raised yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* Purchase Orders */}
          {tab === 'purchase-orders' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Purchase Orders ({orders.length})</h3>
                {isAdmin && <button onClick={() => setShowPOModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Create PO</button>}
              </div>
              <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50"><tr>{['PO #','Vendor','Item','Amount','Tax','Delivery','Status'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {orders.map(o => (
                        <tr key={o.id} className="hover:bg-gray-50">
                          <td className="table-td font-mono text-xs text-msrim-blue">{o.po_number}</td>
                          <td className="table-td font-medium">{o.vendor_name}</td>
                          <td className="table-td text-xs text-gray-500">{o.pr_item || '—'}</td>
                          <td className="table-td font-semibold">{formatINR(o.total_amount)}</td>
                          <td className="table-td text-gray-400">{formatINR(o.tax_amount)}</td>
                          <td className="table-td text-gray-400">{o.delivery_date || '—'}</td>
                          <td className="table-td"><span className={poStatus[o.status]}>{o.status.replace('_',' ')}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {orders.length === 0 && <div className="text-center py-8 text-gray-400">No purchase orders yet</div>}
                </div>
              </div>
            </div>
          )}

          {/* Vendors */}
          {tab === 'vendors' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Vendor Directory ({vendors.length})</h3>
                {isAdmin && <button onClick={() => setShowVendorModal(true)} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Add Vendor</button>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vendors.map(v => (
                  <div key={v.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="bg-orange-100 rounded-xl p-3"><Building2 className="w-5 h-5 text-orange-600" /></div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400" />
                        <span className="text-xs font-medium">{v.rating || 0}</span>
                      </div>
                    </div>
                    <h3 className="font-semibold">{v.name}</h3>
                    <p className="text-xs text-gray-400 font-mono">{v.code} {v.category && `· ${v.category}`}</p>
                    {v.contact_person && <p className="text-sm text-gray-500 mt-2">👤 {v.contact_person}</p>}
                    {v.email && <p className="text-xs text-gray-400">✉ {v.email}</p>}
                    {v.phone && <p className="text-xs text-gray-400">📞 {v.phone}</p>}
                    {v.gstin && <p className="text-xs text-gray-400 mt-1 font-mono">GST: {v.gstin}</p>}
                    <div className="mt-3"><span className={v.is_active ? 'badge-green' : 'badge-gray'}>{v.is_active ? 'Active' : 'Inactive'}</span></div>
                  </div>
                ))}
                {vendors.length === 0 && <div className="col-span-3 card text-center py-8 text-gray-400">No vendors registered yet</div>}
              </div>
            </div>
          )}

          {/* Inventory */}
          {tab === 'inventory' && (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50"><tr>{['Code','Item','Category','Stock','Min Stock','Unit','Location','Status'].map(h => <th key={h} className="table-th">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.map(i => {
                      const low = i.current_stock <= i.min_stock && i.min_stock > 0;
                      return (
                        <tr key={i.id} className={`hover:bg-gray-50 ${low ? 'bg-red-50' : ''}`}>
                          <td className="table-td font-mono text-xs text-msrim-blue">{i.code}</td>
                          <td className="table-td font-medium">{i.name}</td>
                          <td className="table-td">{i.category || '—'}</td>
                          <td className={`table-td font-bold ${low ? 'text-red-600' : 'text-emerald-600'}`}>{i.current_stock}</td>
                          <td className="table-td">{i.min_stock}</td>
                          <td className="table-td">{i.unit}</td>
                          <td className="table-td text-gray-400">{i.location || '—'}</td>
                          <td className="table-td">{low ? <span className="badge-red">Low Stock</span> : <span className="badge-green">OK</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {inventory.length === 0 && <div className="text-center py-8 text-gray-400">No inventory items</div>}
              </div>
            </div>
          )}
        </>
      )}

      {/* PR Modal */}
      {showPRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-orange-500" /> Raise Purchase Requisition</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Item Description *</label><input className="input-field" placeholder="What do you need?" value={prForm.item_description} onChange={e => setPrForm(p => ({ ...p, item_description: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2"><label className="text-sm font-medium block mb-1">Quantity *</label><input className="input-field" type="number" value={prForm.quantity} onChange={e => setPrForm(p => ({ ...p, quantity: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Unit</label>
                  <select className="select-field" value={prForm.unit} onChange={e => setPrForm(p => ({ ...p, unit: e.target.value }))}>
                    {['nos','kg','ltr','pcs','set','box'].map(u => <option key={u}>{u}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Est. Cost (₹)</label><input className="input-field" type="number" value={prForm.estimated_cost} onChange={e => setPrForm(p => ({ ...p, estimated_cost: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Priority</label>
                  <select className="select-field" value={prForm.priority} onChange={e => setPrForm(p => ({ ...p, priority: e.target.value }))}>
                    {['low','normal','high','urgent'].map(p => <option key={p}>{p}</option>)}
                  </select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Department</label><input className="input-field" value={prForm.department} onChange={e => setPrForm(p => ({ ...p, department: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Required By</label><input className="input-field" type="date" value={prForm.required_by} onChange={e => setPrForm(p => ({ ...p, required_by: e.target.value }))} /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitPR} className="btn-orange flex-1">Submit PR</button>
              <button onClick={() => setShowPRModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Register Vendor</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Name *</label><input className="input-field" value={vendorForm.name} onChange={e => setVendorForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Code *</label><input className="input-field" placeholder="VND001" value={vendorForm.code} onChange={e => setVendorForm(p => ({ ...p, code: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Category</label><input className="input-field" value={vendorForm.category} onChange={e => setVendorForm(p => ({ ...p, category: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Contact Person</label><input className="input-field" value={vendorForm.contact_person} onChange={e => setVendorForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Email</label><input className="input-field" type="email" value={vendorForm.email} onChange={e => setVendorForm(p => ({ ...p, email: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Phone</label><input className="input-field" value={vendorForm.phone} onChange={e => setVendorForm(p => ({ ...p, phone: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">GSTIN</label><input className="input-field" placeholder="GST Number" value={vendorForm.gstin} onChange={e => setVendorForm(p => ({ ...p, gstin: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitVendor} className="btn-primary flex-1">Register</button>
              <button onClick={() => setShowVendorModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-msrim-blue" /> Create Purchase Order</h2>
            <div className="space-y-3">
              <div><label className="text-sm font-medium block mb-1">Link PR</label>
                <select className="select-field" value={poForm.pr_id} onChange={e => setPoForm(p => ({ ...p, pr_id: e.target.value }))}>
                  <option value="">Select PR (optional)...</option>
                  {requisitions.filter(r => r.status === 'approved').map(r => <option key={r.id} value={r.id}>{r.pr_number} — {r.item_description}</option>)}
                </select></div>
              <div><label className="text-sm font-medium block mb-1">Vendor *</label>
                <select className="select-field" value={poForm.vendor_id} onChange={e => setPoForm(p => ({ ...p, vendor_id: e.target.value }))}>
                  <option value="">Select vendor...</option>
                  {vendors.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name} ({v.code})</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium block mb-1">Total Amount *</label><input className="input-field" type="number" value={poForm.total_amount} onChange={e => setPoForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
                <div><label className="text-sm font-medium block mb-1">Tax Amount</label><input className="input-field" type="number" value={poForm.tax_amount} onChange={e => setPoForm(p => ({ ...p, tax_amount: e.target.value }))} /></div>
              </div>
              <div><label className="text-sm font-medium block mb-1">Delivery Date</label><input className="input-field" type="date" value={poForm.delivery_date} onChange={e => setPoForm(p => ({ ...p, delivery_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitPO} className="btn-primary flex-1">Create PO</button>
              <button onClick={() => setShowPOModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
