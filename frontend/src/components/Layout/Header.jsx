import { Menu, Bell, Search, LogOut, Settings, ChevronDown, Layers, HardDrive, Users2, Brain, BarChart3, Shield, UserCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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

  const roleColors = {
    admin: 'bg-red-100 text-red-800',
    registrar: 'bg-purple-100 text-purple-800',
    hod: 'bg-blue-100 text-blue-800',
    faculty: 'bg-green-100 text-green-800',
    student: 'bg-yellow-100 text-yellow-800',
    librarian: 'bg-pink-100 text-pink-800',
    accounts: 'bg-indigo-100 text-indigo-800',
    placement: 'bg-orange-100 text-orange-800',
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-1.5 w-64">
          <Search className="w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search..." className="bg-transparent text-sm outline-none text-gray-600 w-full" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* MSRIM Branding */}
        <div className="hidden md:flex items-center gap-2 mr-4">
          <div className="flex items-center gap-2 bg-gradient-to-r from-msrim-blue to-msrim-blue-light text-white px-3 py-1 rounded-full text-xs font-semibold">
            MSRIM Digital Campus
          </div>
        </div>

        <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-msrim-orange rounded-full"></span>
        </button>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setDropdownOpen(o => !o)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100">
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              {/* Profile */}
              <button onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50">
                <UserCircle className="w-4 h-4 text-gray-400" /> My Profile
              </button>

              {/* Admin Console — shown to admin/registrar/hod */}
              {['admin','registrar','hod'].includes(user?.role) && (<>
                <div className="border-t border-gray-100 my-1" />
                <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-widest">Admin Console</p>

                {['admin','registrar','hod'].includes(user?.role) && (
                  <button onClick={() => { navigate('/structure'); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Layers className="w-4 h-4 text-gray-400" /> Structure
                  </button>
                )}
                {['admin','registrar','hod'].includes(user?.role) && (
                  <button onClick={() => { navigate('/analytics'); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Brain className="w-4 h-4 text-gray-400" /> Analytics / BI
                  </button>
                )}
                {['admin','registrar','hod'].includes(user?.role) && (
                  <button onClick={() => { navigate('/reports'); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <BarChart3 className="w-4 h-4 text-gray-400" /> Reports & Logs
                  </button>
                )}
                {['admin','registrar'].includes(user?.role) && (
                  <button onClick={() => { navigate('/parents'); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Users2 className="w-4 h-4 text-gray-400" /> Parent Management
                  </button>
                )}
                {user?.role === 'admin' && (
                  <button onClick={() => { navigate('/roles'); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Shield className="w-4 h-4 text-gray-400" /> Roles & Privileges
                  </button>
                )}
              </>)}

              {/* Drive — all roles */}
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { navigate('/drive'); setDropdownOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                <HardDrive className="w-4 h-4 text-gray-400" /> Drive
              </button>

              <div className="border-t border-gray-100 my-1" />
              <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
