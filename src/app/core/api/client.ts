import { environment } from '../../../environments/environment';
import type { TokenResponse } from './types';

const API_URL: string = environment.apiUrl;
const REFRESH_KEY = 'salud.refresh';

let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;
let onSessionExpired: () => void = () => undefined;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    public body: unknown,
    public retryAfter: number | null,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

export function setTokens(t: TokenResponse | null): void {
  accessToken = t?.access_token ?? null;
  try {
    if (t) {
      sessionStorage.setItem(REFRESH_KEY, t.refresh_token);
    } else {
      sessionStorage.removeItem(REFRESH_KEY);
    }
  } catch {
    // storage bloqueado: sesión solo en memoria
  }
}

export function getRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function setOnSessionExpired(fn: () => void): void {
  onSessionExpired = fn;
}

async function doRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) {
    return false;
  }
  const res = await fetch(`${API_URL}/auth/refresh`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) {
    setTokens(null);
    return false;
  }
  setTokens((await res.json()) as TokenResponse);
  return true;
}

function refreshOnce(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function toError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;
  const code =
    typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? 'validation_error'
        : 'internal_error';
  const ra = res.headers.get('Retry-After');
  return new ApiError(res.status, code, body, ra ? Number(ra) : null);
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  // FormData: el navegador pone multipart + boundary; no forzar JSON.
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshOnce()) {
      return api<T>(path, init, false);
    }
    onSessionExpired();
  }
  if (!res.ok && res.status !== 202) {
    throw await toError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function apiBlob(path: string, retry = true): Promise<Blob> {
  const headers = new Headers();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const res = await fetch(`${API_URL}${path}`, { headers, credentials: 'include' });
  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshOnce()) {
      return apiBlob(path, false);
    }
    onSessionExpired();
  }
  if (!res.ok) {
    throw await toError(res);
  }
  return res.blob();
}
