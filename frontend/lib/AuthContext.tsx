/**
 * BharatSentinel Auth Context
 * - Stores JWT in localStorage for session persistence across refreshes
 * - Provides login/logout/register helpers that call the backend
 * - Exposes current user email + loading state
 */
'use client';
import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import axios from 'axios';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPw: string, newPw: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'bs_auth_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser]   = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);  // true until first /me check

  // Fetch user profile with a given token
  const fetchUser = useCallback(async (t: string): Promise<AuthUser | null> => {
    try {
      const res = await axios.get<AuthUser>('/api/auth/me', {
        headers: { Authorization: `Bearer ${t}` },
      });
      return res.data;
    } catch {
      return null;
    }
  }, []);

  // Restore session from localStorage on first mount
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      fetchUser(stored).then(u => {
        if (u) {
          setToken(stored);
          setUser(u);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    // OAuth2PasswordRequestForm expects application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const res = await axios.post<{ access_token: string; email: string }>(
      '/api/auth/login',
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    const t = res.data.access_token;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    const u = await fetchUser(t);
    setUser(u);
  };

  const register = async (email: string, password: string) => {
    const res = await axios.post<{ access_token: string; email: string }>(
      '/api/auth/register',
      { email, password },
    );
    const t = res.data.access_token;
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    const u = await fetchUser(t);
    setUser(u);
  };

  const logout = async () => {
    try { await axios.post('/api/auth/logout'); } catch { /* best-effort */ }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPw: string, newPw: string) => {
    if (!token) throw new Error('Not authenticated');
    await axios.post(
      '/api/auth/change-password',
      { current_password: currentPw, new_password: newPw },
      { headers: { Authorization: `Bearer ${token}` } },
    );
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
