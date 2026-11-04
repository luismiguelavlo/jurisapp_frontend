import type { DocumentDetail, DocumentFields, LlmField } from '../../../core/api/types';
import { FIELD_LABELS } from '../../../core/api/document-labels';

const ORDER = [
  'radicado',
  'tipo_providencia',
  'fecha_providencia',
  'juzgado',
  'correo_juzgado',
  'termino_contestar',
  'partes',
] as const;

export function pendingFieldKeys(doc: DocumentDetail): string[] {
  if (doc.review_status !== 'unreviewed' || !doc.fields) return [];
  const fields = doc.fields;
  const llm = new Set(doc.llm_fields);
  const pending: string[] = [];

  for (const key of ORDER) {
    if (key === 'partes') {
      const baja = fields.partes.some((p) => p.confianza === 'baja');
      if (baja || llm.has('partes') || fields.partes.length === 0) {
        pending.push('partes');
      }
      continue;
    }
    const campo = fields[key as keyof DocumentFields];
    if (!campo || typeof campo !== 'object' || !('valor' in campo)) continue;
    const c = campo as { valor: unknown; confianza: string | null };
    const isLlm = llm.has(key as LlmField);
    if (c.valor == null || c.confianza === 'baja' || isLlm) {
      pending.push(key);
    }
  }
  return pending;
}

export function pendingFieldLabels(doc: DocumentDetail): string[] {
  return pendingFieldKeys(doc).map((k) => FIELD_LABELS[k] ?? k);
}
