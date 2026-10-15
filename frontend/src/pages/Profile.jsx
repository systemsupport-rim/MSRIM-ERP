import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Building, Key, Save } from 'lucide-react';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [pwdForm, setPwdForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [loading, setLoading] = useState(false);

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) return toast.error('Passwords do not match');
    if (pwdForm.newPassword.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await api.post('/auth/change-password', { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      toast.success('Password changed successfully!');
      setPwdForm({ currentPassword:'', newPassword:'', confirmPassword:'' });
    } catch(err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  }

  const roleColors = { admin:'bg-red-500',registrar:'bg-purple-500',hod:'bg-blue-500',faculty:'bg-green-500',student:'bg-yellow-500',librarian:'bg-pink-500',accounts:'bg-indigo-500',placement:'bg-orange-500',staff:'bg-teal-500' };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">My Profile</h1>

      <div className="card">
        <div className="flex items-start gap-6">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl ${roleColors[user?.role] || 'bg-msrim-blue'}`}>
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-gray-500 capitalize text-sm mt-1">{user?.role} · MSRIM Digital Campus</p>
            <p className="text-gray-400 text-xs mt-1">Last login: {user?.last_login ? new Date(user.last_login).toLocaleString() : 'N/A'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            [Mail, 'Email', user?.email],
            [Phone, 'Phone', user?.phone || 'Not set'],
            [Building, 'Department', user?.department || 'N/A'],
            [User, 'Username', user?.username],
          ].map(([Icon, label, value]) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <Icon className="w-4 h-4 text-msrim-blue" />
              </div>
              <div>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-800">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Key className="w-5 h-5 text-msrim-orange" /> Change Password</h2>
        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
          {[['Current Password','currentPassword'],['New Password','newPassword'],['Confirm New Password','confirmPassword']].map(([l,k]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
              <input type="password" required value={pwdForm[k]} onChange={e => setPwdForm(f => ({...f,[k]:e.target.value}))}
                className="input-field" placeholder="••••••••" />
            </div>
          ))}
          <button type="submit" disabled={loading} className="btn-primary">
            <Save className="w-4 h-4" />{loading ? 'Saving...' : 'Update Password'}
          </button>
        </form>
      </div>

      <div className="card bg-gradient-to-r from-msrim-blue to-msrim-blue-light text-white">
        <div className="flex items-center gap-4">
          <img src="https://msrim.in/images/logo-2.png" alt="MSRIM" className="h-12 w-12 object-contain bg-white rounded-lg p-1"
            onError={e => e.target.style.display='none'} />
          <div>
            <p className="font-bold text-lg">MS Ramaiah Institute of Management</p>
            <p className="text-blue-100 text-sm">M.S.R.I.T. Post, Bengaluru — 560054</p>
            <p className="text-blue-200 text-xs mt-1">30+ Years of Excellence in Management Education</p>
          </div>
        </div>
      </div>
    </div>
  );
}
