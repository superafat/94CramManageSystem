import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE ? `${process.env.NEXT_PUBLIC_API_BASE}/api` : '/api',
  withCredentials: true,
});

let isRedirecting = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      if (!isRedirecting && typeof window !== 'undefined') {
        isRedirecting = true;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
