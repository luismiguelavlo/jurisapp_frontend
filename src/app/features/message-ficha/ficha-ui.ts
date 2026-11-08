import type { MessageAnalysis } from '../../core/api/types';

/** Clases compartidas del formulario de la ficha del correo (mismo aspecto en todas las secciones). */
export const FICHA_INPUT =
  'w-full h-10 px-3 rounded-md bg-surface-container-lowest border border-outline-variant text-body-default text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary disabled:opacity-60';
export const FICHA_TEXTAREA =
  'w-full min-h-[76px] px-3 py-2 rounded-md bg-surface-container-lowest border border-outline-variant text-body-default text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y leading-relaxed';
export const FICHA_LABEL = 'block text-label-default text-on-surface-variant mb-1';
export const FICHA_SECTION_TITLE = 'm-0 text-headline-sm text-primary font-semibold';
export const FICHA_HINT = 'm-0 text-caption text-on-surface-variant';
export const FICHA_LINK_BTN =
  'inline-flex items-center gap-1 h-8 px-3 rounded-md border border-outline-variant bg-transparent text-label-compact text-on-surface cursor-pointer hover:bg-surface-container-low';
export const FICHA_REMOVE_BTN =
  'h-10 px-3 rounded-md border border-outline-variant bg-transparent text-label-compact text-on-surface-variant cursor-pointer hover:bg-surface-container-low hover:text-error shrink-0';

/** Cambio parcial de la ficha que emite cada sección. */
export type FichaPatch = Partial<MessageAnalysis>;

/** Página local de un adjunto a la que llevar el visor. */
export interface DocumentPageRef {
  attachment_id: string;
  pagina: number;
}

export function inputValue(e: Event): string {
  return (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}

/** Texto vacío → null. */
export function orNull(value: string): string | null {
  const v = value.trim();
  return v ? v : null;
}

export function replaceAt<T>(list: readonly T[], index: number, value: T): T[] {
  return list.map((item, i) => (i === index ? value : item));
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** Página global del correo → adjunto y página local. */
export function localPage(ficha: MessageAnalysis, n: number): DocumentPageRef | null {
  const p = ficha.paginas.find((x) => x.n === n);
  return p?.attachment_id ? { attachment_id: p.attachment_id, pagina: p.pagina } : null;
}
