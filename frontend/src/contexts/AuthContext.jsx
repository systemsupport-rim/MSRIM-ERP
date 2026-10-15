import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('msrim_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  async function login(username, password) {
    const res = await api.post('/auth/login', { username, password });
    const { token, user } = res.data;
    localStorage.setItem('msrim_token', token);
    localStorage.setItem('msrim_user', JSON.stringify(user));
    setUser(user);
    return user;
  }

  function logout() {
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

  useEffect(() => {
    if (user) refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
