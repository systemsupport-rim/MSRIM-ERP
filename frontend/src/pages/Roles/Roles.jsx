import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Shield, Users, Check, X } from 'lucide-react';

const ALL_PRIVILEGES = [
  'Academic Fee Management', 'Academic Management', 'Access Management',
  'Admission Management', 'Attendance Console', 'Bulk Attendance', 'Certificates Management',
  'Content Management', 'Course Registration', 'Curriculum Management', 'Degree Management',
  'Drive', 'EMS Question Bank', 'EMS Result Declaration', 'Exam Enrollment Management',
  'Examination Management', 'Faculty Records Management', 'Fee Management', 'Feedback Management',
  'Gate Pass Management', 'Hostel Management', 'HR Management', 'ID Card Configuration',
  'Infrastructure Management', 'Inventory Management', 'Leave Management',
  'Library Management', 'LMS Management', 'Mentor Management', 'NAAC Management',
  'Notices', 'OBE Dashboard', 'Parent Management', 'Placement Management',
  'Post Moderation', 'Research Management', 'Roles and Privileges', 'Scholarship Management',
  'Staff Attendance', 'Student Records', 'Survey Management', 'Timetable Management',
  'Transport Management', 'User Management', 'Venue Booking', 'Visitor Management',
];

const ROLE_DEFAULTS = {
  admin: ALL_PRIVILEGES,
  registrar: ['Academic Management', 'Admission Management', 'Attendance Console', 'Bulk Attendance', 'Certificates Management', 'Curriculum Management', 'Degree Management', 'EMS Result Declaration', 'Exam Enrollment Management', 'Examination Management', 'Faculty Records Management', 'Fee Management', 'Hostel Management', 'Infrastructure Management', 'Leave Management', 'Library Management', 'Mentor Management', 'Notices', 'Parent Management', 'Placement Management', 'Student Records', 'Venue Booking'],
  hod: ['Academic Management', 'Attendance Console', 'Bulk Attendance', 'Curriculum Management', 'Feedback Management', 'Leave Management', 'LMS Management', 'Mentor Management', 'NAAC Management', 'Notices', 'OBE Dashboard', 'Placement Management', 'Student Records'],
  faculty: ['Attendance Console', 'Bulk Attendance', 'EMS Result Declaration', 'Feedback Management', 'Leave Management', 'LMS Management', 'Mentor Management', 'Notices', 'OBE Dashboard'],
  student: ['Academic Fee Management', 'Attendance Console', 'Drive', 'Feedback Management', 'Hostel Management', 'Library Management', 'LMS Management', 'Notices', 'OBE Dashboard', 'Placement Management', 'Venue Booking'],
  accounts: ['Academic Fee Management', 'Fee Management', 'Notices'],
  librarian: ['Library Management', 'Notices'],
  placement: ['Notices', 'Placement Management'],
};

export default function RolesPrivileges() {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/students', { params: { search: '' } }).then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const rolePrivileges = ROLE_DEFAULTS[selectedRole] || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Roles & Privileges Management</h1>
        <p className="text-gray-500 text-sm mt-1">Configure access control for MSRIM Digital Campus</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role selector */}
        <div className="card">
          <h3 className="font-semibold mb-4">System Roles</h3>
          <div className="space-y-2">
            {Object.keys(ROLE_DEFAULTS).map(role => (
              <button key={role} onClick={() => setSelectedRole(role)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedRole===role?'bg-msrim-blue text-white':'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}>
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{role}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${selectedRole===role?'bg-white/20 text-white':'bg-gray-200 text-gray-600'}`}>
                  {ROLE_DEFAULTS[role]?.length || 0} privileges
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Privileges matrix */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold capitalize">{selectedRole} — Privileges ({rolePrivileges.length}/{ALL_PRIVILEGES.length})</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600"><Check className="w-4 h-4" /> Allowed</span>
              <span className="flex items-center gap-1 text-gray-400"><X className="w-4 h-4" /> Not allowed</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ALL_PRIVILEGES.map(priv => {
              const hasAccess = rolePrivileges.includes(priv);
              return (
                <div key={priv} className={`flex items-center gap-3 p-2.5 rounded-lg ${hasAccess?'bg-green-50':'bg-gray-50'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${hasAccess?'bg-green-500':'bg-gray-300'}`}>
                    {hasAccess ? <Check className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-xs font-medium ${hasAccess?'text-green-800':'text-gray-400'}`}>{priv}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Role summary */}
      <div className="card">
        <h3 className="font-semibold mb-4">Role Comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b">
              <th className="table-th">Module</th>
              {Object.keys(ROLE_DEFAULTS).map(r => <th key={r} className="table-th capitalize">{r}</th>)}
            </tr></thead>
            <tbody>
              {['Academic Management', 'Fee Management', 'Attendance Console', 'Examination Management', 'LMS Management', 'Placement Management', 'Library Management', 'Hostel Management', 'Parent Management', 'OBE Dashboard', 'Roles and Privileges'].map(priv => (
                <tr key={priv} className="border-b hover:bg-gray-50">
                  <td className="table-td font-medium">{priv}</td>
                  {Object.keys(ROLE_DEFAULTS).map(r => (
                    <td key={r} className="table-td text-center">
                      {ROLE_DEFAULTS[r]?.includes(priv) ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-gray-300 mx-auto" />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
