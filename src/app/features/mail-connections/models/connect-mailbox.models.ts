export type MailProvider = 'microsoft' | 'google' | 'imap';

export type ImapErrorCode =
  | 'none'
  | 'destino-no-permitido'
  | 'tls-invalido'
  | 'credenciales-invalidas'
  | 'servidor-no-compatible'
  | 'servidor-no-disponible'
  | 'buzon-ya-conectado';

export interface MailProviderOption {
  id: MailProvider;
  label: string;
  description: string;
  icon: string;
  badge?: { label: string; tone: 'recommended' | 'direct' };
}

export interface ImapErrorMessage {
  title: string;
  description: string;
}

export interface ImapFormValue {
  email: string;
  server: string;
  port: string;
  username: string;
  password: string;
}

export const MAIL_PROVIDER_OPTIONS: ReadonlyArray<MailProviderOption> = [
  {
    id: 'microsoft',
    label: 'Microsoft 365',
    description:
      'Sincronización delegada mediante Microsoft Graph API (OAuth 2.0 multi-tenant).',
    icon: 'domain',
    badge: { label: 'Recomendado', tone: 'recommended' },
  },
  {
    id: 'google',
    label: 'Google Workspace',
    description:
      'Conexión autorizada vía Google Cloud OAuth para dominios corporativos clínicos.',
    icon: 'cloud',
  },
  {
    id: 'imap',
    label: 'IMAP Seguro (TLS/SSL)',
    description: 'Conexión directa mediante protocolo IMAP sobre puerto TLS/SSL dedicado (993).',
    icon: 'dns',
    badge: { label: 'Directo', tone: 'direct' },
  },
];

export const IMAP_ERROR_OPTIONS: ReadonlyArray<{ value: ImapErrorCode; label: string }> = [
  { value: 'none', label: 'Sin error (Conexión nominal)' },
  { value: 'destino-no-permitido', label: 'Destino no permitido' },
  { value: 'tls-invalido', label: 'Certificado TLS inválido' },
  { value: 'credenciales-invalidas', label: 'Credenciales inválidas' },
  { value: 'servidor-no-compatible', label: 'Servidor no compatible' },
  { value: 'servidor-no-disponible', label: 'Servidor no disponible (Timeout)' },
  { value: 'buzon-ya-conectado', label: 'Buzón ya conectado en la clínica' },
];

export const IMAP_ERROR_MESSAGES: Record<Exclude<ImapErrorCode, 'none'>, ImapErrorMessage> = {
  'destino-no-permitido': {
    title: 'Destino de red restringido',
    description: 'El host no se encuentra en el rango de dominios autorizados para San Rafael.',
  },
  'tls-invalido': {
    title: 'Certificado TLS no confiable',
    description: 'La cadena de certificación del servidor IMAP expiró o está autofirmada.',
  },
  'credenciales-invalidas': {
    title: 'Autenticación fallida',
    description: 'El par usuario / clave de aplicación fue rechazado por el servidor remoto.',
  },
  'servidor-no-compatible': {
    title: 'Protocolo no compatible',
    description: 'El servidor no soporta la extensión UIDPLUS requerida para triaje seguro.',
  },
  'servidor-no-disponible': {
    title: 'Tiempo de espera agotado',
    description: 'No se obtuvo respuesta del puerto 993 tras 15000ms. Verifique su cortafuegos.',
  },
  'buzon-ya-conectado': {
    title: 'Buzón duplicado',
    description: 'Este buzón ya está enrutado activamente en la unidad de Urgencias.',
  },
};
