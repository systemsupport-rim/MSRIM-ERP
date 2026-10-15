import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('msrim_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 || err.response?.status === 403) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('msrim_token');
        localStorage.removeItem('msrim_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
