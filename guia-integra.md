# Guía de integración frontend ↔ API

Cómo conectar las pantallas de [`frontend-stitch-prompt.md`](frontend-stitch-prompt.md) con la API de `salud-auto` (SPEC 01–06).
Los ejemplos usan TypeScript + `fetch` y son independientes del framework.

## 1. Entorno local

### 1.1 API

```bash
docker compose up -d                 # Postgres en :5433
cp .env.example .env                 # ajustar valores
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Variables del `.env` que afectan al frontend:

| Variable | Valor en desarrollo | Motivo |
| --- | --- | --- |
| `OAUTH_RESULT_REDIRECT_URL` | `http://localhost:4200/conexiones/resultado` | Página del frontend que recibe el resultado OAuth (pantalla 5). |
| `OAUTH_STATE_SECRET` | ≥ 32 caracteres, distinto de `JWT_SECRET` | Sin él (o sin la URL anterior) `POST /{provider}/authorize` responde `404`. |
| `OAUTH_COOKIE_SECURE` | `false` | La cookie `oauth_binding` debe viajar por `http://localhost`. |
| `MS_REDIRECT_URI` / `GOOGLE_REDIRECT_URI` | `http://localhost:8000/email-integrations/{provider}/callback` | El proveedor vuelve **a la API**, no al frontend. |
| `IMAP_ENABLED` | `true` | Sin él IMAP no aparece en `/providers`. |
| `SYNC_WORKER_ENABLED` | `true` | Si es `false`, correr `python -m app.cli sync-worker` aparte o los runs se quedan en `queued`. |

Solo se listan en `/providers` los proveedores con todas sus variables configuradas.

### 1.2 CORS

Dos formas de conectar el frontend:

**A. Proxy del dev server (sin CORS).** El navegador solo ve el origen del frontend (`http://localhost:4200`). La configuración está en `proxy.conf.js`. Reenvía a `:8000` los prefijos de la API y, si la petición es una navegación (`Accept: text/html` o `Sec-Fetch-Dest: document`), responde con `index.html`.

Sin ese bypass, recargar o volver atrás en `/cases` o `/documents` muestra `{"detail":"No autenticado"}`.

- No reescribir la ruta (sin `pathRewrite` ni prefijo `/api`): la cookie `oauth_binding` se fija con `Path=/email-integrations/{provider}/callback`.
- El callback OAuth se reenvía siempre a la API. El redirect URI sigue en el puerto `8000`.
- `ng serve` ya escucha en el `4200`. Hay que reiniciarlo si cambia el proxy.

**B. CORS en la API (frontend en otro origen).** Configurar en el `.env` de la API:

```bash
CORS_ALLOWED_ORIGINS=http://localhost:4200            # varios: separados por comas
```

- Solo orígenes exactos (`esquema://host[:puerto]`), sin `*` ni rutas; `https` obligatorio con `APP_ENV=production`. Vacía (por defecto) = CORS desactivado.
- La API responde con `Access-Control-Allow-Credentials: true`, métodos `GET, POST, DELETE`, cabeceras `Authorization, Content-Type, X-Request-ID`, y expone `Retry-After` y `X-Request-ID` (sin esto el frontend no puede leerlas).
- En el frontend, la URL base apunta a la API (`http://localhost:8000`; vacía si usas el proxy) y **todas** las peticiones usan `credentials: 'include'`; si no, el navegador descarta la cookie `oauth_binding` de `POST /{provider}/authorize` y el callback termina en `invalid_state`.
- La cookie es `SameSite=Lax`: frontend y API deben ser del mismo *site* (p. ej. `app.salud.com` y `api.salud.com`). Con dominios distintos el navegador la trata como de terceros y el flujo OAuth falla.

**Producción:** preferible servir frontend y API bajo el mismo dominio con un reverse proxy (como la opción A). Si van en subdominios, usar la opción B con `https`. `OAUTH_COOKIE_SECURE=true` siempre.

## 2. Cliente HTTP

### 2.1 Tipos

```ts
// api/types.ts
export type Role = 'owner' | 'admin' | 'member';
export type ProviderId = 'microsoft_graph' | 'gmail' | 'imap';
export type ConnectionStatus = 'pending' | 'active' | 'reauth_required' | 'error' | 'disconnected';
export type SyncRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type ErrorCode =
  | 'invalid_state' | 'consent_denied' | 'insufficient_scopes' | 'credentials_revoked'
  | 'account_mismatch' | 'invalid_configuration' | 'provider_unavailable' | 'rate_limited'
  | 'connection_inactive' | 'destination_not_allowed' | 'tls_verification_failed'
  | 'invalid_credentials' | 'connection_already_exists' | 'secret_delete_failed' | 'internal_error';

export interface TokenResponse { access_token: string; refresh_token: string; token_type: 'bearer'; expires_in: number }
export interface Me { user_id: string; email: string; tenant: { id: string; slug: string; name: string }; role: Role }
export interface ProviderInfo {
  provider: ProviderId; auth_method: 'oauth2' | 'password';
  supports_incremental_sync: boolean; supports_revocation: boolean;
}
export interface EmailConnection {
  id: string; provider: ProviderId; mailbox_address: string; status: ConnectionStatus;
  granted_scopes: string[]; last_sync_at: string | null; last_error_code: ErrorCode | null;
  created_at: string; disconnected_at: string | null;
  imap_host: string | null; imap_port: number | null; // solo IMAP
}
export interface ImapConnectIn { mailbox_address: string; host: string; port?: number; username: string; password: string }
export interface AuthorizationStart { authorization_url: string; expires_in: number }
export interface ConnectionTest { ok: boolean; connection: EmailConnection }
export interface SyncRun {
  id: string; connection_id: string; status: SyncRunStatus;
  pages_fetched: number; messages_seen: number; messages_inserted: number; has_more: boolean;
  error_code: ErrorCode | null; created_at: string; started_at: string | null; finished_at: string | null;
}
export interface EmailMessage {
  id: string; sender: string | null; subject: string | null; received_at: string | null;
  has_attachments: boolean; first_seen_at: string;
}
export interface MessagePage { items: EmailMessage[]; next_cursor: string | null }

// Casos y respuestas (SPEC 13 y 18). Solo los campos que usa la pantalla de casos.
export type CaseStatus = 'por_vencer' | 'en_termino' | 'vencido' | 'respondido' | 'sin_termino';
export type DeadlineStatus = 'por_vencer' | 'en_termino' | 'vencido' | 'sin_termino'; // por tiempo, en la línea de tiempo
export type ResponseStatus = 'no_requiere' | 'pendiente' | 'vencido_sin_respuesta' | 'respondido';
export type ResponseMedium = 'correo' | 'ventanilla_virtual' | 'presencial' | 'otro';
export interface DocumentResponse {
  id: string; responded_at: string; medio: ResponseMedium | null; referencia: string | null;
  recorded_by: string; created_at: string;
  voided_at: string | null; voided_by: string | null; void_reason: string | null; // los tres null = vigente
}
export interface DocumentResponseIn { responded_at: string; medio?: ResponseMedium; referencia?: string } // con zona
export interface ResponseFields {
  respuesta_estado: ResponseStatus; a_tiempo: boolean | null; respuesta: DocumentResponse | null;
}
export interface CaseSummary {
  id: string; radicado: string; estado: CaseStatus; proximo_vencimiento: string | null; providencias: number;
}
export interface CasePage { items: CaseSummary[]; next_cursor: string | null }
export interface TimelineEntry extends ResponseFields {
  attachment_id: string; filename: string; clase: string | null; subtipo: string | null;
  fecha_providencia: string | null; juzgado: string | null; notified_at: string;
  termino: { cantidad: number; unidad: 'horas' | 'dias' | 'dias_habiles'; confianza: string | null } | null;
  vence_at: string | null; estado: DeadlineStatus;
}
export interface CaseDetail extends CaseSummary { timeline: TimelineEntry[] }
// GET /documents y /documents/{id} también traen ResponseFields; el detalle, además, respuestas: DocumentResponse[].
// Y la procedencia del LLM (SPEC 12): nombres de campo de `fields` sugeridos por el modelo ([] y null sin LLM).
export type LlmField = 'partes' | 'tipo_providencia' | 'termino_contestar' | 'fecha_providencia' | 'juzgado';
export interface LlmProvenance { llm_fields: LlmField[]; llm_model: string | null }
// Correo de origen del adjunto, en GET /documents y /documents/{id}. Texto no confiable: mostrarlo escapado.
export interface MessageOrigin { remitente: string | null; asunto: string | null; recibido_at: string | null }
export type DocumentStatus = 'pending' | 'failed' | 'extracted' | 'needs_ocr'; // en el listado
export type ReviewStatus = 'unreviewed' | 'confirmed' | 'corrected';
export interface DocumentFilters {
  radicado?: string; clase?: 'auto' | 'sentencia' | 'desconocido'; fecha_desde?: string; fecha_hasta?: string;
  document_status?: DocumentStatus; review_status?: ReviewStatus; confianza_baja?: boolean; sugerido_ia?: boolean;
}
// GET /dashboard/summary
export interface DayCount { fecha: string; total: number } // fecha: 'YYYY-MM-DD' (Bogotá)
export interface DashboardSummary {
  generado_at: string;
  periodo: { desde: string; hasta: string };
  documentos: {
    recibidos_hoy: number; recibidos_periodo: number; recibidos_periodo_anterior: number;
    por_estado: Record<DocumentStatus, number>;
    sin_revisar: number; confianza_baja_sin_revisar: number; sugeridos_ia_sin_revisar: number; sin_caso: number;
  };
  casos: Record<CaseStatus, number> & { total: number };
  respuestas_periodo: { total: number; a_tiempo: number; tarde: number; porcentaje_a_tiempo: number | null };
  calidad: {
    documentos: number; revisados: number; corregidos: number; con_sugerencias_ia: number; con_ocr: number;
    campos: { alta: number; media: number; baja: number; sin_valor: number };
  };
  vencimientos_proximos: DayCount[];
  recibidos_por_dia: DayCount[];
  por_tipo: { clase: string | null; subtipo: string | null; total: number }[];
  top_juzgados: { juzgado: string; total: number }[];
}
export type AlertType = 'por_vencer' | 'vencido_sin_respuesta';
export interface Alert {
  id: string; tipo: AlertType; vence_at: string; case_id: string | null; attachment_id: string; created_at: string;
  leida: boolean; read_at: string | null; // del usuario actual
  respuesta_estado: ResponseStatus; vigente: boolean; // vigente=false: ya respondida o término corregido
}
export interface AlertPage { items: Alert[]; next_cursor: string | null }
```

Fechas: ISO 8601 en UTC. IDs: UUID string.

### 2.2 Tokens

- `access_token`: JWT, 15 min (`expires_in` en segundos). Va en `Authorization: Bearer …`.
- `refresh_token`: opaco, 7 días, **de un solo uso**. Cada `POST /auth/refresh` devuelve un par nuevo y consume el anterior. **Reusar un refresh ya consumido revoca toda la cadena** (el usuario queda deslogueado).
- Consecuencia: el refresh debe ser *single-flight* (una sola promesa compartida). Si dos peticiones reciben `401` a la vez y cada una refresca, la segunda reutiliza el token y cierra la sesión.
- Almacenamiento: access token en memoria; refresh token en `sessionStorage` (o `localStorage` si se quiere sesión persistente entre pestañas, asumiendo el riesgo XSS). No hay cookies de sesión.

### 2.3 Cliente

```ts
// api/client.ts
import type { TokenResponse } from './types';

// '' con proxy (opción A); 'http://localhost:8000' con CORS (opción B).
const API_URL = '';
const REFRESH_KEY = 'salud.refresh';
let accessToken: string | null = null;
let refreshing: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,            // `detail` si es string; 'validation_error' si es lista (422 de pydantic)
    public body: unknown,
    public retryAfter: number | null,
  ) { super(code); }
}

export function setTokens(t: TokenResponse | null) {
  accessToken = t?.access_token ?? null;
  try {
    if (t) sessionStorage.setItem(REFRESH_KEY, t.refresh_token);
    else sessionStorage.removeItem(REFRESH_KEY);
  } catch { /* storage bloqueado: sesión solo en memoria */ }
}

export function getRefreshToken(): string | null {
  try { return sessionStorage.getItem(REFRESH_KEY); } catch { return null; }
}

let onSessionExpired: () => void = () => {};
export function setOnSessionExpired(fn: () => void) { onSessionExpired = fn; }

async function doRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    credentials: 'include',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: rt }),
  });
  if (!res.ok) { setTokens(null); return false; }
  setTokens(await res.json());
  return true;
}

function refreshOnce(): Promise<boolean> {
  refreshing ??= doRefresh().finally(() => { refreshing = null; });
  return refreshing;
}

async function toError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => null);
  const detail = (body as { detail?: unknown } | null)?.detail;
  const code = typeof detail === 'string' ? detail : Array.isArray(detail) ? 'validation_error' : 'internal_error';
  const ra = res.headers.get('Retry-After');
  return new ApiError(res.status, code, body, ra ? Number(ra) : null);
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshOnce()) return api<T>(path, init, false);
    onSessionExpired();
  }
  if (!res.ok && res.status !== 202) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

`credentials: 'include'` es inocuo con proxy y obligatorio con CORS (opción B).

### 2.4 Endpoints

```ts
// api/endpoints.ts
import { api, setTokens, getRefreshToken } from './client';
import type * as T from './types';

const EI = '/email-integrations';
const post = (body?: unknown): RequestInit => ({ method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const auth = {
  async login(tenant_slug: string, email: string, password: string) {
    setTokens(await api<T.TokenResponse>('/auth/login', post({ tenant_slug, email, password }), false));
  },
  async logout() {
    const rt = getRefreshToken();
    if (rt) await api<void>('/auth/logout', post({ refresh_token: rt })).catch(() => {});
    setTokens(null);
  },
  me: () => api<T.Me>('/me'),
};

export const integrations = {
  providers: () => api<T.ProviderInfo[]>(`${EI}/providers`),
  list: () => api<T.EmailConnection[]>(EI),
  get: (id: string) => api<T.EmailConnection>(`${EI}/${id}`),
  authorize: (provider: Exclude<T.ProviderId, 'imap'>) =>
    api<T.AuthorizationStart>(`${EI}/${provider}/authorize`, post()),
  connectImap: (body: T.ImapConnectIn) => api<T.EmailConnection>(`${EI}/imap`, post(body)),
  test: (id: string) => api<T.ConnectionTest>(`${EI}/${id}/test`, post()),
  disconnect: (id: string) =>
    api<T.EmailConnection | undefined>(`${EI}/${id}`, { method: 'DELETE' }), // undefined = 204, objeto = 202
  sync: (id: string) => api<T.SyncRun>(`${EI}/${id}/sync`, post()),
  syncRun: (id: string, runId: string) => api<T.SyncRun>(`${EI}/${id}/sync-runs/${runId}`),
  messages: (id: string, cursor?: string | null, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (cursor) q.set('cursor', cursor);
    return api<T.MessagePage>(`${EI}/${id}/messages?${q}`);
  },
};

export const cases = {
  list: (params: { estado?: T.CaseStatus; cursor?: string | null; limit?: number } = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.estado) q.set('estado', params.estado);
    if (params.cursor) q.set('cursor', params.cursor);
    return api<T.CasePage>(`/cases?${q}`);
  },
  get: (id: string) => api<T.CaseDetail>(`/cases/${id}`),
  recordResponse: (attachmentId: string, body: T.DocumentResponseIn) =>
    api<T.DocumentResponse>(`/documents/${attachmentId}/response`, post(body)),
  voidResponse: (attachmentId: string, motivo: string) =>
    api<T.DocumentResponse>(`/documents/${attachmentId}/response/void`, post({ motivo })),
};

export const dashboard = {
  summary: (dias = 30, dias_vencimiento = 10) => {
    const q = new URLSearchParams({ dias: String(dias), dias_vencimiento: String(dias_vencimiento) });
    return api<T.DashboardSummary>(`/dashboard/summary?${q}`);
  },
};

export const documents = {
  // Cada item trae también `correo` (T.MessageOrigin).
  list: (filters: T.DocumentFilters = {}, cursor?: string | null, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    for (const [k, v] of Object.entries(filters)) if (v !== undefined) q.set(k, String(v));
    if (cursor) q.set('cursor', cursor);
    return api<{ items: unknown[]; next_cursor: string | null }>(`/documents?${q}`);
  },
};

export const alerts = {
  list: (params: { no_leidas?: boolean; tipo?: T.AlertType; cursor?: string | null; limit?: number } = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.no_leidas) q.set('no_leidas', 'true');
    if (params.tipo) q.set('tipo', params.tipo);
    if (params.cursor) q.set('cursor', params.cursor);
    return api<T.AlertPage>(`/alerts?${q}`);
  },
  unreadCount: () => api<{ no_leidas: number }>('/alerts/unread-count'),
  read: (id: string) => api<void>(`/alerts/${id}/read`, post()),
  readAll: () => api<void>('/alerts/read-all', post()),
};
```

## 3. Referencia de endpoints

Rol: **todos** = owner/admin/member; **admin** = owner/admin (member recibe `403 "Permisos insuficientes"`).

| Método y ruta | Rol | Body | Éxito | Errores |
| --- | --- | --- | --- | --- |
| `POST /auth/login` | — | `{tenant_slug, email, password}` | `200 TokenResponse` | `401 "Credenciales inválidas"`, `429` + `Retry-After`, `422` |
| `POST /auth/refresh` | — | `{refresh_token}` | `200 TokenResponse` | `401` |
| `POST /auth/logout` | Bearer | `{refresh_token}` | `204` | `401` |
| `GET /me` | Bearer | — | `200 Me` | `401` |
| `GET /email-integrations/providers` | todos | — | `200 ProviderInfo[]` | |
| `GET /email-integrations` | todos | — | `200 EmailConnection[]` | |
| `GET /email-integrations/{id}` | todos | — | `200 EmailConnection` | `404` (no existe u otro tenant) |
| `POST /email-integrations/{provider}/authorize` | admin | — | `200 AuthorizationStart` + cookie | `404` (proveedor no configurado), `429` |
| `GET /email-integrations/{provider}/callback` | — | (lo llama el proveedor) | `302` → `OAUTH_RESULT_REDIRECT_URL` | |
| `POST /email-integrations/imap` | admin | `ImapConnectIn` | `201` alta / `200` reautorización | `409 connection_already_exists`, `422 {código}`, `429`, `404` |
| `POST /email-integrations/{id}/test` | admin | — | `200 {ok, connection}` | `404`, `409` desconectada |
| `DELETE /email-integrations/{id}` | admin | — | `204` / `202 EmailConnection` | `404` |
| `POST /email-integrations/{id}/sync` | admin | — | `202 SyncRun` | `404`, `409 {detail:"connection_not_active", status}`, `429` |
| `GET /email-integrations/{id}/sync-runs/{run_id}` | todos | — | `200 SyncRun` | `404` |
| `GET /email-integrations/{id}/messages?limit&cursor` | todos | — | `200 MessagePage` | `404`, `422 "Cursor inválido"` |
| `GET /dashboard/summary?dias&dias_vencimiento` | todos | — | `200 DashboardSummary` | `422` (fuera de rango) |
| `GET /documents?limit&cursor&radicado&clase&fecha_desde&fecha_hasta&document_status&review_status&confianza_baja&sugerido_ia` | todos | — | `200` página de documentos | `422 invalid_cursor`, `invalid_radicado`, `422` (valor de filtro inválido) |
| `GET /cases?limit&cursor&radicado&vence_antes&estado` | todos | — | `200 CasePage` | `422 invalid_cursor`, `invalid_radicado`, `invalid_vence_antes` |
| `GET /cases/{id}` | todos | — | `200 CaseDetail` | `404` |
| `POST /documents/{attachment_id}/response` | todos | `DocumentResponseIn` | `201 DocumentResponse` | `404`, `409 term_required`, `409 response_exists`, `422 invalid_responded_at`, `422` |
| `POST /documents/{attachment_id}/response/void` | admin | `{motivo}` | `200 DocumentResponse` (anulada) | `404`, `409 no_active_response`, `422` |
| `GET /alerts?limit&cursor&no_leidas&tipo` | todos | — | `200 AlertPage` | `422 invalid_cursor`, `422` (tipo o limit inválidos) |
| `GET /alerts/unread-count` | todos | — | `200 {no_leidas}` | |
| `POST /alerts/{id}/read` | todos | — | `204` (idempotente) | `404` (no existe u otro tenant) |
| `POST /alerts/read-all` | todos | — | `204` (idempotente) | |

Forma de los errores: siempre `{"detail": …}`. `detail` es string (mensaje o código) salvo en el `422` de validación de pydantic, donde es una lista. Todas las respuestas llevan `X-Request-ID`: mostrarlo o registrarlo en errores `5xx` ayuda a soporte.

Límites por usuario y minuto: login 5 fallos/IP+correo (configurable), authorize 10, IMAP 5, sync 10. Ante `429`, usar `Retry-After` (segundos).

## 4. Flujos por pantalla

### 4.1 Login (pantalla 1)

1. `auth.login(organizacion, correo, contraseña)`.
2. `401` → "Credenciales inválidas" (mensaje único, no distinguir campo).
3. `429` → "Demasiados intentos. Intenta de nuevo en {retryAfter} s"; deshabilitar el botón con cuenta atrás.
4. Éxito → `auth.me()` y navegar a `/conexiones`.

### 4.2 Arranque y shell (pantalla 2)

```ts
// al cargar la app
setOnSessionExpired(() => navigate('/login'));
if (getRefreshToken()) {
  try { me = await auth.me(); }      // 401 → refresh automático → reintento
  catch { navigate('/login'); }
}
```

- `me.tenant.name`, `me.email`, `me.role` en la barra superior.
- `canManage = me.role !== 'member'`. Ocultar (no solo deshabilitar) los botones de acción si es `false`. Igualmente manejar `403` → toast "Permisos insuficientes" (el rol se revalida en cada request y puede cambiar).
- "Cerrar sesión" → `auth.logout()` → `/login`.

### 4.3 Lista de conexiones (pantalla 3)

- `integrations.list()`.
- Columnas: `mailbox_address`, `provider` (etiqueta), `status` (badge), `last_sync_at` (tiempo relativo; `null` → "Nunca").
- Las `disconnected` se muestran con texto atenuado (la API las sigue devolviendo).

```ts
export const providerLabel: Record<ProviderId, string> = {
  microsoft_graph: 'Microsoft 365', gmail: 'Google Workspace', imap: 'IMAP',
};
export const statusBadge: Record<ConnectionStatus, { label: string; tone: 'green' | 'gray' | 'amber' | 'red' }> = {
  active: { label: 'Activa', tone: 'green' },
  pending: { label: 'Pendiente', tone: 'gray' },
  reauth_required: { label: 'Requiere reautorización', tone: 'amber' },
  error: { label: 'Error', tone: 'red' },
  disconnected: { label: 'Desconectada', tone: 'gray' },
};
```

### 4.4 Conectar buzón (pantalla 4)

Paso 1: `integrations.providers()` y mostrar solo los devueltos. Si la lista está vacía: "No hay proveedores configurados".

**OAuth (Microsoft 365, Google Workspace):**

```ts
async function connectOAuth(provider: 'microsoft_graph' | 'gmail') {
  const { authorization_url } = await integrations.authorize(provider);
  window.location.assign(authorization_url);   // misma pestaña; no popup
}
```

- Navegar en la **misma pestaña** y de inmediato: el enlace caduca en `expires_in` (600 s) y la cookie `oauth_binding` liga el flujo a este navegador.
- No abrir la URL en otro navegador ni guardarla.
- `404` → "Proveedor no disponible". `429` → toast "Demasiadas solicitudes, espera un momento".

**IMAP:**

```ts
try {
  const conn = await integrations.connectImap({ mailbox_address, host, port: 993, username, password });
  navigate(`/conexiones/${conn.id}`);           // 201 alta o 200 reautorización
} catch (e) {
  if (e instanceof ApiError && (e.status === 422 || e.status === 409)) showBanner(errorText(e.code));
  else throw e;
}
```

- `422` trae en `detail` uno de: `destination_not_allowed`, `tls_verification_failed`, `invalid_credentials`, `invalid_configuration` ("servidor no compatible"), `provider_unavailable`, `invalid_password`, o `validation_error` (lista de pydantic: marcar campos según `loc`; el body nunca incluye la contraseña).
- `409 connection_already_exists` → "Este buzón ya está conectado".
- Mismo buzón + mismo servidor ⇒ reautoriza (`200`): sirve también para el botón "Reautorizar" de una conexión IMAP.
- Borrar la contraseña del estado del formulario al terminar, con éxito o error.

### 4.5 Resultado de autorización (pantalla 5)

Ruta `/conexiones/resultado` (= `OAUTH_RESULT_REDIRECT_URL`).

```ts
const q = new URLSearchParams(location.search);
history.replaceState(null, '', location.pathname);   // limpiar la query
if (q.get('status') === 'connected') {
  // "Buzón conectado" + "Ver conexión" → /conexiones/{connection_id}
  const id = q.get('connection_id');
} else {
  // q.get('code'): invalid_state | consent_denied | insufficient_scopes | account_mismatch | …
  // título + errorText(code) + "Intentar de nuevo" → reabrir el modal (pantalla 4)
}
```

- Esta página llega por redirección completa: la app se recarga. Restaurar la sesión con el refresh token (4.2) antes de llamar a la API. Por eso conviene `sessionStorage`/`localStorage` y no solo memoria para el refresh.
- `account_mismatch` aparece al reautorizar con otra cuenta distinta del buzón.

### 4.6 Detalle de conexión (pantalla 6)

Carga: `integrations.get(id)` + `integrations.messages(id)` en paralelo. `404` → "Conexión no encontrada" y volver a la lista.

**Banner de reautorización** (`status === 'reauth_required'`):
- OAuth → `connectOAuth(conn.provider)`; el callback actualiza la misma conexión.
- IMAP → abrir el formulario IMAP prellenado con `mailbox_address`, `imap_host`, `imap_port` (pedir usuario y contraseña).

**Metadatos:** `granted_scopes` como chips mono; `imap_host:imap_port` solo IMAP; `last_error_code` → `errorText()`; `created_at` → "Conectada el".

**Probar conexión:**

```ts
const { ok, connection } = await integrations.test(id);
setConn(connection);
ok ? toast('Conexión verificada') : showError(errorText(connection.last_error_code));
// 409 → "La conexión está desconectada"
```

**Sincronizar + polling:**

```ts
async function startSync(id: string) {
  let run: SyncRun;
  try { run = await integrations.sync(id); }
  catch (e) {
    if (e instanceof ApiError && e.status === 409) return showError(errorText('connection_inactive'));
    if (e instanceof ApiError && e.status === 429) return toast('Demasiadas solicitudes, espera un momento');
    throw e;
  }
  toast('Sincronización en cola');
  saveRunId(id, run.id);                       // ver nota abajo
  pollRun(id, run.id);
}

async function pollRun(id: string, runId: string) {
  let delay = 2000;
  for (;;) {
    const run = await integrations.syncRun(id, runId);
    renderStrip(run);                          // queued/running/succeeded/failed + contadores
    if (run.status === 'succeeded' || run.status === 'failed') {
      setConn(await integrations.get(id));     // last_sync_at / status / last_error_code
      if (run.status === 'succeeded' && run.messages_inserted > 0) reloadMessages();
      return run;
    }
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 10000);
  }
}
```

- Estados de la franja: `queued` "En cola", `running` "Sincronizando…" (barra indeterminada), `succeeded` "Completada", `failed` "Fallida" + `errorText(run.error_code)`.
- Contadores: `pages_fetched` · `messages_seen` · `messages_inserted` ("Páginas · Mensajes vistos · Nuevos").
- `has_more === true` al terminar → "Quedan mensajes por sincronizar" + "Continuar" = `startSync(id)` otra vez.
- Si ya hay un run pendiente o en curso, `POST /sync` devuelve ese mismo run (idempotente): pulsar dos veces no duplica.
- Detener el polling al salir de la pantalla (AbortController / cleanup del efecto).
- **No existe endpoint para listar runs.** Para mostrar la franja tras recargar la página, guardar el último `run_id` por conexión (`sessionStorage`, clave `salud.run.{id}`) y reanudar `pollRun`; `404` → borrar la clave. Sin `run_id` guardado, no mostrar la franja (`last_sync_at` basta).
- `failed` con `credentials_revoked` deja la conexión en `reauth_required`: al refrescar la conexión aparece el banner.

**Mensajes:**

```ts
let cursor: string | null = null;
async function loadMore(reset = false) {
  const page = await integrations.messages(id, reset ? null : cursor);
  setItems(prev => reset ? page.items : [...prev, ...page.items]);
  cursor = page.next_cursor;                   // null → ocultar "Cargar más"
}
```

- Orden: más recientes primero. `sender`/`subject`/`received_at` pueden ser `null` → "(sin remitente)", "(sin asunto)", usar `first_seen_at` como respaldo.
- El cursor es opaco: no construirlo ni persistirlo. `422 "Cursor inválido"` → `loadMore(true)`.
- La API responde con `Cache-Control: no-store`; no cachear mensajes en storage del navegador.
- Las conexiones `disconnected` siguen listando sus mensajes ya sincronizados.

### 4.7 Desconectar (pantalla 7)

```ts
const pending = await integrations.disconnect(id);
if (pending === undefined) {                   // 204
  toast('Buzón desconectado');
} else {                                       // 202: desconectada, secreto pendiente de borrar
  setConn(pending);
  showResult('Desconectado. La eliminación de credenciales quedó pendiente.', { retry: () => integrations.disconnect(id) });
}
```

Repetir el `DELETE` reintenta el borrado; es idempotente.

### 4.8 Toasts (pantalla 8)

| Evento | Texto |
| --- | --- |
| `test` con `ok: true` | Conexión verificada |
| `sync` 202 | Sincronización en cola |
| `DELETE` 204 | Buzón desconectado |
| Cualquier `429` (salvo login) | Demasiadas solicitudes, espera un momento |
| `403` | Permisos insuficientes |
| `5xx` / red | Ocurrió un error. Intenta de nuevo. |

### 4.9 Casos y respuestas

- **Estado del caso** (`estado`): solo mira las providencias con término **sin respuesta**. `vencido` significa "vencido sin respuesta"; `respondido`, que todas las que tienen término están respondidas (`proximo_vencimiento: null`). Orden del listado: futuros, vencidos, `respondido`, `sin_termino`. Un cursor guardado de una versión anterior responde `422 invalid_cursor`: reiniciar la paginación sin cursor.
- **Línea de tiempo:** cada providencia trae dos estados. `estado` es solo por tiempo (para el contador "vence en…"); `respuesta_estado` es el que decide el color o la etiqueta: `pendiente`, `vencido_sin_respuesta`, `respondido` (con `a_tiempo`: verde si `true`, aviso "extemporánea" si `false`, nada si `null`) o `no_requiere`.
- **Registrar respuesta** (botón visible en providencias `pendiente` o `vencido_sin_respuesta`, para todos los roles): formulario con fecha y hora de envío o radicación (enviar con zona, p. ej. `toISOString()` o `-05:00`), `medio` opcional y `referencia` opcional (máx. 200). No permitir fechas futuras ni anteriores a `notified_at`; la API responde `422 invalid_responded_at` igualmente. Tras `201`, recargar el caso: puede pasar a `respondido` o cambiar de grupo.
- **Anular** (solo owner/admin; para member, ocultar el botón): pedir motivo obligatorio (1-200). Tras `200`, el caso vuelve a su estado anterior y el formulario de registro vuelve a aparecer. Corregir una respuesta = anular y registrar otra.
- Mostrar `created_at` (hora de registro) junto a `responded_at` y, en el detalle del documento, el historial `respuestas` con las anuladas tachadas, su motivo y quién anuló.
- Una respuesta en un PDF cuenta para sus copias (mismo `sha256`): la `respuesta` de una providencia puede tener otro `attachment_id` de origen; no hace falta registrarla dos veces (`409 response_exists`).
- `referencia` y `void_reason` son datos del proceso: no mandarlos a analítica ni a logs del cliente.

### 4.10 Campos sugeridos por el LLM

Cuando las reglas no encuentran un campo (o lo dejan con confianza `baja`), un modelo de lenguaje puede proponerlo. Esos campos vienen en `llm_fields` de `GET /documents` y `GET /documents/{attachment_id}`.

- **Mientras `review_status` sea `unreviewed`**, resaltar cada campo de `llm_fields` como **"Sugerido"** (icono o etiqueta, distinto del aviso de confianza `media`/`baja`), con un texto de ayuda: "Propuesto automáticamente; revísalo antes de usarlo". En `partes`, resaltar la lista entera: `llm_fields` no dice qué partes vinieron del modelo.
- Un campo sugerido llega como máximo con confianza `media`: mostrar también su confianza como en el resto de campos.
- **Tras revisar** (`review_status` `confirmed` o `corrected`), quitar el resalte. `llm_fields` se conserva como procedencia; se puede mostrar en el detalle como "Sugerido por el modelo · revisado", con `llm_model` en un tooltip.
- La revisión es el `PATCH …/extraction` de siempre: corregir o confirmar un campo sugerido lo deja en `alta`. No hay endpoint propio ni botón "aceptar sugerencia": confirmar es enviar el `PATCH` vacío.
- Un término sugerido ya calcula el vencimiento del caso: en la línea de tiempo (4.9), si la providencia tiene `termino_contestar` en `llm_fields` y no está revisada, añadir el aviso "Término sugerido, sin revisar" junto al contador.
- Ni `llm_fields` ni `llm_model` llevan datos del documento, pero los valores de `fields` sí: no mandarlos a analítica ni a logs del cliente.

### 4.11 Alertas de vencimiento

- **Contador** (campana en la barra superior): `alerts.unreadCount()` al arrancar, al volver a la pestaña (`visibilitychange`) y cada 1-2 minutos mientras la pestaña está visible. Las alertas las genera el worker cada `ALERT_SCAN_TICK_SECONDS` (60 s por defecto): no hace falta sondear más rápido. `unread-count` coincide con `list({ no_leidas: true })`.
- **Panel:** `alerts.list()` de la más reciente a la más antigua, con "Cargar más" hasta `next_cursor: null` y un filtro "Solo no leídas" (`no_leidas`). Texto por `tipo`: `por_vencer` → "Providencia por vencer · vence {vence_at}", `vencido_sin_respuesta` → "Providencia vencida sin respuesta · venció {vence_at}". Mostrar `vence_at` en hora de Bogotá, igual que en los casos.
- **Clic en una alerta:** `alerts.read(id)` y navegar a `/cases/{case_id}` o, si `case_id` es `null`, a `/documents/{attachment_id}`. Son las mismas rutas que llevan los enlaces del correo (`{APP_PUBLIC_URL}/cases/…` y `/documents/…`): el frontend debe resolverlas, pedir sesión si no la hay y volver a la ruta tras el login.
- **"Marcar todas como leídas":** `alerts.readAll()` y poner el contador a 0. Solo afecta al usuario actual; los demás miembros conservan su estado.
- **`vigente`:** si es `false` (ya se respondió o se corrigió el término), mostrar la alerta atenuada o con la etiqueta "Resuelta"; no ocultarla, para conservar el historial. `respuesta_estado` da el estado actual de la providencia con los mismos colores de la línea de tiempo (4.9). Tras registrar una respuesta, recargar el panel: la alerta pasa a `vigente: false`.
- Un término corregido genera una alerta nueva con el `vence_at` nuevo; la anterior queda con `vigente: false`. Pueden convivir dos alertas de la misma providencia.
- Las alertas son del tenant: un miembro nuevo ve las existentes (sin leer). Marcar como leída no se deshace.
- `invalid_cursor` → recargar la lista sin cursor. `404` al marcar (alerta de otro tenant o inexistente) → recargar la lista.

### 4.12 Dashboard e identificación del proceso

Detalle completo, elemento por elemento, de las pantallas diseñadas: [integracion-dashboard-identificacion.md](integracion-dashboard-identificacion.md).

- **Dashboard:** una sola llamada, `dashboard.summary()`, al entrar y cada 1-2 minutos con la pestaña visible. Tarjetas: `documentos.recibidos_hoy`, `documentos.sin_revisar`, `casos.vencido`, `casos.por_vencer`, `casos.en_termino` y `respuestas_periodo.porcentaje_a_tiempo` (null → "—"). Variación: `recibidos_periodo` frente a `recibidos_periodo_anterior`. Gráficos: `vencimientos_proximos`, `documentos.por_estado`, `recibidos_por_dia`, `top_juzgados` y `por_tipo`. Las series ya traen todos los días, con ceros.
- **Tabla "requieren atención":** `cases.list()` sin filtro, primera página: ya viene ordenada por el vencimiento más próximo.
- **Clic en una tarjeta:** llevar al listado equivalente, que da el mismo número. `sin_revisar` → `documents.list({ document_status: 'extracted', review_status: 'unreviewed' })`; `confianza_baja_sin_revisar` y `sugeridos_ia_sin_revisar` añaden `confianza_baja: true` o `sugerido_ia: true`; cada estado de caso → `cases.list({ estado })`.
- **Identificación del proceso** (detalle de la providencia): `GET /documents/{id}` trae los campos con su confianza y página, `llm_fields`, el `correo` de origen, `case_id` y el vencimiento. El PDF se descarga de `GET /email-integrations/{connection_id}/messages/{message_id}/attachments/{attachment_id}` y el texto por página (método y confianza OCR) de `GET /documents/{id}/text`. Con `case_id`, `cases.get(case_id)` da la línea de tiempo del proceso; con `case_id: null` y `document_status: extracted`, mostrar "Sin radicado: ingréselo para asociarlo a un caso". El caso se crea solo al guardar el radicado (extracción o `PATCH`): no hay botón "crear caso".
- `documentos.sin_caso` cuenta esas providencias sin radicado: son las que el sistema no pudo identificar.

## 5. Mapeo de códigos de error

```ts
// api/errors.ts
const texts: Record<string, string> = {
  invalid_state: 'El enlace de autorización venció. Intenta de nuevo.',
  consent_denied: 'Se canceló el consentimiento.',
  insufficient_scopes: 'Faltan permisos para leer el buzón.',
  credentials_revoked: 'Los permisos se revocaron o vencieron.',
  account_mismatch: 'La cuenta no coincide con el buzón conectado.',
  invalid_configuration: 'Configuración del proveedor o servidor no compatible.',
  provider_unavailable: 'El proveedor no responde. Intenta más tarde.',
  rate_limited: 'El proveedor limitó las solicitudes. Intenta más tarde.',
  connection_inactive: 'La conexión ya no está activa.',
  connection_not_active: 'La conexión ya no está activa.',
  destination_not_allowed: 'Servidor o puerto no permitido.',
  tls_verification_failed: 'El certificado TLS del servidor no es válido.',
  invalid_credentials: 'Usuario o contraseña incorrectos.',
  invalid_password: 'La contraseña no es válida.',
  connection_already_exists: 'Este buzón ya está conectado.',
  secret_delete_failed: 'La eliminación de credenciales quedó pendiente.',
  internal_error: 'Ocurrió un error. Intenta de nuevo.',
  term_required: 'La providencia no tiene término. Corrige el término antes de registrar la respuesta.',
  response_exists: 'Ya hay una respuesta registrada. Anúlala para registrar otra.',
  no_active_response: 'No hay una respuesta vigente para anular.',
  invalid_responded_at: 'La fecha de respuesta no puede ser futura ni anterior a la notificación.',
  invalid_cursor: 'La lista cambió. Vuelve a cargarla.',
};
export const errorText = (code: string | null | undefined) =>
  (code && texts[code]) || texts.internal_error;
```

Nunca mostrar `detail` crudo al usuario salvo los mensajes ya en español de auth (`401`, `403`, `404`).

## 6. Checklist de verificación

Con la API corriendo y un usuario sembrado (owner y member):

- [ ] Login correcto → shell con tenant, correo y rol.
- [ ] 5 logins fallidos → mensaje con cuenta atrás de `Retry-After`.
- [ ] Esperar 15 min (o bajar `ACCESS_TOKEN_TTL_MINUTES`) → la siguiente petición refresca sin cerrar sesión; varias peticiones simultáneas producen **un solo** `POST /auth/refresh`.
- [ ] Recargar la página mantiene la sesión.
- [ ] Logout → `/login`; el refresh antiguo devuelve `401`.
- [ ] Member: sin botones de acción; `POST` forzado → `403` manejado.
- [ ] `/providers` muestra solo los proveedores configurados.
- [ ] OAuth Microsoft/Google: consentimiento → `/conexiones/resultado?status=connected…` → detalle. Cancelar el consentimiento → `consent_denied`. Esperar > 10 min antes de consentir → `invalid_state`.
- [ ] IMAP: alta correcta (`201`); host privado (`127.0.0.1`) → `destination_not_allowed`; contraseña errónea → `invalid_credentials`; repetir alta → `200` reautorización.
- [ ] Probar conexión → toast; con credencial revocada → `ok:false` y banner de reautorización.
- [ ] Sincronizar → franja `queued → running → succeeded`, contadores, mensajes nuevos visibles; `has_more` → "Continuar".
- [ ] "Cargar más" pagina hasta `next_cursor: null`.
- [ ] Desconectar → `204` y estado `disconnected`; sincronizar después → `409` manejado.
- [ ] Casos: registrar la respuesta de la única providencia vencida → el caso pasa de `vencido` a `respondido`; anularla (admin) → vuelve a `vencido`. Member no ve "Anular"; un `POST` forzado → `403` manejado.
- [ ] Registrar sin término → `term_required`; registrar dos veces → `response_exists`; fecha futura → `invalid_responded_at`.
- [ ] Alertas: con una providencia por vencer, `python -m app.cli alerts-scan` → el contador sube; abrir la alerta → navega al caso y el contador baja; un segundo usuario del tenant sigue viéndola sin leer. Registrar la respuesta → la alerta aparece como resuelta (`vigente: false`). "Marcar todas" → contador a 0.
- [ ] Campos sugeridos: con `DOCUMENT_LLM_BACKEND=fake` no hay sugerencias reales; con un documento cuya extracción tenga `llm_fields` (o con `bedrock` en un entorno de prueba), el campo aparece como "Sugerido"; tras `PATCH` vacío deja de resaltarse y `review_status` pasa a `confirmed`.
- [ ] Ninguna llamada da error de CORS en consola (opción B: preflight `OPTIONS` con `200` y `Access-Control-Allow-Origin` = origen del frontend).

## 7. Limitaciones de la API a tener en cuenta

| Limitación | Impacto en frontend | Posible cambio en API |
| --- | --- | --- |
| Sin listado de sync runs | La franja no se recupera tras recargar sin `run_id` guardado | `GET /{id}/sync-runs?limit=1` |
| Rate limits en memoria por proceso | Con varias instancias los límites son por instancia | Redis (fuera de alcance actual) |
| Refresh de un solo uso con detección de reutilización | Dos pestañas que refrescan a la vez cierran la sesión | Coordinar entre pestañas con `BroadcastChannel` o usar `sessionStorage` (una sesión por pestaña) |
