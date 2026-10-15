import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  GraduationCap, Users, BookOpen, ClipboardCheck, CalendarDays, BookMarked,
  Star, UserCheck, FileText, ClipboardList, Map, Award, DollarSign, Users2,
  Briefcase, Library, BedDouble, Building, HelpCircle, Heart,
  Zap, Banknote, ShoppingCart, Network, BadgeCheck, Sparkles,
  Layers, Brain, BarChart3, HardDrive, Shield, LayoutDashboard,
  ArrowLeft, Plus, Trash2, RotateCcw, Settings2, X, Check, KeyRound, Edit2
} from 'lucide-react';

const allGroups = [
  {
    group: 'Academic',
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    headingColor: 'text-blue-700',
    items: [
      { to: '/students',   icon: GraduationCap,  label: 'Students',        desc: 'Manage student records & profiles',   roles: ['admin','registrar','hod','faculty','student'] },
      { to: '/faculty',    icon: Users,          label: 'Faculty',          desc: 'Faculty directory & management',      roles: ['admin','registrar','hod','faculty'] },
      { to: '/courses',    icon: BookOpen,       label: 'Course Catalogue', desc: 'Browse & manage courses',             roles: 'all' },
      { to: '/attendance', icon: ClipboardCheck, label: 'Attendance',       desc: 'Track & analyse attendance',          roles: 'all' },
      { to: '/timetable',  icon: CalendarDays,   label: 'Timetable',        desc: 'Class schedules & timetables',        roles: 'all' },
      { to: '/lms',        icon: BookMarked,     label: 'LMS',              desc: 'Learning management system',          roles: 'all' },
      { to: '/obe',        icon: Star,           label: 'OBE / Outcomes',   desc: 'Outcome-based education tracking',    roles: ['admin','hod','faculty','student','registrar'] },
      { to: '/mentor',     icon: UserCheck,      label: 'Mentor-Mentee',    desc: 'Mentorship assignments & tracking',   roles: ['admin','hod','faculty','student','registrar'] },
    ]
  },
  {
    group: 'Examinations',
    color: 'bg-violet-50 border-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    headingColor: 'text-violet-700',
    items: [
      { to: '/examinations',          icon: FileText,      label: 'Examinations',     desc: 'Exam schedules & management',      roles: 'all' },
      { to: '/exams/hall-tickets',    icon: ClipboardList, label: 'Hall Tickets',     desc: 'Generate & print hall tickets',    roles: 'all' },
      { to: '/exams/question-papers', icon: FileText,      label: 'Question Papers',  desc: 'Question paper repository',        roles: ['admin','registrar','hod','faculty'] },
      { to: '/exams/seating',         icon: Map,           label: 'Seating Plan',     desc: 'Exam seating arrangements',        roles: ['admin','registrar','hod','faculty'] },
      { to: '/exams/grading',         icon: Award,         label: 'Grading Schema',   desc: 'Marks & grading configuration',    roles: ['admin','registrar','hod'] },
      { to: '/exams/certificates',    icon: Award,         label: 'Certificates',     desc: 'Issue & verify certificates',      roles: ['admin','registrar'] },
    ]
  },
  {
    group: 'Finance & HR',
    color: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    headingColor: 'text-emerald-700',
    items: [
      { to: '/fees',          icon: DollarSign,    label: 'Fee Management',  desc: 'Fee collection & receipts',           roles: ['admin','registrar','accounts','student'] },
      { to: '/admissions',    icon: Users2,        label: 'Admissions',      desc: 'Student admissions pipeline',         roles: ['admin','registrar','hod'] },
      { to: '/hr',            icon: Users,         label: 'HR Management',   desc: 'Staff records & HR operations',       roles: ['admin','registrar','hod','faculty'] },
      { to: '/hr/leaves',     icon: ClipboardList, label: 'Leave Approval',  desc: 'Leave requests & approvals',          roles: ['admin','registrar','hod','faculty'] },
      { to: '/hr/portfolios', icon: Star,          label: 'Staff Portfolio', desc: 'Faculty achievements & portfolios',   roles: ['admin','hod','faculty'] },
      { to: '/parents',       icon: Users2,        label: 'Parent Mgmt',     desc: 'Parent portal & communication',       roles: ['admin','registrar'] },
    ]
  },
  {
    group: 'Campus Life',
    color: 'bg-orange-50 border-orange-100',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    headingColor: 'text-orange-700',
    items: [
      { to: '/placements',     icon: Briefcase,  label: 'Placements',      desc: 'Campus drives & job placements',    roles: 'all' },
      { to: '/library',        icon: Library,    label: 'Library',         desc: 'Books, issues & digital resources', roles: 'all' },
      { to: '/hostel',         icon: BedDouble,  label: 'Hostel',          desc: 'Hostel allotment & facilities',     roles: ['admin','registrar','student'] },
      { to: '/infrastructure', icon: Building,   label: 'Infrastructure',  desc: 'Campus facilities & assets',        roles: 'all' },
      { to: '/helpdesk',       icon: HelpCircle, label: 'Help Center',     desc: 'Raise & track support tickets',     roles: 'all' },
      { to: '/feedback',       icon: Heart,      label: 'IQAC / Feedback', desc: 'Feedback collection & IQAC',        roles: 'all' },
    ]
  },
  {
    group: 'Bright Process Hub',
    color: 'bg-yellow-50 border-yellow-100',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    headingColor: 'text-yellow-700',
    items: [
      { to: '/workflow',      icon: Zap,          label: 'Process Automation',    desc: 'Workflow & approval automation',       roles: 'all' },
      { to: '/finance',       icon: Banknote,     label: 'Finance & Budget',      desc: 'Budget heads & expense vouchers',      roles: ['admin','accounts','registrar','hod'] },
      { to: '/procurement',   icon: ShoppingCart, label: 'Procurement',           desc: 'PRs, POs, vendors & inventory',        roles: ['admin','accounts','registrar','hod','faculty'] },
      { to: '/alumni',        icon: Network,      label: 'Alumni Connect',        desc: 'Alumni directory, jobs & events',      roles: 'all' },
      { to: '/accreditation', icon: BadgeCheck,   label: 'Accreditation & NAAC',  desc: 'NAAC/NBA criteria tracking',           roles: ['admin','registrar','hod'] },
      { to: '/intelligence',  icon: Sparkles,     label: 'AI Command Center',     desc: '5 AI agents monitoring campus health', roles: ['admin','registrar','hod','faculty'] },
    ]
  },
  {
    group: 'Admin Console',
    color: 'bg-red-50 border-red-100',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    headingColor: 'text-red-700',
    items: [
      { to: '/structure',          icon: Layers,    label: 'Structure',           desc: 'Dept, program & semester config',          roles: ['admin','registrar','hod'] },
      { to: '/analytics',          icon: Brain,     label: 'Analytics / BI',      desc: 'BI dashboards & data insights',            roles: ['admin','registrar','hod'] },
      { to: '/reports',            icon: BarChart3, label: 'Reports & Logs',      desc: 'Detailed reports & audit logs',            roles: ['admin','registrar','hod'] },
      { to: '/drive',              icon: HardDrive, label: 'Drive',               desc: 'File storage & document sharing',          roles: 'all' },
      { to: '/roles',              icon: Shield,    label: 'Roles & Privileges',  desc: 'User roles & access permissions',          roles: ['admin'] },
      { to: '/admin-privileges',   icon: KeyRound,  label: 'Admin Privileges',    desc: 'Manage admin access, passwords & system settings', roles: ['admin'] },
    ]
  },
];

const STORAGE_KEY = 'msrim_hidden_modules';

export default function AdminConsole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  });
  const [manageMode, setManageMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
  }, [hidden]);

  const hasAccess = (roles) => roles === 'all' || roles.includes(user?.role);

  const removeModule = (to) => setHidden(h => [...h, to]);
  const addModule    = (to) => setHidden(h => h.filter(x => x !== to));
  const resetAll     = () => setHidden([]);

  const visibleGroups = allGroups
    .map(g => ({ ...g, items: g.items.filter(i => hasAccess(i.roles)) }))
    .filter(g => g.items.length > 0);

  const totalVisible  = visibleGroups.reduce((n, g) => n + g.items.filter(i => !hidden.includes(i.to)).length, 0);
  const totalHidden   = hidden.length;

  return (
    <div className="space-y-6 fade-in pb-10">
      {/* Back */}
      <button onClick={() => window.close()}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
        <ArrowLeft className="w-4 h-4" /> Back to ERP
      </button>

      {/* Hero */}
      <div className="bg-gradient-to-r from-msrim-blue to-msrim-blue-light rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <LayoutDashboard className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Admin Console</h1>
            </div>
            <p className="text-blue-100 text-sm">
              {totalVisible} modules shown · {totalHidden > 0 ? `${totalHidden} hidden` : 'all visible'} · role: {user?.role}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totalHidden > 0 && (
              <button onClick={resetAll}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Restore All
              </button>
            )}
            <button onClick={() => setManageMode(m => !m)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors
                ${manageMode ? 'bg-white text-msrim-blue' : 'bg-white/20 hover:bg-white/30'}`}>
              <Settings2 className="w-3.5 h-3.5" />
              {manageMode ? 'Done' : 'Manage'}
            </button>
          </div>
        </div>
      </div>

      {/* Hidden modules — re-add panel */}
      {totalHidden > 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Hidden Modules — click + to restore</p>
          <div className="flex flex-wrap gap-2">
            {visibleGroups.flatMap(g => g.items).filter(i => hidden.includes(i.to)).map(item => (
              <button key={item.to} onClick={() => addModule(item.to)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:border-msrim-blue hover:text-msrim-blue transition-colors shadow-sm">
                <Plus className="w-3 h-3" /> {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {visibleGroups.map(({ group, color, iconBg, iconColor, headingColor, items }) => {
        const shown   = items.filter(i => !hidden.includes(i.to));
        const removed = items.filter(i =>  hidden.includes(i.to));
        if (shown.length === 0 && !manageMode) return null;
        return (
          <div key={group}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-3 ${headingColor}`}>{group}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {shown.map(item => (
                <div key={item.to} className={`group relative flex flex-col items-start gap-2 p-4 rounded-2xl border ${color} transition-all duration-150 hover:shadow-md hover:-translate-y-0.5`}>
                  {/* Action buttons — always visible in manage mode, on hover otherwise */}
                  <div className={`absolute top-2 right-2 flex gap-1 ${manageMode ? 'flex' : 'hidden group-hover:flex'}`}>
                    <button onClick={() => navigate(item.to)}
                      title="Open module"
                      className="w-6 h-6 rounded-lg bg-white/80 hover:bg-green-100 hover:text-green-700 flex items-center justify-center shadow-sm transition-colors">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeModule(item.to)}
                      title="Remove from console"
                      className="w-6 h-6 rounded-lg bg-white/80 hover:bg-red-100 hover:text-red-600 flex items-center justify-center shadow-sm transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Card body — clickable to open */}
                  <button onClick={() => navigate(item.to)} className="flex flex-col items-start gap-2 w-full text-left">
                    <div className={`p-2 rounded-xl ${iconBg} ${iconColor}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 pr-8">
                      <p className="text-sm font-semibold text-gray-800 truncate">{item.label}</p>
                      <p className="text-xs text-gray-500 leading-tight line-clamp-1">{item.desc}</p>
                    </div>
                  </button>

                  {/* Edit button — always visible at bottom */}
                  <div className="w-full pt-2 border-t border-black/5 mt-auto">
                    <button onClick={() => navigate(item.to)}
                      className={`w-full flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-lg transition-colors ${iconColor} hover:bg-black/5`}>
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
