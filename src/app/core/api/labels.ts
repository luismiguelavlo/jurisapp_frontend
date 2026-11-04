import type { ConnectionStatus, ProviderId } from './types';

export const providerLabel: Record<ProviderId, string> = {
  microsoft_graph: 'Microsoft 365',
  gmail: 'Google Workspace',
  imap: 'IMAP',
};

export const providerIcon: Record<ProviderId, string> = {
  microsoft_graph: 'grid_view',
  gmail: 'mail',
  imap: 'dns',
};

export const statusBadge: Record<
  ConnectionStatus,
  { label: string; tone: 'green' | 'gray' | 'amber' | 'red' }
> = {
  active: { label: 'Activa', tone: 'green' },
  pending: { label: 'Pendiente', tone: 'gray' },
  reauth_required: { label: 'Requiere reautorización', tone: 'amber' },
  error: { label: 'Error', tone: 'red' },
  disconnected: { label: 'Desconectada', tone: 'gray' },
};

export function statusDotClass(status: ConnectionStatus): string {
  switch (status) {
    case 'active':
      return 'bg-[#10b981]';
    case 'reauth_required':
      return 'bg-[#f59e0b]';
    case 'error':
      return 'bg-[#f43f5e]';
    default:
      return 'bg-outline-variant';
  }
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return 'Nunca';
  }
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return iso;
  }
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 60) {
    return 'hace unos segundos';
  }
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) {
    return `hace ${diffMin} min`;
  }
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 48) {
    return `hace ${diffHours} h`;
  }
  const diffDays = Math.round(diffHours / 24);
  return `hace ${diffDays} días`;
}
