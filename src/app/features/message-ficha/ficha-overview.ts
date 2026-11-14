import { CALIDAD_AGENTE } from '../../core/api/ficha-labels';
import type { MessageAnalysis, MessageAnalysisState } from '../../core/api/types';
import { normalizeEntityName } from '../../core/utils/entity-name';
import {
  actuacionTipoLabel,
  docText,
  terminoText,
  type IdentificacionView,
  type PersonaView,
  type ProvidenciaView,
} from '../case-profile/models/case-overview.models';

/** Vista de lectura de la ficha del correo (identificación del proceso). */
export function buildMessageIdentificacion(
  f: MessageAnalysis,
  state: MessageAnalysisState,
  recibidoAt: string | null,
): IdentificacionView {
  const id = f.identificacion;
  const lugar = [id.municipio, id.departamento].map((s) => s?.trim()).filter(Boolean).join(', ');
  const juzgado = id.despacho?.trim() ? (lugar ? `${id.despacho.trim()} (${lugar})` : id.despacho.trim()) : null;

  const nombre = f.accionante?.nombre?.trim() || f.contacto.nombre?.valor?.trim() || null;
  const agente = f.agente_oficioso;
  let representante: string | null = null;
  if (agente?.nombre) {
    representante = `${agente.nombre}, ${CALIDAD_AGENTE[agente.calidad]}`;
    if (agente.parentesco) representante += ` (${agente.parentesco})`;
  }

  return {
    radicado: id.radicado?.trim() || 'Sin radicado',
    juzgado,
    correoJuzgado: id.correo_despacho?.trim() || null,
    accionante: nombre
      ? { nombre, documento: docText(f.contacto.identificacion), representante }
      : null,
    accionados: partes(f, 'accionado'),
    vinculados: partes(f, 'vinculado'),
    providencia: ultimaProvidencia(f, state, recibidoAt),
    providenciasCount: f.actuaciones.length,
  };
}

function partes(f: MessageAnalysis, rol: 'accionado' | 'vinculado'): PersonaView[] {
  const seen = new Set<string>();
  const out: PersonaView[] = [];
  for (const p of f.partes_mencionadas) {
    if (p.rol !== rol) continue;
    const key = normalizeEntityName(p.nombre);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ nombre: p.nombre.trim(), documento: null });
  }
  return out;
}

/** La actuación con la fecha de providencia más reciente; notificada al recibir el correo. */
function ultimaProvidencia(
  f: MessageAnalysis,
  state: MessageAnalysisState,
  recibidoAt: string | null,
): ProvidenciaView | null {
  if (!f.actuaciones.length) return null;
  let idx = 0;
  f.actuaciones.forEach((a, i) => {
    if ((a.fecha_providencia ?? '') > (f.actuaciones[idx]!.fecha_providencia ?? '')) idx = i;
  });
  const a = f.actuaciones[idx]!;
  return {
    tipo: actuacionTipoLabel(a),
    fechaAuto: a.fecha_providencia,
    notificadoAt: recibidoAt,
    termino: terminoText(a.termino),
    venceAt: state.actuaciones[idx]?.vence_at ?? null,
    estado: null,
  };
}
