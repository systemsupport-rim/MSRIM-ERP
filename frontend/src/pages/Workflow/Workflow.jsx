import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { Workflow, CheckCircle2, Clock, XCircle, AlertTriangle, Plus, ChevronRight, Zap, BarChart3, GitBranch, Users, ArrowRight, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const statusColor = { pending: 'badge-yellow', in_progress: 'badge-blue', approved: 'badge-green', rejected: 'badge-red', cancelled: 'badge-gray' };
const priorityColor = { low: 'badge-gray', normal: 'badge-blue', high: 'badge-orange', urgent: 'badge-red' };

const typeConfig = {
  leave: { label: 'Leave Request', color: 'bg-blue-500', icon: '🏖️' },
  purchase: { label: 'Purchase Request', color: 'bg-orange-500', icon: '🛒' },
  budget: { label: 'Budget Approval', color: 'bg-green-500', icon: '💰' },
  admission: { label: 'Admission Process', color: 'bg-purple-500', icon: '🎓' },
  custom: { label: 'Custom Workflow', color: 'bg-gray-500', icon: '⚙️' },
};

export default function WorkflowPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [instances, setInstances] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showDefModal, setShowDefModal] = useState(false);
  const [newInstance, setNewInstance] = useState({ workflow_id: '', title: '', data: {} });
  const [newDef, setNewDef] = useState({ name: '', type: 'leave', description: '' });

  useEffect(() => { loadAll(); }, [tab]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, inst, tasks, defs] = await Promise.all([
        api.get('/workflow/stats'),
        api.get('/workflow/instances'),
        api.get('/workflow/my-tasks'),
        api.get('/workflow/definitions'),
      ]);
      setStats(s.data); setInstances(inst.data); setMyTasks(tasks.data); setDefinitions(defs.data);
    } catch { toast.error('Failed to load workflow data'); }
    setLoading(false);
  };

  const handleAction = async (id, action) => {
    try {
      await api.put(`/workflow/instances/${id}/action`, { action });
      toast.success(`Workflow ${action}!`);
      loadAll();
    } catch { toast.error('Action failed'); }
  };

  const submitInstance = async () => {
    if (!newInstance.workflow_id || !newInstance.title) return toast.error('Fill all fields');
    try {
      await api.post('/workflow/instances', newInstance);
      toast.success('Workflow initiated!');
      setShowNewModal(false);
      setNewInstance({ workflow_id: '', title: '', data: {} });
      loadAll();
    } catch { toast.error('Failed to initiate workflow'); }
  };

  const submitDef = async () => {
    if (!newDef.name || !newDef.type) return toast.error('Fill all fields');
    try {
      await api.post('/workflow/definitions', { ...newDef, steps_config: [] });
      toast.success('Workflow definition created!');
      setShowDefModal(false);
      setNewDef({ name: '', type: 'leave', description: '' });
      loadAll();
    } catch { toast.error('Failed to create definition'); }
  };

  const tabs = ['overview', 'my-tasks', 'all-workflows', 'definitions'];

  return (
    <div className="space-y-6 fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 50%, #6366f1 0%, transparent 50%)' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-white/20 rounded-xl p-2.5"><Zap className="w-6 h-6" /></div>
              <span className="bg-white/20 text-xs font-semibold px-3 py-1 rounded-full">BRIGHT PROCESS HUB</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Intelligent Process Automation</h1>
            <p className="text-blue-200 text-sm max-w-lg">SAP-grade workflow engine for MSRIM — automate approvals, track business processes, and eliminate bottlenecks with AI-powered routing.</p>
          </div>
          <div className="hidden md:flex gap-3">
            <button onClick={() => setShowNewModal(true)} className="bg-white text-blue-900 hover:bg-blue-50 font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all">
              <Plus className="w-4 h-4" /> New Process
            </button>
            {['admin','hod','registrar'].includes(user?.role) && (
              <button onClick={() => setShowDefModal(true)} className="bg-white/20 hover:bg-white/30 font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm transition-all">
                <GitBranch className="w-4 h-4" /> Define Workflow
              </button>
            )}
          </div>
        </div>

        {stats && (
          <div className="relative mt-6 grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Total Processes', value: stats.total, icon: BarChart3, color: 'text-blue-300' },
              { label: 'My Pending', value: stats.myPending, icon: AlertTriangle, color: 'text-yellow-300' },
              { label: 'In Progress', value: stats.in_progress, icon: Clock, color: 'text-indigo-300' },
              { label: 'Approved', value: stats.approved, icon: CheckCircle2, color: 'text-green-300' },
              { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-300' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur rounded-xl p-4">
                <Icon className={`w-5 h-5 ${color} mb-2`} />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-blue-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${tab === t ? 'bg-white text-msrim-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.replace('-', ' ')}
            {t === 'my-tasks' && myTasks.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{myTasks.length}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-msrim-blue border-t-transparent rounded-full animate-spin" /></div> : (
        <>
          {/* Overview */}
          {tab === 'overview' && (
            <div className="space-y-4">
              {myTasks.length > 0 && (
                <div className="card border-l-4 border-yellow-400">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    <h2 className="font-semibold text-gray-800">Action Required — {myTasks.length} Pending Approval{myTasks.length > 1 ? 's' : ''}</h2>
                  </div>
                  <div className="space-y-3">
                    {myTasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{typeConfig[task.workflow_type]?.icon || '📋'}</span>
                          <div>
                            <p className="font-medium text-sm">{task.title}</p>
                            <p className="text-xs text-gray-500">{task.workflow_name} · Initiated by {task.initiated_by_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleAction(task.instance_id, 'approved')} className="bg-green-100 hover:bg-green-200 text-green-700 p-2 rounded-lg transition-all"><Check className="w-4 h-4" /></button>
                          <button onClick={() => handleAction(task.instance_id, 'rejected')} className="bg-red-100 hover:bg-red-200 text-red-700 p-2 rounded-lg transition-all"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-msrim-blue" /> Recent Processes</h3>
                  <div className="space-y-3">
                    {instances.slice(0, 6).map(inst => (
                      <div key={inst.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{typeConfig[inst.workflow_type]?.icon || '📋'}</span>
                          <div>
                            <p className="text-sm font-medium">{inst.title}</p>
                            <p className="text-xs text-gray-400">{inst.workflow_name} · {inst.initiated_by_name}</p>
                          </div>
                        </div>
                        <span className={statusColor[inst.status]}>{inst.status.replace('_', ' ')}</span>
                      </div>
                    ))}
                    {instances.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No workflows initiated yet</p>}
                  </div>
                </div>
                <div className="card">
                  <h3 className="font-semibold mb-4 flex items-center gap-2"><GitBranch className="w-4 h-4 text-msrim-blue" /> Workflow Definitions</h3>
                  <div className="space-y-3">
                    {definitions.map(def => {
                      const cfg = typeConfig[def.type] || typeConfig.custom;
                      return (
                        <div key={def.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <div className={`${cfg.color} text-white p-2 rounded-lg text-sm`}><GitBranch className="w-4 h-4" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{def.name}</p>
                            <p className="text-xs text-gray-400 capitalize">{cfg.label}</p>
                          </div>
                          <span className={def.is_active ? 'badge-green' : 'badge-gray'}>{def.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                      );
                    })}
                    {definitions.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No workflow definitions yet</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* My Tasks */}
          {tab === 'my-tasks' && (
            <div className="space-y-3">
              {myTasks.length === 0 ? (
                <div className="card text-center py-12">
                  <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">All caught up! No pending approvals.</p>
                </div>
              ) : myTasks.map(task => (
                <div key={task.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-yellow-100 rounded-xl p-3 text-2xl">{typeConfig[task.workflow_type]?.icon || '📋'}</div>
                      <div>
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{task.workflow_name}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> {task.initiated_by_name}</span>
                          <span className="text-xs text-gray-400">Step {task.step_number}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(task.instance_id, 'approved')} className="btn-primary text-xs py-1.5 px-3">
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button onClick={() => handleAction(task.instance_id, 'rejected')} className="btn-danger text-xs py-1.5 px-3">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Workflows */}
          {tab === 'all-workflows' && (
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Process','Type','Initiated By','Status','Steps','Date'].map(h => <th key={h} className="table-th">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {instances.map(inst => (
                      <tr key={inst.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td font-medium">{inst.title}</td>
                        <td className="table-td"><span className="text-sm">{typeConfig[inst.workflow_type]?.icon} {inst.workflow_name}</span></td>
                        <td className="table-td">{inst.initiated_by_name}</td>
                        <td className="table-td"><span className={statusColor[inst.status]}>{inst.status.replace('_', ' ')}</span></td>
                        <td className="table-td">{inst.current_step}/{inst.total_steps}</td>
                        <td className="table-td text-gray-400">{new Date(inst.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {instances.length === 0 && <div className="text-center py-8 text-gray-400">No workflow instances yet</div>}
              </div>
            </div>
          )}

          {/* Definitions */}
          {tab === 'definitions' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {definitions.map(def => {
                const cfg = typeConfig[def.type] || typeConfig.custom;
                return (
                  <div key={def.id} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`${cfg.color} text-white p-3 rounded-xl text-xl`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{def.name}</h3>
                        <p className="text-xs text-gray-400">{cfg.label}</p>
                      </div>
                      <span className={def.is_active ? 'badge-green' : 'badge-gray'}>{def.is_active ? 'Active' : 'Off'}</span>
                    </div>
                    {def.description && <p className="text-sm text-gray-500 mb-3">{def.description}</p>}
                    <p className="text-xs text-gray-400">Created by {def.created_by_name || 'Admin'}</p>
                  </div>
                );
              })}
              {definitions.length === 0 && (
                <div className="col-span-3 card text-center py-12">
                  <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400">No workflow definitions. Create one to start automating processes.</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* New Instance Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-msrim-blue" /> Initiate New Process</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Workflow Type</label>
                <select className="select-field" value={newInstance.workflow_id} onChange={e => setNewInstance(p => ({ ...p, workflow_id: e.target.value }))}>
                  <option value="">Select workflow...</option>
                  {definitions.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Process Title</label>
                <input className="input-field" placeholder="e.g. Leave request for 3 days" value={newInstance.title} onChange={e => setNewInstance(p => ({ ...p, title: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={submitInstance} className="btn-primary flex-1">Initiate <ArrowRight className="w-4 h-4" /></button>
              <button onClick={() => setShowNewModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New Definition Modal */}
      {showDefModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><GitBranch className="w-5 h-5 text-msrim-blue" /> Define Workflow</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Workflow Name</label>
                <input className="input-field" placeholder="e.g. Faculty Leave Approval" value={newDef.name} onChange={e => setNewDef(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Type</label>
                <select className="select-field" value={newDef.type} onChange={e => setNewDef(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(typeConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
                <textarea className="input-field" rows="2" placeholder="Describe this workflow..." value={newDef.description} onChange={e => setNewDef(p => ({ ...p, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={submitDef} className="btn-primary flex-1">Create</button>
              <button onClick={() => setShowDefModal(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
