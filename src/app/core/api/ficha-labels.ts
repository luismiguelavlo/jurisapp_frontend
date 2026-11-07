import type {
  CalidadAgente,
  DecisionDesacato,
  EntidadDetectada,
  EstadoAntecedente,
  Fuente,
  FuenteDeteccion,
  Regimen,
  SentidoFallo,
  TerminoActuacion,
  TipoActuacion,
  TipoDocumento,
  TipoTecnologia,
  Unidad,
} from './types';

export const TIPO_ACTUACION: Record<TipoActuacion, string> = {
  admisorio: 'Admisión / vinculación',
  medida_provisional: 'Medida provisional',
  requerimiento: 'Requerimiento',
  fallo_primera: 'Fallo de primera instancia',
  fallo_segunda: 'Fallo de segunda instancia',
  requerimiento_previo_desacato: 'Requerimiento previo (desacato)',
  apertura_desacato: 'Apertura de desacato',
  decision_desacato: 'Decisión de desacato',
  consulta_desacato: 'Consulta de desacato',
  cierre: 'Archivo',
  otra: 'Otra actuación',
};

export const TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  escrito_tutela: 'Escrito de tutela',
  auto: 'Auto',
  sentencia: 'Sentencia',
  notificacion: 'Notificación',
  incidente_desacato: 'Incidente de desacato',
  impugnacion: 'Impugnación',
  contestacion: 'Contestación',
  anexo: 'Anexo',
  otro: 'Documento',
};

export const CALIDAD_AGENTE: Record<CalidadAgente, string> = {
  agente_oficioso: 'agente oficioso',
  apoderado: 'apoderado',
  personero: 'personero',
  defensor: 'defensor',
  familiar: 'familiar',
  otro: 'otro',
};

export const REGIMEN: Record<Regimen, string> = {
  contributivo: 'Contributivo',
  subsidiado: 'Subsidiado',
  especial: 'Especial',
  excepcion: 'Excepción',
  no_afiliado: 'No afiliado',
};

export const TIPO_TECNOLOGIA: Record<TipoTecnologia, string> = {
  medicamento: 'Medicamento',
  procedimiento: 'Procedimiento',
  insumo: 'Insumo',
  dispositivo: 'Dispositivo',
  consulta: 'Consulta',
  examen: 'Examen',
  servicio: 'Servicio',
  transporte: 'Transporte',
  otro: 'Otro',
};

export const ESTADO_ANTECEDENTE: Record<EstadoAntecedente, string> = {
  pendiente: 'Pendiente',
  agotado: 'Agotado',
  negado: 'Negado',
  entregado: 'Entregado',
  otro: 'Otro',
};

export const SENTIDO_FALLO: Record<SentidoFallo, string> = {
  concede: 'Concede',
  niega: 'Niega',
  improcedente: 'Improcedente',
  hecho_superado: 'Hecho superado',
  parcial: 'Concede parcialmente',
};

export const DECISION_DESACATO: Record<DecisionDesacato, string> = {
  sanciona: 'Sanciona',
  se_abstiene: 'Se abstiene de sancionar',
  archiva: 'Archiva',
  cumplimiento: 'Declara cumplimiento',
};

export const UNIDAD_TERMINO: Record<Unidad, string> = {
  horas: 'horas',
  dias: 'días',
  dias_habiles: 'días hábiles',
};

export function terminoLabel(t: TerminoActuacion | null): string {
  if (!t) return 'Sin término';
  const base = `${t.cantidad} ${UNIDAD_TERMINO[t.unidad]}`;
  return t.texto ? `${base} ("${t.texto}")` : base;
}

const FUENTE_ENTIDAD: Record<Exclude<FuenteDeteccion, 'frecuencia'>, string> = {
  nombre_tenant: 'coincide con el nombre de tu organización',
  dominio_buzon: 'coincide con el dominio del buzón conectado',
};

/** Texto de evidencia de la detección automática de la entidad. */
export function deteccionEvidencia(d: EntidadDetectada): string {
  return d.fuentes
    .map((f) =>
      f === 'frecuencia' ? `aparece en ${d.casos} de ${d.total_casos} casos` : FUENTE_ENTIDAD[f],
    )
    .join('; ');
}

/** [1,2,3,5] → "1–3, 5" */
export function paginasLabel(paginas: readonly number[]): string {
  const ps = [...new Set(paginas)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < ps.length; i++) {
    const start = ps[i];
    while (i + 1 < ps.length && ps[i + 1] === ps[i] + 1) i++;
    out.push(start === ps[i] ? `${start}` : `${start}–${ps[i]}`);
  }
  return out.join(', ');
}

/** Une las fuentes del mismo documento: [{A,[1,2]},{A,[3]}] → [{A,[1,2,3]}]. */
export function mergeFuentes(fuentes: readonly Fuente[]): Fuente[] {
  const byDoc = new Map<string, Fuente>();
  for (const f of fuentes) {
    const prev = byDoc.get(f.attachment_id);
    byDoc.set(
      f.attachment_id,
      prev ? { ...prev, paginas: [...prev.paginas, ...f.paginas] } : { ...f, paginas: [...f.paginas] },
    );
  }
  return [...byDoc.values()];
}

/** Cita de procedencia: "Escrito de tutela, pág. 2–3". */
export function fuenteLabel(f: Fuente): string {
  const tipo = TIPO_DOCUMENTO[f.tipo_documento] ?? 'Documento';
  if (f.paginas.length === 0) return tipo;
  return `${tipo}, pág. ${paginasLabel(f.paginas)}`;
}
