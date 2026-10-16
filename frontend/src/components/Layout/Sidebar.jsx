import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, UserCircle, Calendar, Bell, Megaphone,
  ChevronLeft, Building2, Users, GraduationCap, BookOpen,
  ClipboardCheck, ClipboardList, CalendarDays, BookMarked,
  Star, UserCheck, FileText, Map, Award, DollarSign, Users2,
  Briefcase, Library, BedDouble, Building, HelpCircle, Heart,
  Zap, Banknote, ShoppingCart, Network, BadgeCheck, Sparkles,
  Layers, Brain, BarChart3, HardDrive, Shield, KeyRound, ArrowLeft,
  MessageSquare, Send, Settings2, MapPin
} from 'lucide-react';

const mainItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile',   icon: UserCircle,      label: 'My Profile' },
  { to: '/calendar',  icon: Calendar,        label: 'Calendar' },
  { to: '/notices',   icon: Bell,            label: 'Notice Board' },
  { to: '/feed',      icon: Megaphone,       label: 'Feed & Booths' },
];

// Context nav shown when inside a specific module
const moduleNavMap = [
  {
    match: ['/students'],
    label: 'Students',
    back: '/admin-console',
    items: [
      { to: '/students',   icon: GraduationCap, label: 'All Students' },
      { to: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
      { to: '/mentor',     icon: UserCheck,      label: 'Mentor-Mentee' },
    ],
  },
  {
    match: ['/faculty'],
    label: 'Faculty',
    back: '/admin-console',
    items: [
      { to: '/faculty', icon: GraduationCap, label: 'All Faculty' },
      { to: '/hr/portfolios', icon: Star,    label: 'Staff Portfolio' },
    ],
  },
  {
    match: ['/staff'],
    label: 'Administration Staff',
    back: '/admin-console',
    items: [
      { to: '/staff',           icon: Users,         label: 'All Staff' },
      { to: '/staff-attendance',icon: ClipboardCheck, label: 'Staff Attendance' },
    ],
  },
  {
    match: ['/obe'],
    label: 'OBE / Outcomes',
    back: '/admin-console',
    items: [
      { to: '/obe',          icon: Star,    label: 'OBE Dashboard' },
      { to: '/obe/outcomes', icon: Star,    label: 'CO / PO Setup' },
      { to: '/obe/settings', icon: Shield,  label: 'Access Settings' },
    ],
  },
  {
    match: ['/courses', '/timetable', '/lms', '/mentor'],
    label: 'Academic',
    back: '/admin-console',
    items: [
      { to: '/courses',    icon: BookOpen,      label: 'Course Catalogue' },
      { to: '/timetable',  icon: CalendarDays,  label: 'Timetable' },
      { to: '/lms',        icon: BookMarked,    label: 'LMS' },
      { to: '/mentor',     icon: UserCheck,     label: 'Mentor-Mentee' },
    ],
  },
  {
    match: ['/examinations', '/exams'],
    label: 'Examinations',
    back: '/admin-console',
    items: [
      { to: '/examinations',             icon: FileText,      label: 'Exam Planner' },
      { to: '/exams/question-papers',    icon: FileText,      label: 'QP Creation' },
      { to: '/exams/qp-review',          icon: ClipboardList, label: 'QP Review' },
      { to: '/exams/answer-sheets',      icon: ClipboardList, label: 'Answer Sheets' },
      { to: '/exams/marks',              icon: Award,         label: 'Marks Entry' },
      { to: '/exams/hall-tickets',       icon: ClipboardList, label: 'Hall Tickets' },
      { to: '/exams/seating',            icon: Map,           label: 'Seating Plan' },
      { to: '/exams/backlogs',           icon: FileText,      label: 'Backlog Mgmt' },
      { to: '/exams/year-results',       icon: Award,         label: 'Year Results' },
      { to: '/exams/result-declaration', icon: Award,         label: 'Result Declaration' },
      { to: '/exams/grading',            icon: Award,         label: 'Grading Schema' },
      { to: '/exams/certificates',       icon: Award,         label: 'Certificates' },
    ],
  },
  {
    match: ['/fees'],
    label: 'Fee Management',
    back: '/admin-console',
    items: [
      { to: '/fees', icon: DollarSign, label: 'Fee Management' },
    ],
  },
  {
    match: ['/admissions'],
    label: 'Admissions',
    back: '/admin-console',
    items: [
      { to: '/admissions/enquiries',    icon: MessageSquare, label: 'Enquiry Mgmt' },
      { to: '/admissions/applications', icon: Send,          label: 'Applications' },
      { to: '/admissions',              icon: Users2,        label: 'Admission Mgmt' },
      { to: '/admissions/settings',     icon: Settings2,     label: 'Settings' },
    ],
  },
  {
    match: ['/hr'],
    label: 'HR Management',
    back: '/admin-console',
    items: [
      { to: '/hr',                icon: Users,         label: 'HR Management' },
      { to: '/hr/attendance-v2',  icon: ClipboardCheck,label: 'Attendance V2' },
      { to: '/hr/reports',        icon: BarChart3,     label: 'HR Reports' },
      { to: '/hr/master-data',    icon: Layers,        label: 'Master Data' },
      { to: '/hr/leaves',         icon: ClipboardList, label: 'Leave Approval' },
      { to: '/hr/portfolios',     icon: Star,          label: 'Staff Portfolio' },
    ],
  },
  {
    match: ['/leave-management'],
    label: 'Leave Management',
    back: '/admin-console',
    items: [
      { to: '/leave-management', icon: CalendarDays, label: 'Leave Management' },
      { to: '/hr/leaves',        icon: ClipboardList,label: 'Leave Approval' },
    ],
  },
  {
    match: ['/staff-attendance'],
    label: 'Staff Attendance',
    back: '/admin-console',
    items: [
      { to: '/staff-attendance', icon: ClipboardCheck, label: 'Staff Attendance' },
    ],
  },
  {
    match: ['/parents'],
    label: 'Parents',
    back: '/admin-console',
    items: [
      { to: '/parents', icon: Users2, label: 'Parent Mgmt' },
    ],
  },
  {
    match: ['/placements'],
    label: 'Placements',
    back: '/admin-console',
    items: [
      { to: '/placements', icon: Briefcase, label: 'Placements' },
    ],
  },
  {
    match: ['/library'],
    label: 'Library',
    back: '/admin-console',
    items: [
      { to: '/library', icon: Library, label: 'Library' },
    ],
  },
  {
    match: ['/hostel'],
    label: 'Hostel',
    back: '/admin-console',
    items: [
      { to: '/hostel',     icon: BedDouble,  label: 'Hostel Allotment' },
      { to: '/hostel/fee', icon: DollarSign, label: 'Hostel Fee' },
    ],
  },
  {
    match: ['/infrastructure'],
    label: 'Infrastructure',
    back: '/admin-console',
    items: [
      { to: '/infrastructure', icon: Building, label: 'Infrastructure' },
    ],
  },
  {
    match: ['/helpdesk'],
    label: 'Help Center',
    back: '/admin-console',
    items: [
      { to: '/helpdesk', icon: HelpCircle, label: 'Help Center' },
    ],
  },
  {
    match: ['/feedback'],
    label: 'IQAC / Feedback',
    back: '/admin-console',
    items: [
      { to: '/feedback', icon: Heart, label: 'IQAC / Feedback' },
    ],
  },
  {
    match: ['/workflow', '/finance', '/procurement', '/alumni', '/accreditation', '/intelligence'],
    label: 'Bright Process Hub',
    back: '/admin-console',
    items: [
      { to: '/workflow',      icon: Zap,          label: 'Process Automation' },
      { to: '/finance',       icon: Banknote,     label: 'Finance & Budget' },
      { to: '/procurement',   icon: ShoppingCart, label: 'Procurement' },
      { to: '/alumni',        icon: Network,      label: 'Alumni Connect' },
      { to: '/accreditation', icon: BadgeCheck,   label: 'Accreditation & NAAC' },
      { to: '/intelligence',  icon: Sparkles,     label: 'AI Command Center' },
    ],
  },
  {
    match: ['/curriculum'],
    label: 'Curriculum',
    back: '/admin-console',
    items: [
      { to: '/curriculum',         icon: Layers,    label: 'Curriculum Map' },
      { to: '/academic-management',icon: BookOpen,  label: 'Academic Mgmt' },
    ],
  },
  {
    match: ['/academic-management'],
    label: 'Academic Management',
    back: '/admin-console',
    items: [
      { to: '/academic-management', icon: BookOpen,  label: 'Academic Mgmt' },
      { to: '/curriculum',          icon: Layers,    label: 'Curriculum' },
      { to: '/timetable',           icon: CalendarDays, label: 'Timetable' },
    ],
  },
  {
    match: ['/cms'],
    label: 'Content Management',
    back: '/admin-console',
    items: [
      { to: '/cms',                    icon: FileText,      label: 'CMS' },
      { to: '/notification-templates', icon: ClipboardList, label: 'Notification Templates' },
    ],
  },
  {
    match: ['/notification-templates'],
    label: 'Notification Templates',
    back: '/admin-console',
    items: [
      { to: '/notification-templates', icon: ClipboardList, label: 'Templates' },
      { to: '/cms',                    icon: FileText,      label: 'CMS' },
    ],
  },
  {
    match: ['/venues'],
    label: 'Venue Administration',
    back: '/admin-console',
    items: [
      { to: '/venues', icon: MapPin, label: 'Venues & Bookings' },
    ],
  },
  {
    match: ['/audience'],
    label: 'Audience Management',
    back: '/admin-console',
    items: [
      { to: '/audience', icon: Users, label: 'Audience Groups' },
    ],
  },
  {
    match: ['/attendance-console'],
    label: 'Attendance Console',
    back: '/admin-console',
    items: [
      { to: '/attendance-console', icon: ClipboardCheck, label: 'Attendance Console' },
      { to: '/attendance',         icon: ClipboardCheck, label: 'Student Attendance' },
      { to: '/staff-attendance',   icon: ClipboardCheck, label: 'Staff Attendance' },
    ],
  },
  {
    match: ['/institution-settings', '/sso-config', '/feed-settings', '/biometric', '/obe/settings'],
    label: 'System Settings',
    back: '/admin-console',
    items: [
      { to: '/institution-settings', icon: Building2,   label: 'Institution' },
      { to: '/obe/settings',         icon: Star,        label: 'OBE Access' },
      { to: '/sso-config',           icon: Shield,      label: 'SSO Config' },
      { to: '/biometric',            icon: ClipboardCheck, label: 'Biometric' },
      { to: '/feed-settings',        icon: Star,        label: 'Feed Settings' },
    ],
  },
  {
    match: ['/integrations'],
    label: 'Integrations',
    back: '/admin-console',
    items: [
      { to: '/integrations', icon: Network, label: 'All Integrations' },
    ],
  },
  {
    match: ['/structure', '/analytics', '/reports', '/drive', '/roles', '/admin-privileges'],
    label: 'Admin Console',
    back: '/admin-console',
    items: [
      { to: '/structure',        icon: Layers,    label: 'Structure' },
      { to: '/analytics',        icon: Brain,     label: 'Analytics / BI' },
      { to: '/reports',          icon: BarChart3, label: 'Reports & Logs' },
      { to: '/drive',            icon: HardDrive, label: 'Drive' },
      { to: '/roles',            icon: Shield,    label: 'Roles & Privileges' },
      { to: '/admin-privileges', icon: KeyRound,  label: 'Admin Privileges' },
    ],
  },
];

export default function Sidebar({ isOpen, onToggle }) {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const path      = location.pathname;

  const moduleNav = moduleNavMap.find(m =>
    m.match.some(prefix => path === prefix || path.startsWith(prefix + '/'))
  );

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-300 bg-msrim-blue-dark flex flex-col flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="bg-white rounded-lg p-1 flex-shrink-0">
            <img src="https://msrim.in/images/logo-2.png" alt="MSRIM" className="h-8 w-8 object-contain"
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
            <Building2 className="w-8 h-8 text-msrim-blue hidden" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">MSRIM</p>
            <p className="text-blue-200 text-xs truncate">Digital Campus</p>
          </div>
        </div>
        <button onClick={onToggle} className="text-white/60 hover:text-white ml-1 flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-2.5 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-msrim-orange rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-blue-300 text-xs capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {moduleNav ? (
          /* Inside a module — show only module nav */
          <>
            <div className="flex items-center gap-2 px-4 pb-1.5">
              <button onClick={() => navigate(moduleNav.back)}
                className="text-blue-400 hover:text-white transition-colors">
                <ArrowLeft className="w-3 h-3" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-300 truncate">{moduleNav.label}</p>
            </div>
            <div className="space-y-0.5 px-2">
              {moduleNav.items.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `sidebar-link text-xs py-2 ${isActive ? 'active' : ''}`}>
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </>
        ) : (
          /* Main pages — show main nav */
          <>
            <p className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-widest text-blue-300">Main</p>
            <div className="space-y-0.5 px-2">
              {mainItems.map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `sidebar-link text-xs py-2 ${isActive ? 'active' : ''}`}>
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <p className="text-blue-400 text-xs text-center">MSRIM Digital Campus v3.0</p>
        <p className="text-blue-500 text-xs text-center">30+ Modules · 150+ Features</p>
      </div>
    </aside>
  );
}
