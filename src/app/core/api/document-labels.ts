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
      return 'bg-[#DBEAFE] text-[#1E40AF]';
    default:
      return 'bg-surface-container text-on-surface-variant';
  }
}

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
