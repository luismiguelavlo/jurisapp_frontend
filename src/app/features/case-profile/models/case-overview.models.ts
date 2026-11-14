import { CALIDAD_AGENTE, UNIDAD_TERMINO } from '../../../core/api/ficha-labels';
import { providenciaTitle } from '../../../core/api/document-labels';
import type {
  Actuacion,
  ActuacionFicha,
  CaseDetail,
  CaseProfile,
  DeadlineStatus,
  DocumentItem,
  Parte,
  Subtipo,
  TimelineEntry,
  TipoActuacion,
} from '../../../core/api/types';
import { normalizeEntityName } from '../../../core/utils/entity-name';

/**
 * Vista resumida del proceso (pestaña Ficha, modo lectura).
 * Solo lo que el equipo necesita ver; el resto de la ficha sigue en el backend
 * y en el editor de revisión. Teléfono y correo del accionante NO se exponen aquí.
 */

export interface PersonaView {
  nombre: string;
  /** "CC 1.234.567" / "NIT 900.123.456"; null si no aparece. */
  documento: string | null;
}

export interface AccionanteView extends PersonaView {
  /** "Ana Gómez, agente oficioso (madre)". */
  representante: string | null;
}

export interface ProvidenciaView {
  tipo: string;
  /** YYYY-MM-DD */
  fechaAuto: string | null;
  /** ISO */
  notificadoAt: string | null;
  termino: string | null;
  /** ISO */
  venceAt: string | null;
  estado: DeadlineStatus | null;
}

export interface IdentificacionView {
  radicado: string;
  juzgado: string | null;
  correoJuzgado: string | null;
  accionante: AccionanteView | null;
  accionados: PersonaView[];
  vinculados: PersonaView[];
  providencia: ProvidenciaView | null;
  providenciasCount: number;
}

/** Tipos de providencia con el nombre que usa el equipo jurídico. */
export const PROVIDENCIA_ACTUACION: Record<TipoActuacion, string> = {
  admisorio: 'Auto que admite o vincula',
  medida_provisional: 'Medida provisional',
  requerimiento: 'Auto que requiere',
  fallo_primera: 'Sentencia de primera instancia',
  fallo_segunda: 'Sentencia de segunda instancia',
  requerimiento_previo_desacato: 'Auto que requiere antes del desacato',
  apertura_desacato: 'Auto que abre incidente de desacato',
  decision_desacato: 'Decisión del incidente de desacato',
  consulta_desacato: 'Consulta',
  cierre: 'Auto de archivo',
  otra: 'Otra providencia',
};

const PROVIDENCIA_SUBTIPO: Partial<Record<Subtipo, string>> = {
  admisorio: 'Auto que admite o vincula',
  requerimiento: 'Auto que requiere',
  apertura_desacato: 'Auto que abre incidente de desacato',
  sancion_desacato: 'Sanción',
  inadmite: 'Auto que inadmite',
  rechaza: 'Auto que rechaza',
  concede_impugnacion: 'Auto que concede la impugnación',
  primera_instancia: 'Sentencia de primera instancia',
  segunda_instancia: 'Sentencia de segunda instancia',
};

/** Nombre de la providencia que contiene una actuación. */
export function actuacionTipoLabel(a: Actuacion): string {
  if (a.tipo === 'decision_desacato' && a.decision_desacato === 'sanciona') return 'Sanción';
  return PROVIDENCIA_ACTUACION[a.tipo];
}

function actuacionLabel(a: ActuacionFicha): string {
  return actuacionTipoLabel(a.actuacion);
}

function entryLabel(e: TimelineEntry): string {
  const mapped = e.subtipo ? PROVIDENCIA_SUBTIPO[e.subtipo as Subtipo] : undefined;
  return mapped ?? providenciaTitle(e.clase, e.subtipo);
}

export function terminoText(t: { cantidad: number; unidad: keyof typeof UNIDAD_TERMINO } | null): string | null {
  return t ? `${t.cantidad} ${UNIDAD_TERMINO[t.unidad]}` : null;
}

/** Última providencia notificada; el tipo sale de la actuación de la ficha si está. */
function lastProvidencia(
  timeline: readonly TimelineEntry[],
  actuaciones: readonly ActuacionFicha[],
): ProvidenciaView | null {
  const last = timeline[timeline.length - 1];
  if (last) {
    const act = actuaciones.find((a) => a.fuente.attachment_id === last.attachment_id);
    return {
      tipo: act ? actuacionLabel(act) : entryLabel(last),
      fechaAuto: last.fecha_providencia ?? act?.actuacion.fecha_providencia ?? null,
      notificadoAt: last.notified_at,
      termino: terminoText(last.termino) ?? terminoText(act?.actuacion.termino ?? null),
      venceAt: last.vence_at,
      estado: last.estado,
    };
  }
  const latest = [...actuaciones].sort((a, b) =>
    (b.actuacion.fecha_providencia ?? '').localeCompare(a.actuacion.fecha_providencia ?? ''),
  )[0];
  if (!latest) return null;
  return {
    tipo: actuacionLabel(latest),
    fechaAuto: latest.actuacion.fecha_providencia,
    notificadoAt: null,
    termino: terminoText(latest.actuacion.termino),
    venceAt: null,
    estado: null,
  };
}

export function docText(id: { tipo: string; numero: string } | null | undefined): string | null {
  return id?.numero ? `${id.tipo} ${id.numero}` : null;
}

/** Documento de cada parte (por nombre normalizado) desde la extracción de providencias. */
function partesExtraidas(docs: readonly DocumentItem[]): Parte[] {
  return docs.flatMap((d) => d.fields?.partes ?? []);
}

function documentoDe(nombre: string, extraidas: readonly Parte[]): string | null {
  const key = normalizeEntityName(nombre);
  const hit = extraidas.find(
    (p) => p.identificacion && normalizeEntityName(p.nombre) === key,
  );
  return docText(hit?.identificacion);
}

function personas(
  rol: 'accionado' | 'vinculado',
  ficha: CaseProfile | null,
  extraidas: readonly Parte[],
): PersonaView[] {
  const desdeFicha = (ficha?.partes ?? []).filter((p) => p.rol === rol).map((p) => p.nombre);
  const nombres = desdeFicha.length
    ? desdeFicha
    : extraidas.filter((p) => p.rol === rol).map((p) => p.nombre);
  const seen = new Set<string>();
  const out: PersonaView[] = [];
  for (const nombre of nombres) {
    const key = normalizeEntityName(nombre);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ nombre: nombre.trim(), documento: documentoDe(nombre, extraidas) });
  }
  return out;
}

function accionanteView(ficha: CaseProfile | null, extraidas: readonly Parte[]): AccionanteView | null {
  const acc = ficha?.accionante?.valor;
  const extraido = extraidas.find((p) => p.rol === 'accionante');
  const nombre = acc?.nombre?.trim() || extraido?.nombre?.trim();
  if (!nombre) return null;
  const agente = ficha?.agente_oficioso?.valor;
  let representante: string | null = null;
  if (agente?.nombre) {
    representante = `${agente.nombre}, ${CALIDAD_AGENTE[agente.calidad]}`;
    if (agente.parentesco) representante += ` (${agente.parentesco})`;
  }
  return {
    nombre,
    documento: docText(acc?.identificacion) ?? documentoDe(nombre, extraidas),
    representante,
  };
}

export function buildIdentificacion(
  caso: CaseDetail,
  ficha: CaseProfile | null,
  docs: readonly DocumentItem[],
): IdentificacionView {
  const extraidas = partesExtraidas(docs);
  let juzgado: string | null = null;
  for (let i = caso.timeline.length - 1; i >= 0 && !juzgado; i--) {
    juzgado = caso.timeline[i]?.juzgado?.trim() || null;
  }
  juzgado ??= docs.find((d) => d.fields?.juzgado.valor)?.fields?.juzgado.valor?.nombre ?? null;
  const correoJuzgado =
    docs.find((d) => d.fields?.correo_juzgado.valor)?.fields?.correo_juzgado.valor ?? null;

  return {
    radicado: caso.radicado,
    juzgado,
    correoJuzgado,
    accionante: accionanteView(ficha, extraidas),
    accionados: personas('accionado', ficha, extraidas),
    vinculados: personas('vinculado', ficha, extraidas),
    providencia: lastProvidencia(caso.timeline, ficha?.actuaciones ?? []),
    providenciasCount: caso.timeline.length,
  };
}
