export type OauthSimulatorState =
  | 'success'
  | 'denied'
  | 'permissions'
  | 'mismatch'
  | 'expired';

export interface OauthErrorDetails {
  text: string;
  code: string;
  remediation: string;
}

export interface OauthSimulatorOption {
  id: OauthSimulatorState;
  label: string;
}

export const OAUTH_SIMULATOR_OPTIONS: ReadonlyArray<OauthSimulatorOption> = [
  { id: 'success', label: 'Éxito' },
  { id: 'denied', label: 'Denegado' },
  { id: 'permissions', label: 'Permisos' },
  { id: 'mismatch', label: 'No coincide' },
  { id: 'expired', label: 'Expirado' },
];

export const OAUTH_ERROR_STATES: Record<
  Exclude<OauthSimulatorState, 'success'>,
  OauthErrorDetails
> = {
  denied: {
    text: 'Consentimiento denegado: El administrador o usuario canceló la solicitud de permisos en el proveedor.',
    code: 'ERR_OAUTH_CONSENT_DENIED',
    remediation: 'Solicita acceso explícito al delegado de TI',
  },
  permissions: {
    text: 'Permisos insuficientes: Se requieren privilegios de lectura de buzón (Mail.Read) aprobados por el administrador de TI.',
    code: 'ERR_SCOPE_INSUFFICIENT',
    remediation: 'Conceder consent-grant para el tenant',
  },
  mismatch: {
    text: 'La cuenta no coincide: El correo autenticado en el proveedor no coincide con la dirección del buzón solicitada.',
    code: 'ERR_UPN_IDENTITY_MISMATCH',
    remediation: 'Inicia sesión con la cuenta solicitada',
  },
  expired: {
    text: 'Enlace vencido: La sesión de intercambio del token OAuth ha expirado. Por favor, reintenta la conexión.',
    code: 'ERR_CODE_EXCHANGE_TIMEOUT',
    remediation: 'Reiniciar el flujo en menos de 10 min',
  },
};
