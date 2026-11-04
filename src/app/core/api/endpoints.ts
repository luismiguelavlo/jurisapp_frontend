import { api, apiBlob, getRefreshToken, setTokens } from './client';
import type * as T from './types';

const EI = '/email-integrations';

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const authApi = {
  async login(tenant_slug: string, email: string, password: string): Promise<void> {
    setTokens(
      await api<T.TokenResponse>(
        '/auth/login',
        post({ tenant_slug, email, password }),
        false,
      ),
    );
  },
  async logout(): Promise<void> {
    const rt = getRefreshToken();
    if (rt) {
      await api<void>('/auth/logout', post({ refresh_token: rt })).catch(() => undefined);
    }
    setTokens(null);
  },
  me: () => api<T.Me>('/me'),
  users: () => api<T.TenantUser[]>('/users'),
};

export const integrationsApi = {
  providers: () => api<T.ProviderInfo[]>(`${EI}/providers`),
  list: () => api<T.EmailConnection[]>(EI),
  get: (id: string) => api<T.EmailConnection>(`${EI}/${id}`),
  authorize: (provider: Exclude<T.ProviderId, 'imap'>) =>
    api<T.AuthorizationStart>(`${EI}/${provider}/authorize`, post()),
  connectImap: (body: T.ImapConnectIn) => api<T.EmailConnection>(`${EI}/imap`, post(body)),
  test: (id: string) => api<T.ConnectionTest>(`${EI}/${id}/test`, post()),
  disconnect: (id: string) =>
    api<T.EmailConnection | undefined>(`${EI}/${id}`, { method: 'DELETE' }),
  sync: (id: string) => api<T.SyncRun>(`${EI}/${id}/sync`, post()),
  syncRun: (id: string, runId: string) => api<T.SyncRun>(`${EI}/${id}/sync-runs/${runId}`),
  messages: (id: string, cursor?: string | null, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (cursor) {
      q.set('cursor', cursor);
    }
    return api<T.MessagePage>(`${EI}/${id}/messages?${q}`);
  },
  message: (connectionId: string, messageId: string) =>
    api<T.MessageDetail>(`${EI}/${connectionId}/messages/${messageId}`),
};

export const casesApi = {
  list: (params: {
    estado?: T.CaseStatus;
    radicado?: string;
    cursor?: string | null;
    limit?: number;
  } = {}) => {
    const q = new URLSearchParams({ limit: String(params.limit ?? 50) });
    if (params.estado) q.set('estado', params.estado);
    if (params.radicado) q.set('radicado', params.radicado);
    if (params.cursor) q.set('cursor', params.cursor);
    return api<T.CasePage>(`/cases?${q}`);
  },
  get: (id: string) => api<T.CaseDetail>(`/cases/${id}`),
  recordResponse: (attachmentId: string, body: T.DocumentResponseIn) =>
    api<T.DocumentResponse>(`/documents/${attachmentId}/response`, post(body)),
  voidResponse: (attachmentId: string, motivo: string) =>
    api<T.DocumentResponse>(`/documents/${attachmentId}/response/void`, post({ motivo })),
};

export const caseFilesApi = {
  tree: (caseId: string) => api<T.CaseFiles>(`/cases/${caseId}/files`),
  unassigned: (cursor?: string | null, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    if (cursor) q.set('cursor', cursor);
    return api<T.UnassignedPage>(`/case-messages/unassigned?${q}`);
  },
  unassignedCount: () => api<T.UnassignedCount>('/case-messages/unassigned/count'),
  assign: (messageId: string, target: { case_id: string } | { radicado: string }) =>
    api<T.CaseMessageLink>(`/case-messages/${messageId}/case`, {
      method: 'PUT',
      body: JSON.stringify(target),
    }),
  /** Abrir / descargar: siempre blob autenticado (nunca `<a href>` directo). */
  content: (itemId: string) => apiBlob(`/case-files/items/${itemId}/content`),
  contentUrl: (itemId: string) => `/case-files/items/${itemId}/content`,
  /** @deprecated usar `content` */
  contentBlob: (itemId: string) => apiBlob(`/case-files/items/${itemId}/content`),
  createFolder: (caseId: string, name: string, parentId?: string | null) =>
    api<T.CaseFolderRef>(`/cases/${caseId}/folders`, post({ name, parent_id: parentId ?? null })),
  patchFolder: (folderId: string, patch: T.CaseFolderPatch) =>
    api<T.CaseFolderRef>(`/case-folders/${folderId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteFolder: (folderId: string) =>
    api<void>(`/case-folders/${folderId}`, { method: 'DELETE' }),
  restoreFolder: (folderId: string) =>
    api<T.CaseFolderRef>(`/case-folders/${folderId}/restore`, post()),
  upload: (folderId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api<T.CaseUpload>(`/case-folders/${folderId}/uploads`, {
      method: 'POST',
      body: form,
    });
  },
  patchItem: (itemId: string, patch: T.CaseItemPatch) =>
    api<T.CaseItemRef>(`/case-files/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  deleteItem: (itemId: string) =>
    api<void>(`/case-files/items/${itemId}`, { method: 'DELETE' }),
  restoreItem: (itemId: string) =>
    api<T.CaseItemRef>(`/case-files/items/${itemId}/restore`, post()),
  trash: (caseId: string) => api<T.CaseTrash>(`/cases/${caseId}/trash`),
};

export const dashboardApi = {
  summary: (dias = 30, dias_vencimiento = 10) => {
    const q = new URLSearchParams({
      dias: String(dias),
      dias_vencimiento: String(dias_vencimiento),
    });
    return api<T.DashboardSummary>(`/dashboard/summary?${q}`);
  },
};

export const documentsApi = {
  list: (filters: T.DocumentFilters = {}, cursor?: string | null, limit = 50) => {
    const q = new URLSearchParams({ limit: String(limit) });
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    if (cursor) q.set('cursor', cursor);
    return api<T.DocumentPage>(`/documents?${q}`);
  },
  get: (id: string) => api<T.DocumentDetail>(`/documents/${id}`),
  text: (id: string) => api<T.PageText[]>(`/documents/${id}/text`),
  review: (id: string, fields: Partial<Record<keyof T.DocumentFields, unknown>>) =>
    api<T.DocumentDetail>(`/documents/${id}/extraction`, {
      method: 'PATCH',
      body: JSON.stringify({ fields }),
    }),
  pdf: (d: { connection_id: string; message_id: string; attachment_id: string }) =>
    apiBlob(`${EI}/${d.connection_id}/messages/${d.message_id}/attachments/${d.attachment_id}`),
};

export const alertsApi = {
  list: (
    params: {
      no_leidas?: boolean;
      tipo?: T.AlertType;
      cursor?: string | null;
      limit?: number;
    } = {},
  ) => {
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
