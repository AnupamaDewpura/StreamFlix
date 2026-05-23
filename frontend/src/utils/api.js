// This file handles all communication between the frontend and backend
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Automatically attach the admin token to requests if we have one
api.interceptors.request.use(config => {
  const token = localStorage.getItem('sf_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;