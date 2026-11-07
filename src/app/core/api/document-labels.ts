import type {
  CaseStatus,
  Clase,
  Confianza,
  DocumentStatus,
  ResponseStatus,
  ReviewStatus,
  Subtipo,
} from './types';

export const FIELD_LABELS: Record<string, string> = {
  radicado: 'Radicado judicial',
  tipo_providencia: 'Tipo de providencia',
  fecha_providencia: 'Fecha de la providencia',
  juzgado: 'Despacho judicial',
  correo_juzgado: 'Correo del juzgado',
  termino_contestar: 'Término para contestar',
  partes: 'Partes procesales',
};

export function confianzaLabel(c: Confianza | null | undefined): string {
  if (!c) return 'No encontrado';
  return c === 'alta' ? 'Alta' : c === 'media' ? 'Media' : 'Baja';
}

export function documentStatusLabel(s: DocumentStatus): string {
  switch (s) {
    case 'extracted':
      return 'Extraída';
    case 'needs_ocr':
      return 'Requiere OCR';
    case 'pending':
      return 'Pendiente';
    case 'failed':
      return 'Fallida';
    default:
      return 'Sin solicitar';
  }
}

export function reviewStatusLabel(s: ReviewStatus): string {
  switch (s) {
    case 'confirmed':
      return 'Confirmada';
    case 'corrected':
      return 'Corregida';
    default:
      return 'Sin revisar';
  }
}

export function responseStatusLabel(
  estado: ResponseStatus,
  aTiempo: boolean | null,
): string {
  switch (estado) {
    case 'respondido':
      if (aTiempo === true) return 'Respondida a tiempo';
      if (aTiempo === false) return 'Respondida tarde';
      return 'Respondida';
    case 'vencido_sin_respuesta':
      return 'Vencida sin respuesta';
    case 'no_requiere':
      return 'Sin término';
    default:
      return 'Pendiente';
  }
}

export function caseStatusLabel(s: CaseStatus): string {
  switch (s) {
    case 'vencido':
      return 'Vencido';
    case 'por_vencer':
      return 'Por vencer';
    case 'en_termino':
      return 'En término';
    case 'respondido':
      return 'Respondido';
    default:
      return 'Sin término';
  }
}

export function caseStatusTone(s: CaseStatus): string {
  switch (s) {
    case 'vencido':
      return 'bg-[#FEE2E2] text-[#991B1B]';
    case 'por_vencer':
      return 'bg-[#FEF3C7] text-[#92400E]';
    case 'en_termino':
      return 'bg-[#DCFCE7] text-[#15803D]';
    case 'respondido':
      return 'bg-primary-fixed text-primary';
    default:
      return 'bg-surface-container text-on-surface-variant';
  }
}

/** Borde lateral de la fila según el término (rojo sello, ámbar, tinta, neutro). */
export function caseStatusRail(s: CaseStatus): string {
  switch (s) {
    case 'vencido':
      return 'shadow-[inset_3px_0_0_var(--color-error)]';
    case 'por_vencer':
      return 'shadow-[inset_3px_0_0_#d08a1e]';
    case 'respondido':
      return 'shadow-[inset_3px_0_0_var(--color-primary)]';
    case 'en_termino':
      return 'shadow-[inset_3px_0_0_#3f8f5f]';
    default:
      return 'shadow-[inset_3px_0_0_var(--color-outline-variant)]';
  }
}

/** Borde lateral según el estado de la respuesta de una providencia. */
export function responseStatusRail(s: ResponseStatus): string {
  switch (s) {
    case 'vencido_sin_respuesta':
      return 'shadow-[inset_3px_0_0_var(--color-error)]';
    case 'pendiente':
      return 'shadow-[inset_3px_0_0_#d08a1e]';
    case 'respondido':
      return 'shadow-[inset_3px_0_0_var(--color-primary)]';
    default:
      return 'shadow-[inset_3px_0_0_var(--color-outline-variant)]';
  }
}

/** Color del texto del estado de la respuesta. */
export function responseStatusInk(s: ResponseStatus): string {
  switch (s) {
    case 'vencido_sin_respuesta':
      return 'text-error font-medium';
    case 'pendiente':
      return 'text-tertiary font-medium';
    case 'respondido':
      return 'text-primary';
    default:
      return 'text-on-surface-variant';
  }
}

/** Color del texto de tiempo restante según el término. */
export function caseStatusInk(s: CaseStatus): string {
  switch (s) {
    case 'vencido':
      return 'text-error';
    case 'por_vencer':
      return 'text-tertiary';
    default:
      return 'text-on-surface';
  }
}

export const CASE_STATUS_OPTIONS: ReadonlyArray<{ value: CaseStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'por_vencer', label: 'Por vencer' },
  { value: 'en_termino', label: 'En término' },
  { value: 'respondido', label: 'Respondidos' },
  { value: 'sin_termino', label: 'Sin término' },
];

export function claseLabel(c: Clase | null | undefined): string {
  if (!c) return '—';
  if (c === 'auto') return 'Auto';
  if (c === 'sentencia') return 'Sentencia';
  return 'Desconocido';
}

export function subtipoLabel(s: Subtipo | null | undefined): string {
  if (!s) return '';
  const map: Record<Subtipo, string> = {
    admisorio: 'Admisorio',
    requerimiento: 'Requerimiento',
    apertura_desacato: 'Apertura desacato',
    sancion_desacato: 'Sanción desacato',
    inadmite: 'Inadmite',
    rechaza: 'Rechaza',
    concede_impugnacion: 'Concede impugnación',
    otro: 'Otro',
    primera_instancia: 'Primera instancia',
    segunda_instancia: 'Segunda instancia',
  };
  return map[s] ?? s;
}

export function providenciaTitle(clase: string | null, subtipo: string | null): string {
  const c = claseLabel(clase as Clase | null);
  const s = subtipoLabel(subtipo as Subtipo | null);
  if (s) return `${c} ${s.toLowerCase()}`;
  return c;
}

export const AUTO_SUBTIPOS: Subtipo[] = [
  'admisorio',
  'requerimiento',
  'apertura_desacato',
  'sancion_desacato',
  'inadmite',
  'rechaza',
  'concede_impugnacion',
  'otro',
];

export const SENTENCIA_SUBTIPOS: Subtipo[] = ['primera_instancia', 'segunda_instancia'];
