export type ConnectionHealth = 'active' | 'reauth' | 'error';

export type SyncPhase = 'idle' | 'running' | 'completed';

export interface SyncedMessage {
  id: string;
  sender: string;
  subject: string;
  receivedAt: string;
  hasAttachment: boolean;
  attachmentTitle?: string;
}

export interface MailboxDetail {
  id: string;
  email: string;
  clinicalId: string;
  providerLabel: string;
  providerIcon: string;
  priorityLabel: string;
  linkedAt: string;
  linkedBy: string;
}
