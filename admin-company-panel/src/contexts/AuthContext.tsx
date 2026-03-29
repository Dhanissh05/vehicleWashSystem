import React, { createContext, useContext, useState, useCallback } from 'react';

export interface PlatformUser {
  id: string;
  mobile: string;
  name?: string;
  role: 'SUPER_ADMIN' | 'EMPLOYEE' | 'VIEWER';
  isActive: boolean;
}

interface AuthContextValue {
  token: string | null;
  user: PlatformUser | null;
  login: (token: string, user: PlatformUser) => void;
  logout: () => void;
  isSuperAdmin: boolean;
  canWrite: boolean;
  isViewer: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseStoredUser(): PlatformUser | null {
  try {
    const raw = localStorage.getItem('platform_user');
    return raw ? (JSON.parse(raw) as PlatformUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('platform_token')
  );
  const [user, setUser] = useState<PlatformUser | null>(parseStoredUser);

  const login = useCallback((newToken: string, newUser: PlatformUser) => {
    localStorage.setItem('platform_token', newToken);
    localStorage.setItem('platform_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('platform_token');
    localStorage.removeItem('platform_user');
    setToken(null);
    setUser(null);
  }, []);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canWrite = user?.role === 'SUPER_ADMIN' || user?.role === 'EMPLOYEE';
  const isViewer = user?.role === 'VIEWER';

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isSuperAdmin, canWrite, isViewer }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
