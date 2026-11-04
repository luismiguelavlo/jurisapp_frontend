export type LoginSimulatorState = 'normal' | 'error' | 'rateLimit';

export interface LoginCredentials {
  tenant: string;
  email: string;
  password: string;
}
