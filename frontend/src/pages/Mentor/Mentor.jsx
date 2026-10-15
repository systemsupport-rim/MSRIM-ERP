import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { UserCheck, Plus, X, Calendar } from 'lucide-react';

export default function MentorMentee() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [stats, setStats] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [showMeeting, setShowMeeting] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/mentor/assignments'), api.get('/mentor/stats')])
      .then(([a, s]) => { setAssignments(a.data); setStats(s.data); }).finally(() => setLoading(false));
  }, []);

  const canManage = ['admin','registrar','hod'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mentor-Mentee Programme</h1>
          <p className="text-gray-500 text-sm mt-1">Faculty mentoring students for holistic development</p>
        </div>
        {canManage && <button className="btn-primary" onClick={() => setShowAssign(true)}><Plus className="w-4 h-4" /> Assign Mentor</button>}
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-gray-500 text-sm">Active Mentors</p><p className="text-3xl font-bold text-msrim-blue">{stats.mentors}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Mentees</p><p className="text-3xl font-bold text-green-600">{stats.mentees}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Total Meetings</p><p className="text-3xl font-bold text-msrim-orange">{stats.totalMeetings}</p></div>
          <div className="card"><p className="text-gray-500 text-sm">Unassigned</p><p className="text-3xl font-bold text-red-500">{stats.unassignedStudents}</p></div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? <div className="card text-center py-12"><div className="w-6 h-6 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin mx-auto" /></div>
        : assignments.map(a => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-10 h-10 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">{a.mentor_name?.charAt(0)}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{a.mentor_name}</span>
                    <span className="text-gray-400 text-sm">→ Mentor of</span>
                    <span className="font-bold text-msrim-blue">{a.mentee_name}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{a.designation}</span>
                    <span>·</span>
                    <span>Sem {a.semester} · Section {a.section}</span>
                    <span>·</span>
                    <span>{a.enrollment_number}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>📅 Assigned: {new Date(a.assigned_date).toLocaleDateString()}</span>
                    <span>·</span>
                    <span>💬 {a.meeting_count} meetings</span>
                    {a.last_meeting_date && <><span>·</span><span>Last: {new Date(a.last_meeting_date).toLocaleDateString()}</span></>}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowMeeting(a)} className="btn-secondary text-sm py-1.5 flex-shrink-0">
                <Calendar className="w-3 h-3" /> Log Meeting
              </button>
            </div>
          </div>
        ))}
        {!loading && !assignments.length && <div className="card text-center py-12 text-gray-400"><UserCheck className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No mentor assignments</p></div>}
      </div>

      {showAssign && canManage && <AssignMentorModal onClose={() => { setShowAssign(false); api.get('/mentor/assignments').then(r => setAssignments(r.data)); }} />}
      {showMeeting && <LogMeetingModal assignment={showMeeting} onClose={() => { setShowMeeting(null); api.get('/mentor/assignments').then(r => setAssignments(r.data)); }} />}
    </div>
  );
}

function AssignMentorModal({ onClose }) {
  const [form, setForm] = useState({ mentor_id:'', mentee_id:'', academic_year_id:'1' });
  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  useEffect(() => {
    Promise.all([api.get('/faculty'), api.get('/students')]).then(([f,s]) => { setFaculty(f.data); setStudents(s.data); });
  }, []);
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/mentor/assignments', form); toast.success('Mentor assigned!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Already assigned'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b"><h2 className="font-bold text-xl">Assign Mentor</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div><label className="block text-sm font-medium mb-1">Mentor (Faculty) *</label><select required value={form.mentor_id} onChange={e=>set('mentor_id',e.target.value)} className="select-field"><option value="">Select</option>{faculty.map(f=><option key={f.id} value={f.id}>{f.name} ({f.designation})</option>)}</select></div>
          <div><label className="block text-sm font-medium mb-1">Mentee (Student) *</label><select required value={form.mentee_id} onChange={e=>set('mentee_id',e.target.value)} className="select-field"><option value="">Select</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} ({s.enrollment_number})</option>)}</select></div>
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Assigning...':'Assign'}</button></div>
        </form>
      </div>
    </div>
  );
}

function LogMeetingModal({ assignment, onClose }) {
  const [form, setForm] = useState({ assignment_id: assignment.id, meeting_date: new Date().toISOString().split('T')[0], duration_minutes:'30', topics_discussed:'', action_points:'', next_meeting_date:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));
  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try { await api.post('/mentor/meetings', form); toast.success('Meeting logged!'); onClose(); }
    catch(err) { toast.error(err.response?.data?.error||'Failed'); } finally { setLoading(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <div><h2 className="font-bold text-xl">Log Meeting</h2><p className="text-gray-500 text-sm">{assignment.mentor_name} → {assignment.mentee_name}</p></div>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Meeting Date *</label><input required type="date" value={form.meeting_date} onChange={e=>set('meeting_date',e.target.value)} className="input-field" /></div>
          <div><label className="block text-sm font-medium mb-1">Duration (mins)</label><input type="number" value={form.duration_minutes} onChange={e=>set('duration_minutes',e.target.value)} className="input-field" /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Topics Discussed</label><textarea value={form.topics_discussed} onChange={e=>set('topics_discussed',e.target.value)} className="input-field" rows={3} /></div>
          <div className="col-span-2"><label className="block text-sm font-medium mb-1">Action Points</label><textarea value={form.action_points} onChange={e=>set('action_points',e.target.value)} className="input-field" rows={2} /></div>
          <div><label className="block text-sm font-medium mb-1">Next Meeting Date</label><input type="date" value={form.next_meeting_date} onChange={e=>set('next_meeting_date',e.target.value)} className="input-field" /></div>
          <div className="col-span-2 flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':'Log Meeting'}</button></div>
        </form>
      </div>
    </div>
  );
}
