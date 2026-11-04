import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, request } from '../lib/api';

const STORAGE_KEY = 'session';
const AuthContext = createContext(null);

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const token = session?.token;

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  }, [session]);

  const logout = useCallback(() => setSession(null), []);

  const api = useCallback(
    async (path, options = {}) => {
      try {
        return await request(path, { ...options, token });
      } catch (error) {
        if (error.status === 401) {
          logout();
          throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
        }
        throw error;
      }
    },
    [token, logout],
  );

  useEffect(() => {
    if (!token) {
      return;
    }
    api('/auth/me')
      .then((cliente) => setSession((current) => (current ? { ...current, cliente } : current)))
      .catch(() => {});
  }, [token, api]);

  const authenticate = useCallback(async (path, body) => {
    setSession(await request(path, { method: 'POST', body }));
  }, []);

  const value = useMemo(
    () => ({
      session,
      cliente: session?.cliente ?? null,
      isAdmin: session?.cliente.perfil === 'admin',
      api,
      login: (credentials) => authenticate('/auth/login', credentials),
      register: (data) => authenticate('/auth/cadastro', data),
      logout,
    }),
    [session, api, authenticate, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
