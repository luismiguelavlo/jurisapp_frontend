import {
  ESTADO_ANTECEDENTE,
  TIPO_TECNOLOGIA,
} from '../../../core/api/ficha-labels';
import type {
  Antecedente,
  CaseProfile,
  Diagnostico,
  ParteFicha,
  ReclamoPrevio,
  Seccion,
  Tecnologia,
} from '../../../core/api/types';
import type { ProfileColumn } from '../components/profile-table/profile-table';

/** Claves de la ficha que son `Seccion<T> | null`. */
export type SeccionKey = {
  [K in keyof CaseProfile]-?: NonNullable<CaseProfile[K]> extends Seccion<unknown> ? K : never;
}[keyof CaseProfile];

export type ValorOf<K extends SeccionKey> =
  NonNullable<CaseProfile[K]> extends Seccion<infer V> ? V : never;

export const SECCION_KEYS: readonly SeccionKey[] = [
  'accionante',
  'agente_oficioso',
  'aseguradora',
  'lugar_atencion',
  'objeto',
  'hechos_resumen',
  'derechos_invocados',
  'pretensiones',
  'tratamiento_integral_solicitado',
  'medida_provisional',
  'diagnosticos',
  'tecnologias',
  'antecedentes',
  'reclamos_previos',
  'pruebas_aportadas',
];

/** Ficha sin ningún análisis (§3.7). */
export function isEmptyProfile(f: CaseProfile): boolean {
  return SECCION_KEYS.every((k) => f[k] === null) && f.actuaciones.length === 0;
}

/** Hay aportes posteriores a la última revisión (§4.2). */
export function hasNewSinceReview(f: CaseProfile): boolean {
  return (
    SECCION_KEYS.some((k) => f[k]?.nuevo_desde_revision === true) ||
    f.actuaciones.some((a) => a.nuevo_desde_revision)
  );
}

const cleanList = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);

/** Quita entradas vacías de listas de texto antes de enviar la revisión. */
export function cleanProfile(f: CaseProfile): CaseProfile {
  const out: CaseProfile = structuredClone(f);
  for (const k of ['derechos_invocados', 'pretensiones', 'pruebas_aportadas'] as const) {
    const s = out[k];
    if (s) out[k] = { ...s, valor: cleanList(s.valor) };
  }
  out.partes = out.partes.filter((p) => p.nombre.trim());
  out.actuaciones = out.actuaciones.map((a) => ({
    ...a,
    actuacion: { ...a.actuacion, destinatarios: cleanList(a.actuacion.destinatarios) },
  }));
  return out;
}

const opts = (r: Record<string, string>) =>
  Object.entries(r).map(([value, label]) => ({ value, label }));

export const DIAGNOSTICO_COLUMNS: ReadonlyArray<ProfileColumn<Diagnostico>> = [
  { key: 'descripcion', label: 'Descripción' },
  { key: 'cie10', label: 'CIE-10', nullable: true },
];
export const newDiagnostico = (): Diagnostico => ({ descripcion: '', cie10: null });

export const TECNOLOGIA_COLUMNS: ReadonlyArray<ProfileColumn<Tecnologia>> = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'tipo', label: 'Tipo', kind: 'select', options: opts(TIPO_TECNOLOGIA) },
  { key: 'presentacion', label: 'Presentación', nullable: true },
  { key: 'cantidad', label: 'Cantidad', nullable: true },
  { key: 'posologia', label: 'Posología', nullable: true },
];
export const newTecnologia = (): Tecnologia => ({
  nombre: '',
  tipo: 'medicamento',
  presentacion: null,
  cantidad: null,
  posologia: null,
});

export const ANTECEDENTE_COLUMNS: ReadonlyArray<ProfileColumn<Antecedente>> = [
  { key: 'fecha', label: 'Fecha', kind: 'date', nullable: true },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'referencia', label: 'Referencia', nullable: true },
  {
    key: 'estado',
    label: 'Estado',
    kind: 'select',
    nullable: true,
    options: opts(ESTADO_ANTECEDENTE),
  },
];
export const newAntecedente = (): Antecedente => ({
  fecha: null,
  descripcion: '',
  referencia: null,
  estado: null,
});

export const RECLAMO_COLUMNS: ReadonlyArray<ProfileColumn<ReclamoPrevio>> = [
  { key: 'entidad', label: 'Entidad' },
  { key: 'fecha', label: 'Fecha', kind: 'date', nullable: true },
  { key: 'numero', label: 'Número', nullable: true },
  { key: 'resumen', label: 'Resumen', nullable: true },
];
export const newReclamo = (): ReclamoPrevio => ({
  entidad: '',
  fecha: null,
  numero: null,
  resumen: null,
});

export const PARTE_COLUMNS: ReadonlyArray<ProfileColumn<ParteFicha>> = [
  {
    key: 'rol',
    label: 'Rol',
    kind: 'select',
    options: [
      { value: 'accionado', label: 'Accionado' },
      { value: 'vinculado', label: 'Vinculado' },
    ],
  },
  { key: 'nombre', label: 'Nombre' },
];
export const newParte = (): ParteFicha => ({ rol: 'vinculado', nombre: '' });
