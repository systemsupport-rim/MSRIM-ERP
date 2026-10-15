import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, UserCircle, Calendar, Bell, Megaphone,
  ChevronLeft, Building2, CalendarDays, ClipboardCheck
} from 'lucide-react';

const mainItems = [
  { to: '/dashboard',        icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/profile',          icon: UserCircle,      label: 'My Profile' },
  { to: '/calendar',         icon: Calendar,        label: 'Calendar' },
  { to: '/notices',          icon: Bell,            label: 'Notice Board' },
  { to: '/feed',             icon: Megaphone,       label: 'Feed & Booths' },
  { to: '/leave-management', icon: CalendarDays,    label: 'Leave Management' },
  { to: '/staff-attendance', icon: ClipboardCheck,  label: 'Staff Attendance' },
];

export default function Sidebar({ isOpen, onToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();

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

      {/* Navigation — Main only */}
      <nav className="flex-1 overflow-y-auto py-3">
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
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 flex-shrink-0">
        <p className="text-blue-400 text-xs text-center">MSRIM Digital Campus v3.0</p>
        <p className="text-blue-500 text-xs text-center">30+ Modules · 150+ Features</p>
      </div>
    </aside>
  );
}
