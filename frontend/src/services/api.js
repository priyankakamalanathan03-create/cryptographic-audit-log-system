import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:2000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authAPI = {
  register: (username, email, password, role = 'USER') =>
    api.post('/auth/register', { username, email, password, role }),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
};

export const auditLogAPI = {
  getMyLogs: (params = {}) => api.get('/audit-logs/my-logs', { params }),
  getAllLogs: (params = {}) => api.get('/audit-logs/all-logs', { params }),
  getStats: () => api.get('/audit-logs/stats'),
  getLogById: (id) => api.get(`/audit-logs/${id}`),
  verifyLogs: () => api.get('/audit-logs/verify'),
};

export const notesAPI = {
  getAll: () => api.get('/notes'),
  create: (title, content) => api.post('/notes', { title, content }),
  update: (id, title, content) => api.put(`/notes/${id}`, { title, content }),
  delete: (id) => api.delete(`/notes/${id}`),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  updateStatus: (id) => api.patch(`/users/${id}/status`),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
};

export default api;
