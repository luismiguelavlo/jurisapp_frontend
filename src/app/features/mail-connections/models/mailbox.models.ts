export type MailboxStatus =
  | 'active'
  | 'reauth'
  | 'error'
  | 'pending'
  | 'disconnected';

export type MailboxProvider = 'microsoft365' | 'google' | 'imap' | 'imap-secure';

export interface MailboxConnection {
  id: string;
  email: string;
  department: string;
  icon: string;
  provider: MailboxProvider;
  providerLabel: string;
  providerIcon: string;
  status: MailboxStatus;
  statusLabel: string;
  lastSyncLabel: string;
  lastSyncTone: 'default' | 'error' | 'muted';
  dimmed?: boolean;
}

export type { RowMenuAction as MailboxMenuAction } from '../../../shared/components/row-menu/row-menu';
