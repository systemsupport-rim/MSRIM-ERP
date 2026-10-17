import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000, withCredentials: true });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('msrim_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Track if a token refresh is already in flight to avoid duplicate calls
let refreshPromise = null;

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    // If 401 and not already retried and not the refresh/login endpoint itself
    if (
      err.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes('/auth/refresh') &&
      !original.url?.includes('/auth/login')
    ) {
      original._retry = true;
      try {
        // Only one refresh at a time
        if (!refreshPromise) {
          refreshPromise = axios.post('/api/auth/refresh', {}, { withCredentials: true })
            .finally(() => { refreshPromise = null; });
        }
        const refreshRes = await refreshPromise;
        const { token, user } = refreshRes.data;
        localStorage.setItem('msrim_token', token);
        if (user) localStorage.setItem('msrim_user', JSON.stringify(user));
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        // Refresh failed — clear session and redirect to login
        localStorage.removeItem('msrim_token');
        localStorage.removeItem('msrim_user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    if (err.response?.status === 403 && !window.location.pathname.includes('/login')) {
      // 403 = logged in but not authorized for this resource — don't logout
    }

    return Promise.reject(err);
  }
);

export default api;
