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
  pending: { label: 'Autorización pendiente', tone: 'gray' },
  reauth_required: { label: 'Requiere reautorización', tone: 'amber' },
  error: { label: 'Con error', tone: 'red' },
  disconnected: { label: 'Desconectada', tone: 'gray' },
};

export function statusDotClass(status: ConnectionStatus): string {
  switch (status) {
    case 'active':
      return 'bg-[#3f8f5f]';
    case 'reauth_required':
      return 'bg-[#d08a1e]';
    case 'error':
      return 'bg-error';
    default:
      return 'bg-outline-variant';
  }
}

/** Borde lateral de la fila del buzón según su estado (mismo lenguaje que procesos). */
export function connectionStatusRail(status: ConnectionStatus): string {
  switch (status) {
    case 'active':
      return 'shadow-[inset_3px_0_0_#3f8f5f]';
    case 'reauth_required':
      return 'shadow-[inset_3px_0_0_#d08a1e]';
    case 'error':
      return 'shadow-[inset_3px_0_0_var(--color-error)]';
    default:
      return 'shadow-[inset_3px_0_0_var(--color-outline-variant)]';
  }
}

export function connectionStatusInk(status: ConnectionStatus): string {
  switch (status) {
    case 'active':
      return 'text-[#2f7049]';
    case 'reauth_required':
      return 'text-tertiary';
    case 'error':
      return 'text-error';
    default:
      return 'text-on-surface-variant';
  }
}

/** Qué significa el estado para quien espera providencias, y qué hacer. */
export function connectionStatusHelp(status: ConnectionStatus): string | null {
  switch (status) {
    case 'reauth_required':
      return 'Los permisos vencieron o se revocaron. Mientras no lo reautorices, no llegan providencias de este buzón.';
    case 'error':
      return 'La última lectura falló; las providencias nuevas podrían no estar llegando.';
    case 'pending':
      return 'Falta terminar la autorización con el proveedor.';
    case 'disconnected':
      return 'No se está leyendo. Lo que ya llegó sigue en los procesos.';
    default:
      return null;
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
