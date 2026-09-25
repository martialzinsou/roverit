/**
 * RoverIt — api.ts
 * Auteur : Martial Zinsou
 */
/**
 * Client API REST du front web RoverIt.
 * Gère l'authentification (localStorage), le cache des réponses GET,
 * la file hors-ligne (« outbox ») et la synchronisation à la reconnexion.
 */
const TOKEN_KEY = 'roverit.token';
const USER_KEY = 'roverit.user';
const CACHE_KEY = 'roverit.cache';
const OUTBOX_KEY = 'roverit.outbox';

/** URL de base de l'API (variable d'environnement, sinon proxy local /api/v1). */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api/v1';

let authToken: string | null = null;
let authUser: unknown = null;

/** Renvoie le jeton JWT courant, chargé depuis le localStorage au premier accès. */
export function getToken(): string | null {
  if (authToken === null) {
    authToken = localStorage.getItem(TOKEN_KEY);
  }
  return authToken;
}

/** Renvoie l'utilisateur authentifié tel que stocké localement. */
export function getUser<T>(): T | null {
  if (authUser === null) {
    try {
      authUser = JSON.parse(localStorage.getItem(USER_KEY) ?? 'null');
    } catch {
      authUser = null;
    }
  }
  return authUser as T | null;
}

/** Persiste la session (jeton + utilisateur) en mémoire et dans le localStorage. */
export function setSession(token: string, user: unknown): void {
  authToken = token;
  authUser = user;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** Supprime la session courante (mémoire + localStorage). */
export function clearSession(): void {
  authToken = null;
  authUser = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** Lit une réponse GET en cache si elle date de moins de 60 s. */
function readCache<T>(key: string): T | undefined {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    const hit = raw[key];
    if (hit && Date.now() - hit.ts < 60000) return hit.value as T;
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Stocke une réponse GET dans le cache local avec son horodatage. */
function writeCache(key: string, value: unknown): void {
  try {
    const raw = JSON.parse(localStorage.getItem(CACHE_KEY) ?? '{}');
    raw[key] = { ts: Date.now(), value };
    localStorage.setItem(CACHE_KEY, JSON.stringify(raw));
  } catch {
    /* ignore */
  }
}

/** Entrée de file hors-ligne : requête mise en attente à rejouer plus tard. */
export interface OutboxEntry {
  id: string;
  method: string;
  url: string;
  payload: unknown;
  queuedAt: string;
}

/** Lit la file hors-ligne stockée dans le localStorage. */
export function readOutbox(): OutboxEntry[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? '[]') as OutboxEntry[];
  } catch {
    return [];
  }
}

/** Écrit la file hors-ligne complète dans le localStorage. */
function writeOutbox(entries: OutboxEntry[]): void {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
}

function pushOutbox(entry: OutboxEntry): void {
  writeOutbox([...readOutbox(), entry]);
  window.dispatchEvent(new CustomEvent('roverit:offline-changed'));
}

function dropOutbox(id: string): void {
  writeOutbox(readOutbox().filter((e) => e.id !== id));
}

/** Indique si le navigateur considère la connexion comme active. */
export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Erreur applicative portant le statut HTTP et un drapeau « hors-ligne ». */
export class ApiError extends Error {
  status: number;
  offline: boolean;
  constructor(status: number, message: string, offline = false) {
    super(message);
    this.status = status;
    this.offline = offline;
  }
}

/** Options d'un appel API : méthode, corps, auth et mise en file hors-ligne. */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
  queueOffline?: boolean;
}

/**
 * Appel API générique : ajoute l'en-tête Bearer, met en cache les GET,
 * met en file les écritures hors-ligne et normalise les erreurs en ApiError.
 */
export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (!opts.skipAuth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const fullUrl = `${API_BASE}${path}`;

  if (!isOnline() && method !== 'GET') {
    if (opts.queueOffline) {
      pushOutbox({
        id: (opts.body as { id?: string } | undefined)?.id ?? crypto.randomUUID(),
        method,
        url: path,
        payload: opts.body,
        queuedAt: new Date().toISOString(),
      });
      return { ok: true, offline: true } as T;
    }
    throw new ApiError(503, 'Mode hors-ligne — opération mise en file', true);
  }

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });

    if (res.status === 401 && !opts.skipAuth) {
      clearSession();
      window.dispatchEvent(new CustomEvent('roverit:unauthorized'));
      throw new ApiError(401, 'Session expirée');
    }

    if (!res.ok) {
      let message = `Erreur ${res.status}`;
      try {
        const data = (await res.json()) as { error?: string; message?: string };
        message = data.error ?? data.message ?? message;
      } catch {
        /* corps non JSON */
      }
      throw new ApiError(res.status, message);
    }

    if (method === 'GET') {
      const cached = (await res.json()) as T;
      writeCache(path, cached);
      return cached;
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (method === 'GET') {
      const cached = readCache<T>(path);
      if (cached !== undefined) return cached;
    }
    if (!isOnline() && method !== 'GET' && opts.queueOffline) {
      pushOutbox({
        id: (opts.body as { id?: string } | undefined)?.id ?? crypto.randomUUID(),
        method,
        url: path,
        payload: opts.body,
        queuedAt: new Date().toISOString(),
      });
      return { ok: true, offline: true } as T;
    }
    throw err instanceof TypeError
      ? new ApiError(0, 'Impossible de joindre le serveur', true)
      : err;
  }
}

/** Rejoue les requêtes en file hors-ligne ; négatif si des entrées restent. */
export async function flushOutbox(): Promise<number> {
  const outbox = readOutbox();
  if (outbox.length === 0) return 0;
  let replayed = 0;
  for (const entry of outbox) {
    try {
      await api(entry.url, { method: entry.method as RequestOptions['method'], body: entry.payload });
      dropOutbox(entry.id);
      replayed++;
    } catch {
      /* on retente au prochain flush */
    }
  }
  const remaining = readOutbox().length;
  window.dispatchEvent(new CustomEvent('roverit:offline-changed'));
  return remaining === 0 ? replayed : -remaining;
}

let onlineHandlerInstalled = false;

/** Installe un écouteur qui rejoue la file dès que la connexion revient. */
export function installOnlineSync(): () => void {
  if (onlineHandlerInstalled) return () => undefined;
  onlineHandlerInstalled = true;
  const onOnline = () => {
    void flushOutbox();
  };
  window.addEventListener('online', onOnline);
  return () => {
    onlineHandlerInstalled = false;
    window.removeEventListener('online', onOnline);
  };
}