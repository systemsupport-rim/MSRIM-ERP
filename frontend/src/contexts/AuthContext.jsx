import { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

// Parse JWT payload without a library
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('msrim_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  // Schedule a silent token refresh 5 minutes before expiry
  function scheduleRefresh(token) {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    const payload = parseJwt(token);
    if (!payload?.exp) return;
    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const msUntilRefresh = msUntilExpiry - 5 * 60 * 1000; // 5 min before expiry
    if (msUntilRefresh > 0) {
      refreshTimer.current = setTimeout(silentRefresh, msUntilRefresh);
    }
  }

  async function silentRefresh() {
    try {
      const res = await api.post('/auth/refresh');
      const { token, user: refreshedUser } = res.data;
      localStorage.setItem('msrim_token', token);
      if (refreshedUser) {
        localStorage.setItem('msrim_user', JSON.stringify(refreshedUser));
        setUser(refreshedUser);
      }
      scheduleRefresh(token);
    } catch {
      // Refresh token expired — user must log in again
      setUser(null);
      localStorage.removeItem('msrim_token');
      localStorage.removeItem('msrim_user');
    }
  }

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    const { token, user: loggedIn } = res.data;
    localStorage.setItem('msrim_token', token);
    localStorage.setItem('msrim_user', JSON.stringify(loggedIn));
    setUser(loggedIn);
    scheduleRefresh(token);
    return loggedIn;
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch (_) {}
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    localStorage.removeItem('msrim_token');
    localStorage.removeItem('msrim_user');
    setUser(null);
  }

  async function logoutAll() {
    try { await api.post('/auth/logout-all'); } catch (_) {}
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    localStorage.removeItem('msrim_token');
    localStorage.removeItem('msrim_user');
    setUser(null);
  }

  async function refreshUser() {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      localStorage.setItem('msrim_user', JSON.stringify(res.data));
    } catch {}
  }

  // On mount: validate existing token or try silent refresh
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('msrim_token');
      if (!token) {
        // Try refresh cookie (user might have refreshed the page)
        await silentRefresh();
        setLoading(false);
        return;
      }
      const payload = parseJwt(token);
      const isExpired = !payload || payload.exp * 1000 < Date.now();
      if (isExpired) {
        await silentRefresh();
      } else {
        scheduleRefresh(token);
        await refreshUser();
      }
      setLoading(false);
    }
    init();
    return () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid #e2e8f0', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748b', fontSize: 14 }}>Loading MSRIM ERP...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, logoutAll, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
