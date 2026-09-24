import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const api = axios.create({ baseURL: API_BASE });

export const buildFileUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || /^data:/i.test(value)) return value;
  if (value.startsWith('/')) return `${API_ORIGIN}${value}`;
  if (value.startsWith('uploads/')) return `${API_ORIGIN}/${value}`;
  return `${API_ORIGIN}/${value}`;
};

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on 401 (only for non-login endpoints and when not already on /login)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      const isLoginEndpoint = error.config?.url?.includes('/auth/login');
      if (!isLoginEndpoint && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
