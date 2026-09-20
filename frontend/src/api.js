import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// logout callback registered by AuthContext — avoids hard page reload
let _logoutFn = null;
let _registeredToken = null;
export const registerLogout = (fn, token) => { _logoutFn = fn; _registeredToken = token; };

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url    = error.config?.url || '';
    // Only auto-logout on 401 from the profile/auth endpoints,
    // not from every API call — avoids wiping a valid token on
    // transient failures or race conditions.
    const isAuthEndpoint = url.includes('/users/profile') || url.includes('/users/login');
    if (status === 401 && isAuthEndpoint) {
      const currentToken = localStorage.getItem('token');
      if (currentToken && _logoutFn) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        _logoutFn();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
