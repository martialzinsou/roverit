/**
 * RoverIt — auth.tsx
 * Auteur : Martial Zinsou
 */
/**
 * Gestion de l'authentification React (contexte).
 * Fournit l'utilisateur courant, le login/logout, le rafraîchissement de
 * session et le helper de droits d'édition selon le rôle.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@roverit/shared';
import { api, clearSession, getToken, getUser, installOnlineSync, setSession } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

/** Contexte React exposant l'état d'authentification aux composants. */
const AuthContext = createContext<AuthState | null>(null);

/**
 * Fournisseur de contexte d'auth : synchronise l'utilisateur avec l'API
 * et le localStorage, et gère les événements de retour en ligne / session expirée.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getUser<User>());
  const login = useCallback(async (username: string, password: string) => {
    const res = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: { username, password },
    });
    setSession(res.token, res.user);
    setUser(res.user);
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const me = await api<User>('/auth/me');
      setSession(getToken() ?? '', me);
      setUser(me);
    } catch {
      /* session expirée */
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  useEffect(() => {
    const off = installOnlineSync();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('roverit:unauthorized', onUnauthorized);
    const goOnline = () => void refresh();
    window.addEventListener('online', goOnline);
    return () => {
      off();
      window.removeEventListener('roverit:unauthorized', onUnauthorized);
      window.removeEventListener('online', goOnline);
    };
  }, [refresh]);

  const value = useMemo(() => ({ user, token: getToken(), login, logout, refresh }), [user, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Hook d'accès au contexte d'authentification (sous <AuthProvider>). */
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

/** Indique si un rôle peut modifier les données (admin ou technicien). */
export function canEdit(role: string | undefined): boolean {
  return role === 'admin' || role === 'technicien';
}