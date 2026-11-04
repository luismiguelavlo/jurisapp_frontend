export type Role = 'owner' | 'admin' | 'member';
export type ProviderId = 'microsoft_graph' | 'gmail' | 'imap';
export type ConnectionStatus =
  | 'pending'
  | 'active'
  | 'reauth_required'
  | 'error'
  | 'disconnected';
export type SyncRunStatus = 'queued' | 'running' | 'succeeded' | 'failed';
export type ErrorCode =
  | 'invalid_state'
  | 'consent_denied'
  | 'insufficient_scopes'
  | 'credentials_revoked'
  | 'account_mismatch'
  | 'invalid_configuration'
  | 'provider_unavailable'
  | 'rate_limited'
  | 'connection_inactive'
  | 'destination_not_allowed'
  | 'tls_verification_failed'
  | 'invalid_credentials'
  | 'connection_already_exists'
  | 'secret_delete_failed'
  | 'internal_error'
  | 'term_required'
  | 'response_exists'
  | 'no_active_response'
  | 'invalid_responded_at'
  | 'invalid_cursor'
  | 'invalid_document_fields'
  | 'document_not_extracted';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export interface Me {
  user_id: string;
  email: string;
  tenant: { id: string; slug: string; name: string };
  role: Role;
}

export interface ProviderInfo {
  provider: ProviderId;
  auth_method: 'oauth2' | 'password';
  supports_incremental_sync: boolean;
  supports_revocation: boolean;
}

export interface EmailConnection {
  id: string;
  provider: ProviderId;
  mailbox_address: string;
  status: ConnectionStatus;
  granted_scopes: string[];
  last_sync_at: string | null;
  last_error_code: ErrorCode | null;
  created_at: string;
  disconnected_at: string | null;
  imap_host: string | null;
  imap_port: number | null;
}

export interface ImapConnectIn {
  mailbox_address: string;
  host: string;
  port?: number;
  username: string;
  password: string;
}

export interface AuthorizationStart {
  authorization_url: string;
  expires_in: number;
}

export interface ConnectionTest {
  ok: boolean;
  connection: EmailConnection;
}

export interface SyncRun {
  id: string;
  connection_id: string;
  status: SyncRunStatus;
  pages_fetched: number;
  messages_seen: number;
  messages_inserted: number;
  has_more: boolean;
  error_code: ErrorCode | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface EmailMessage {
  id: string;
  sender: string | null;
  subject: string | null;
  received_at: string | null;
  has_attachments: boolean;
  first_seen_at: string;
  content_status?: string;
}

export interface MessagePage {
  items: EmailMessage[];
  next_cursor: string | null;
}

export interface MessageAttachment {
  id: string;
  filename: string;
  size_bytes: number;
  sha256: string;
  document_status: string;
}

export interface MessageDetail {
  id: string;
  sender: string | null;
  subject: string | null;
  received_at: string | null;
  has_attachments: boolean;
  first_seen_at: string;
  content_status: string;
  body_text: string | null;
  body_html: string | null;
  body_truncated: boolean;
  attachments_skipped: number;
  attachments: MessageAttachment[];
}

// —— Casos / documentos / dashboard / alertas ——

export type CaseStatus = 'por_vencer' | 'en_termino' | 'vencido' | 'respondido' | 'sin_termino';
export type DeadlineStatus = 'por_vencer' | 'en_termino' | 'vencido' | 'sin_termino';
export type ResponseStatus =
  | 'no_requiere'
  | 'pendiente'
  | 'vencido_sin_respuesta'
  | 'respondido';
export type ResponseMedium = 'correo' | 'ventanilla_virtual' | 'presencial' | 'otro';

export interface DocumentResponse {
  id: string;
  responded_at: string;
  medio: ResponseMedium | null;
  referencia: string | null;
  recorded_by: string;
  created_at: string;
  voided_at: string | null;
  voided_by: string | null;
  void_reason: string | null;
}

export interface DocumentResponseIn {
  responded_at: string;
  medio?: ResponseMedium;
  referencia?: string;
}

export interface ResponseFields {
  respuesta_estado: ResponseStatus;
  a_tiempo: boolean | null;
  respuesta: DocumentResponse | null;
}

export interface CaseSummary {
  id: string;
  radicado: string;
  estado: CaseStatus;
  proximo_vencimiento: string | null;
  providencias: number;
  /** Correos agrupados en el caso (SPEC 19). */
  mensajes_count: number;
}

export interface UnassignedCount {
  total: number;
  adjuntos: number;
}

export interface CasePage {
  items: CaseSummary[];
  next_cursor: string | null;
}

export interface TimelineEntry extends ResponseFields {
  attachment_id: string;
  filename: string;
  clase: string | null;
  subtipo: string | null;
  fecha_providencia: string | null;
  juzgado: string | null;
  notified_at: string;
  termino: {
    cantidad: number;
    unidad: 'horas' | 'dias' | 'dias_habiles';
    confianza: string | null;
  } | null;
  vence_at: string | null;
  estado: DeadlineStatus;
}

export interface CaseDetail extends CaseSummary {
  timeline: TimelineEntry[];
}

/** GET /users — emails de uploaded_by / deleted_by / assigned_by. */
export interface TenantUser {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
}

/** Expediente SPEC 19/20 */
export type RadicadoSource = 'pdf_revisado' | 'pdf' | 'asunto' | 'cuerpo' | 'manual';
export type CaseItemKind = 'adjunto' | 'cuerpo' | 'subido';

export interface CaseFolderItem {
  id: string;
  kind: CaseItemKind;
  message_id: string | null;
  attachment_id: string | null;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  created_at: string;
  upload_id: string | null;
  uploaded_by: string | null;
}

export interface CaseFolder {
  id: string;
  name: string;
  origen: 'correo' | 'manual';
  depth: number;
  created_at: string;
  correo: {
    message_id: string;
    sender: string | null;
    subject: string | null;
    received_at: string | null;
    radicado_source: RadicadoSource | null;
    radicado_conflicto: boolean;
  } | null;
  items: CaseFolderItem[];
  children: CaseFolder[];
}

export interface CaseFiles {
  case_id: string;
  radicado: string;
  folders: CaseFolder[];
}

export interface UnassignedMessage {
  message_id: string;
  connection_id: string;
  sender: string | null;
  subject: string | null;
  received_at: string | null;
  attachments: number;
  updated_at: string;
}

export interface UnassignedPage {
  items: UnassignedMessage[];
  next_cursor: string | null;
}

export interface CaseMessageLink {
  message_id: string;
  case_id: string | null;
  radicado: string | null;
  radicado_source: RadicadoSource | null;
  radicado_conflicto: boolean;
  assigned_by: string | null;
  updated_at: string;
}

export interface CaseFolderRef {
  id: string;
  case_id: string;
  parent_id: string | null;
  name: string;
  origen: 'correo' | 'manual';
  depth: number;
}

export type CaseFolderPatch = { name: string } | { parent_id: string | null };

export interface CaseUpload {
  item_id: string;
  upload_id: string;
  case_id: string;
  folder_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
}

export interface CaseItemRef {
  id: string;
  case_id: string;
  folder_id: string;
  kind: CaseItemKind;
  upload_id: string | null;
  filename: string | null;
}

export type CaseItemPatch = { name: string } | { folder_id: string };

export interface CaseTrash {
  case_id: string;
  folders: {
    id: string;
    parent_id: string | null;
    name: string;
    depth: number;
    deleted_at: string;
    deleted_by: string;
  }[];
  items: {
    id: string;
    folder_id: string;
    upload_id: string;
    filename: string;
    content_type: string;
    size_bytes: number;
    uploaded_by: string;
    created_at: string;
    deleted_at: string;
    deleted_by: string;
  }[];
}

export const UPLOAD_ACCEPT = '.pdf,.docx,.xlsx,.jpg,.jpeg,.png';
export const UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export type LlmField =
  | 'partes'
  | 'tipo_providencia'
  | 'termino_contestar'
  | 'fecha_providencia'
  | 'juzgado';

export interface MessageOrigin {
  remitente: string | null;
  asunto: string | null;
  recibido_at: string | null;
}

export type DocumentStatus =
  | 'not_requested'
  | 'pending'
  | 'failed'
  | 'extracted'
  | 'needs_ocr';

export type ReviewStatus = 'unreviewed' | 'confirmed' | 'corrected';

export interface DocumentFilters {
  radicado?: string;
  clase?: 'auto' | 'sentencia' | 'desconocido';
  fecha_desde?: string;
  fecha_hasta?: string;
  document_status?: DocumentStatus;
  review_status?: ReviewStatus;
  confianza_baja?: boolean;
  sugerido_ia?: boolean;
}

export type Confianza = 'alta' | 'media' | 'baja';
export type Clase = 'auto' | 'sentencia' | 'desconocido';
export type Subtipo =
  | 'admisorio'
  | 'requerimiento'
  | 'apertura_desacato'
  | 'sancion_desacato'
  | 'inadmite'
  | 'rechaza'
  | 'concede_impugnacion'
  | 'otro'
  | 'primera_instancia'
  | 'segunda_instancia';
export type Especialidad =
  | 'penal'
  | 'civil'
  | 'laboral'
  | 'familia'
  | 'administrativo'
  | 'promiscuo'
  | 'pequenas_causas';
export type Categoria = 'municipal' | 'circuito' | 'tribunal';
export type Unidad = 'horas' | 'dias' | 'dias_habiles';
export type ParteRol = 'accionante' | 'accionado' | 'vinculado';
export type TipoId = 'NIT' | 'CC' | 'CE' | 'PA' | 'TI';

export interface Campo<V> {
  valor: V | null;
  confianza: Confianza | null;
  pagina: number | null;
}

export interface Juzgado {
  nombre: string;
  numero: number | null;
  especialidad: Especialidad | null;
  categoria: Categoria | null;
  ciudad: string | null;
  departamento: string | null;
}

export interface Parte {
  rol: ParteRol;
  nombre: string;
  confianza: Confianza;
  pagina: number | null;
  identificacion: {
    tipo: TipoId;
    numero: string;
    fuente: 'documento' | 'catalogo';
  } | null;
}

export interface DocumentFields {
  tipo_providencia: Campo<{ clase: Clase; subtipo: Subtipo | null }>;
  fecha_providencia: Campo<string>;
  radicado: Campo<{ normalizado: string; original: string }>;
  juzgado: Campo<Juzgado>;
  correo_juzgado: Campo<string>;
  termino_contestar: Campo<{ cantidad: number; unidad: Unidad; texto: string | null }>;
  partes: Parte[];
}

export interface DocumentItem extends ResponseFields {
  attachment_id: string;
  connection_id: string;
  message_id: string;
  filename: string;
  document_status: DocumentStatus;
  review_status: ReviewStatus;
  fields: DocumentFields | null;
  case_id: string | null;
  vence_at: string | null;
  llm_fields: LlmField[];
  llm_model: string | null;
  correo: MessageOrigin;
}

export interface DocumentDetail extends DocumentItem {
  page_count: number | null;
  pages_without_text: number | null;
  extractor_version: string | null;
  error_code: string | null;
  last_review: {
    reviewed_at: string;
    reviewed_by: string;
    changed_fields: string[];
  } | null;
  respuestas: DocumentResponse[];
}

export interface DocumentPage {
  items: DocumentItem[];
  next_cursor: string | null;
}

export interface PageText {
  page_number: number;
  method: 'native' | 'ocr';
  has_text: boolean;
  truncated: boolean;
  text: string;
  ocr_confidence: number | null;
}

export interface DayCount {
  fecha: string;
  total: number;
}

export interface DashboardSummary {
  generado_at: string;
  periodo: { desde: string; hasta: string };
  documentos: {
    recibidos_hoy: number;
    recibidos_periodo: number;
    recibidos_periodo_anterior: number;
    por_estado: Record<DocumentStatus, number>;
    sin_revisar: number;
    confianza_baja_sin_revisar: number;
    sugeridos_ia_sin_revisar: number;
    sin_caso: number;
  };
  casos: Record<CaseStatus, number> & { total: number };
  respuestas_periodo: {
    total: number;
    a_tiempo: number;
    tarde: number;
    porcentaje_a_tiempo: number | null;
  };
  calidad: {
    documentos: number;
    revisados: number;
    corregidos: number;
    con_sugerencias_ia: number;
    con_ocr: number;
    campos: { alta: number; media: number; baja: number; sin_valor: number };
  };
  vencimientos_proximos: DayCount[];
  recibidos_por_dia: DayCount[];
  por_tipo: { clase: string | null; subtipo: string | null; total: number }[];
  top_juzgados: { juzgado: string; total: number }[];
}

export type AlertType = 'por_vencer' | 'vencido_sin_respuesta';

export interface Alert {
  id: string;
  tipo: AlertType;
  vence_at: string;
  case_id: string | null;
  attachment_id: string;
  created_at: string;
  leida: boolean;
  read_at: string | null;
  respuesta_estado: ResponseStatus;
  vigente: boolean;
}

export interface AlertPage {
  items: Alert[];
  next_cursor: string | null;
}
