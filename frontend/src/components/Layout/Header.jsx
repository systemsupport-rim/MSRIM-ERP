import {
  Menu, Bell, Search, LogOut, ChevronDown, ExternalLink,
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  FileText, DollarSign, Library, Briefcase, BarChart3,
  Building, BedDouble, UserCheck, Map, Heart, Brain, Award,
  ClipboardList, Shield, Layers, HardDrive, HelpCircle,
  BookMarked, Star, Users2, Megaphone, UserCircle, CalendarDays,
  Zap, Banknote, ShoppingCart, Network, BadgeCheck, Sparkles,
  Settings, X, ArrowRight
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../utils/api';

// All module groups — mirrors former sidebar groups (Academic → end)
const moduleGroups = [
  {
    group: 'Academic',
    items: [
      { to: '/students',  icon: GraduationCap, label: 'Students',        roles: ['admin','registrar','hod','faculty','student'] },
      { to: '/faculty',   icon: Users,         label: 'Faculty',          roles: ['admin','registrar','hod','faculty'] },
      { to: '/courses',   icon: BookOpen,      label: 'Course Catalogue', roles: 'all' },
      { to: '/attendance',icon: ClipboardCheck,label: 'Attendance',       roles: 'all' },
      { to: '/timetable', icon: CalendarDays,   label: 'Timetable',       roles: 'all' },
      { to: '/lms',       icon: BookMarked,    label: 'LMS',              roles: 'all' },
      { to: '/obe',       icon: Star,          label: 'OBE / Outcomes',   roles: ['admin','hod','faculty','student','registrar'] },
      { to: '/mentor',    icon: UserCheck,     label: 'Mentor-Mentee',    roles: ['admin','hod','faculty','student','registrar'] },
    ]
  },
  {
    group: 'Examinations',
    items: [
      { to: '/examinations',         icon: FileText,     label: 'Examinations',    roles: 'all' },
      { to: '/exams/hall-tickets',   icon: ClipboardList,label: 'Hall Tickets',    roles: 'all' },
      { to: '/exams/question-papers',icon: FileText,     label: 'Question Papers', roles: ['admin','registrar','hod','faculty'] },
      { to: '/exams/seating',        icon: Map,          label: 'Seating Plan',    roles: ['admin','registrar','hod','faculty'] },
      { to: '/exams/grading',        icon: Award,        label: 'Grading Schema',  roles: ['admin','registrar','hod'] },
      { to: '/exams/certificates',   icon: Award,        label: 'Certificates',    roles: ['admin','registrar'] },
    ]
  },
  {
    group: 'Finance & Admin',
    items: [
      { to: '/fees',        icon: DollarSign, label: 'Fee Management', roles: ['admin','registrar','accounts','student'] },
      { to: '/admissions',  icon: Users2,     label: 'Admissions',     roles: ['admin','registrar','hod'] },
      { to: '/hr',          icon: Users,      label: 'HR Management',  roles: ['admin','registrar','hod','faculty'] },
      { to: '/hr/leaves',   icon: ClipboardList,label:'Leave Approval',roles: ['admin','registrar','hod','faculty'] },
      { to: '/hr/portfolios',icon: Star,      label: 'Staff Portfolio',roles: ['admin','hod','faculty'] },
      { to: '/parents',     icon: Users2,     label: 'Parent Mgmt',    roles: ['admin','registrar'] },
    ]
  },
  {
    group: 'Campus Life',
    items: [
      { to: '/placements',    icon: Briefcase,  label: 'Placements',      roles: 'all' },
      { to: '/library',       icon: Library,    label: 'Library',          roles: 'all' },
      { to: '/hostel',        icon: BedDouble,  label: 'Hostel',           roles: ['admin','registrar','student'] },
      { to: '/infrastructure',icon: Building,   label: 'Infrastructure',   roles: 'all' },
      { to: '/helpdesk',      icon: HelpCircle, label: 'Help Center',      roles: 'all' },
      { to: '/feedback',      icon: Heart,      label: 'IQAC / Feedback',  roles: 'all' },
    ]
  },
  {
    group: 'Bright Process Hub',
    items: [
      { to: '/workflow',      icon: Zap,        label: 'Process Automation',  roles: 'all' },
      { to: '/finance',       icon: Banknote,   label: 'Finance & Budget',    roles: ['admin','accounts','registrar','hod'] },
      { to: '/procurement',   icon: ShoppingCart,label:'Procurement',         roles: ['admin','accounts','registrar','hod','faculty'] },
      { to: '/alumni',        icon: Network,    label: 'Alumni Connect',      roles: 'all' },
      { to: '/accreditation', icon: BadgeCheck, label: 'Accreditation & NAAC',roles: ['admin','registrar','hod'] },
      { to: '/intelligence',  icon: Sparkles,   label: 'AI Command Center',   roles: ['admin','registrar','hod','faculty'] },
    ]
  },
  {
    group: 'Admin Console',
    items: [
      { to: '/structure', icon: Layers,    label: 'Structure',        roles: ['admin','registrar','hod'] },
      { to: '/analytics', icon: Brain,     label: 'Analytics / BI',   roles: ['admin','registrar','hod'] },
      { to: '/reports',   icon: BarChart3, label: 'Reports & Logs',   roles: ['admin','registrar','hod'] },
      { to: '/drive',     icon: HardDrive, label: 'Drive',            roles: 'all' },
      { to: '/roles',     icon: Shield,    label: 'Roles & Privileges',roles: ['admin'] },
    ]
  },
];

const roleColors = {
  admin:     'bg-red-100 text-red-800',
  registrar: 'bg-purple-100 text-purple-800',
  hod:       'bg-blue-100 text-blue-800',
  faculty:   'bg-green-100 text-green-800',
  student:   'bg-yellow-100 text-yellow-800',
  librarian: 'bg-pink-100 text-pink-800',
  accounts:  'bg-indigo-100 text-indigo-800',
  placement: 'bg-orange-100 text-orange-800',
};

// ── Global Search ─────────────────────────────────────────────────────────────
function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const searchRef               = useRef(null);
  const debounceRef             = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.querySelector('input')?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  async function doSearch(q) {
    if (!q.trim() || q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    try {
      const r = await api.get('/search', { params: { q } });
      setResults(r.data || []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }

  function onChange(e) {
    const q = e.target.value;
    setQuery(q);
    setOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  }

  function goTo(path) {
    navigate(path);
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  const ICON_MAP = {
    student: GraduationCap, faculty: Users, staff: Users,
    course: BookOpen, notice: Bell, placement: Briefcase,
    library: Library, fee: DollarSign, module: LayoutDashboard,
  };

  return (
    <div ref={searchRef} className="relative hidden md:block">
      <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 w-72 transition-all ${open && query ? 'bg-white border border-msrim-blue shadow-sm' : 'bg-gray-100'}`}>
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={onChange}
          onFocus={() => { setOpen(true); if (query.length >= 2) doSearch(query); }}
          placeholder="Search students, faculty, notices…"
          className="bg-transparent text-sm outline-none text-gray-600 w-full placeholder:text-gray-400"
        />
        {query ? (
          <button onClick={() => { setQuery(''); setResults([]); setOpen(false); }} className="text-gray-400 hover:text-gray-600">
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden lg:block text-xs text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
        )}
      </div>

      {/* Results dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 mt-1.5 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <div className="w-4 h-4 border-2 border-msrim-blue border-t-transparent rounded-full animate-spin" />
              Searching…
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              No results for "<strong>{query}</strong>"
            </div>
          ) : (
            <div className="py-1 max-h-96 overflow-y-auto">
              {/* Group results by type */}
              {Object.entries(
                results.reduce((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {})
              ).map(([type, items]) => {
                const Icon = ICON_MAP[type] || LayoutDashboard;
                return (
                  <div key={type}>
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-gray-400 capitalize">{type}s</p>
                    {items.slice(0, 5).map((item, i) => (
                      <button key={i} onClick={() => goTo(item.path)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                        <div className="w-8 h-8 rounded-lg bg-msrim-blue/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4 text-msrim-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                          {item.subtitle && <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>}
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''}</span>
            <span className="text-xs text-gray-400">↑↓ navigate · Enter to open · Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  }

  const hasAccess = (roles) => roles === 'all' || roles.includes(user?.role);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <Menu className="w-5 h-5" />
        </button>
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 mr-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-msrim-blue to-msrim-blue-light text-white px-3 py-1 rounded-full text-xs font-semibold">
            MSRIM Digital Campus
          </div>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-msrim-orange rounded-full"></span>
        </button>

        {/* Profile button + app-launcher dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100">
            <div className="w-8 h-8 bg-msrim-blue rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700 leading-tight">{user?.name}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user?.role] || 'bg-gray-100 text-gray-700'}`}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden min-w-[320px]">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <div className="w-9 h-9 bg-msrim-blue rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleColors[user?.role] || 'bg-gray-100 text-gray-700'}`}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-0.5">
                <button onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  <UserCircle className="w-4 h-4 text-gray-400" /> My Profile
                </button>
                <button onClick={() => { navigate('/admin-console'); setDropdownOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-msrim-blue hover:bg-blue-50 rounded-xl transition-colors font-medium">
                  <ExternalLink className="w-4 h-4" /> Admin Console
                </button>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
