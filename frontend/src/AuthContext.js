import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api, { registerLogout } from "./api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Register logout with api interceptor so 401s don't hard-reload
  useEffect(() => {
    const token = localStorage.getItem('token');
    registerLogout(logout, token);
  }, [logout, user]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { setAuthLoading(false); return; }
    api.get("/users/profile")
      .then(res => {
        const profile = res.data;
        // If stored user role doesn't match profile role, clear and re-set
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed.id !== profile.id || parsed.role !== profile.role) {
              localStorage.setItem('user', JSON.stringify(profile));
            }
          } catch {}
        }
        setUser(profile);
      })
      .catch(err => {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const login = (token, userData) => {
    // Clear any stale session data before setting new one
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.setItem("token", token);
    // Always use the server-provided userData — never trust stale localStorage
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  // Expose a way to refresh user from server (called after profile updates)
  const refreshUser = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    api.get('/users/profile').then(res => {
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
    }).catch(() => {});
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, authLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
