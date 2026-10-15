import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin', password: 'Admin@123' },
  { role: 'Student', username: 'student1', password: 'Stu@123' },
  { role: 'Faculty', username: 'faculty1', password: 'Fac@123' },
  { role: 'Accounts', username: 'accounts', password: 'Acc@123' },
  { role: 'Placement', username: 'placement', password: 'Plc@123' },
  { role: 'Librarian', username: 'librarian', password: 'Lib@123' },
];

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(username, password);
      toast.success('Welcome to MSRIM Digital Campus!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(u, p) { setUsername(u); setPassword(p); }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-msrim-blue-dark via-msrim-blue to-msrim-blue-light flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute rounded-full border border-white/30"
              style={{ width: `${(i+1)*120}px`, height: `${(i+1)*120}px`, top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
          ))}
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-white rounded-2xl p-2 shadow-xl">
              <img src="https://msrim.in/images/logo-2.png" alt="MSRIM" className="h-16 w-16 object-contain"
                onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
              <div className="hidden w-16 h-16 items-center justify-center">
                <Building2 className="w-10 h-10 text-msrim-blue" />
              </div>
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">MSRIM</h1>
              <p className="text-blue-200 text-sm">MS Ramaiah Institute of Management</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Digital Campus<br/>
            <span className="text-msrim-orange">ERP Portal</span>
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            One integrated platform for students, faculty and administration — streamlining every aspect of campus life.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { label: 'Students Enrolled', value: '500+' },
            { label: 'Expert Faculty', value: '40+' },
            { label: 'Years of Excellence', value: '30+' },
            { label: 'Placement Partners', value: '200+' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
              <p className="text-white text-2xl font-bold">{s.value}</p>
              <p className="text-blue-200 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <img src="https://msrim.in/images/logo-2.png" alt="MSRIM" className="h-12 object-contain"
              onError={e => e.target.style.display='none'} />
            <div>
              <p className="text-msrim-blue font-bold text-lg">MSRIM Digital Campus</p>
              <p className="text-gray-500 text-sm">ERP Portal</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back</h2>
            <p className="text-gray-500 text-sm mb-6">Sign in to your MSRIM Digital Campus account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username / Email</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  className="input-field" placeholder="Enter username or email" autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    className="input-field pr-10" placeholder="Enter password" />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                <LogIn className="w-4 h-4" />
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-3 font-medium">Quick Login (Demo Accounts)</p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map(acc => (
                  <button key={acc.role} onClick={() => quickLogin(acc.username, acc.password)}
                    className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 hover:border-msrim-blue hover:bg-blue-50 hover:text-msrim-blue text-gray-600 transition-all font-medium">
                    {acc.role}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            © 2024-2026 MS Ramaiah Institute of Management, Bengaluru<br/>
            Proprietary Software — All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  );
}
