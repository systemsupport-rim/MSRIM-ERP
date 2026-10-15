import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  FileText, DollarSign, Library, Briefcase, Bell, BarChart3,
  ChevronLeft, Building2, UserCircle, Calendar, HardDrive, MessageSquare,
  Home, Building, BedDouble, UserCheck, Map, Heart, Brain, Award,
  ClipboardList, Settings, Shield, Layers, GitBranch, Cpu, HelpCircle,
  BookMarked, Star, Users2, ChevronDown, ChevronRight, Megaphone,
  Zap, Banknote, ShoppingCart, Network, BadgeCheck, Sparkles
} from 'lucide-react';
import { useState } from 'react';

const moduleGroups = [
  {
    group: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: 'all' },
      { to: '/profile', icon: UserCircle, label: 'My Profile', roles: 'all' },
      { to: '/calendar', icon: Calendar, label: 'Calendar', roles: 'all' },
      { to: '/notices', icon: Bell, label: 'Notice Board', roles: 'all' },
      { to: '/feed', icon: Megaphone, label: 'Feed & Booths', roles: 'all' },
    ]
  },
  {
    group: 'Academic',
    items: [
      { to: '/students', icon: GraduationCap, label: 'Students', roles: ['admin','registrar','hod','faculty','student'] },
      { to: '/faculty', icon: Users, label: 'Faculty', roles: ['admin','registrar','hod','faculty'] },
      { to: '/courses', icon: BookOpen, label: 'Course Catalogue', roles: 'all' },
      { to: '/attendance', icon: ClipboardCheck, label: 'Attendance', roles: 'all' },
      { to: '/timetable', icon: Calendar, label: 'Timetable', roles: 'all' },
      { to: '/lms', icon: BookMarked, label: 'LMS', roles: 'all' },
      { to: '/obe', icon: Star, label: 'OBE / Outcomes', roles: ['admin','hod','faculty','student','registrar'] },
      { to: '/mentor', icon: UserCheck, label: 'Mentor-Mentee', roles: ['admin','hod','faculty','student','registrar'] },
    ]
  },
  {
    group: 'Examinations',
    items: [
      { to: '/examinations', icon: FileText, label: 'Examinations', roles: 'all' },
      { to: '/exams/hall-tickets', icon: ClipboardList, label: 'Hall Tickets', roles: 'all' },
      { to: '/exams/question-papers', icon: FileText, label: 'Question Papers', roles: ['admin','registrar','hod','faculty'] },
      { to: '/exams/seating', icon: Map, label: 'Seating Plan', roles: ['admin','registrar','hod','faculty'] },
      { to: '/exams/grading', icon: Award, label: 'Grading Schema', roles: ['admin','registrar','hod'] },
      { to: '/exams/certificates', icon: Award, label: 'Certificates', roles: ['admin','registrar'] },
    ]
  },
  {
    group: 'Finance',
    items: [
      { to: '/fees', icon: DollarSign, label: 'Fee Management', roles: ['admin','registrar','accounts','student'] },
    ]
  },
  {
    group: 'Admissions',
    items: [
      { to: '/admissions', icon: Users2, label: 'Admissions', roles: ['admin','registrar','hod'] },
    ]
  },
  {
    group: 'Campus Life',
    items: [
      { to: '/placements', icon: Briefcase, label: 'Placements', roles: 'all' },
      { to: '/library', icon: Library, label: 'Library', roles: 'all' },
      { to: '/hostel', icon: BedDouble, label: 'Hostel', roles: ['admin','registrar','student'] },
      { to: '/infrastructure', icon: Building, label: 'Infrastructure', roles: 'all' },
      { to: '/helpdesk', icon: HelpCircle, label: 'Campus Help Center', roles: 'all' },
      { to: '/feedback', icon: Heart, label: 'IQAC / Feedback', roles: 'all' },
    ]
  },
  {
    group: 'HR & Staff',
    items: [
      { to: '/hr', icon: Users, label: 'HR Management', roles: ['admin','registrar','hod','faculty'] },
      { to: '/hr/leaves', icon: ClipboardList, label: 'Leave Approval', roles: ['admin','registrar','hod','faculty'] },
      { to: '/hr/portfolios', icon: Star, label: 'Staff Portfolio', roles: ['admin','hod','faculty'] },
    ]
  },
  {
    group: 'AI Intelligence',
    items: [
      { to: '/intelligence', icon: Sparkles, label: 'AI Command Center', roles: ['admin','registrar','hod','faculty'] },
    ]
  },
  {
    group: 'Bright Process Hub',
    items: [
      { to: '/workflow', icon: Zap, label: 'Process Automation', roles: 'all' },
      { to: '/finance', icon: Banknote, label: 'Finance & Budget', roles: ['admin','accounts','registrar','hod'] },
      { to: '/procurement', icon: ShoppingCart, label: 'Procurement', roles: ['admin','accounts','registrar','hod','faculty'] },
      { to: '/alumni', icon: Network, label: 'Alumni Connect', roles: 'all' },
      { to: '/accreditation', icon: BadgeCheck, label: 'Accreditation & NAAC', roles: ['admin','registrar','hod'] },
    ]
  },
];

export default function Sidebar({ isOpen, onToggle }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState({});

  const hasAccess = (roles) => {
    if (roles === 'all') return true;
    return roles.includes(user?.role);
  };

  const toggleGroup = (g) => setCollapsed(c => ({ ...c, [g]: !c[g] }));

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-300 bg-msrim-blue-dark flex flex-col flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {moduleGroups.map(({ group, items }) => {
          const visibleItems = items.filter(item => hasAccess(item.roles));
          if (visibleItems.length === 0) return null;
          const isCollapsed = collapsed[group];
          return (
            <div key={group} className="mb-1">
              <button onClick={() => toggleGroup(group)}
                className="w-full flex items-center justify-between px-4 py-1.5 text-blue-300 hover:text-white transition-colors">
                <span className="text-xs font-semibold uppercase tracking-widest">{group}</span>
                {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5 px-2">
                  {visibleItems.map(item => (
                    <NavLink key={item.to} to={item.to}
                      className={({ isActive }) => `sidebar-link text-xs py-2 ${isActive ? 'active' : ''}`}>
                      <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <p className="text-blue-400 text-xs text-center">MSRIM Digital Campus v3.0</p>
        <p className="text-blue-500 text-xs text-center">30+ Modules · 150+ Features</p>
      </div>
    </aside>
  );
}
