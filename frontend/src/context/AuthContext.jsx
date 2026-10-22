/**
 * AuthContext.jsx — Global authentication state
 *
 * Provides: { user, loading, login, logout, setUser }
 * - On mount, fetches /api/auth/me to restore session from the HTTP-only cookie.
 * - login() is called by auth pages after a successful API response.
 * - logout() calls the server and clears local state.
 */
import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking existing session

  // Check if the user is already logged in (persisted via HTTP-only cookie)
  useEffect(() => {
    api.get('/api/auth/me')
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))   // 401 means no session — not an error
      .finally(() => setLoading(false));
  }, []);

  function login(user) {
    setUser(user);
  }

  async function logout() {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
