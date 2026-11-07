import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface Segmento {
  digits: string;
  label: string;
  /** Año y consecutivo: lo que la gente reconoce de un radicado. */
  key: boolean;
}

const PARTES: ReadonlyArray<{ len: number; label: string; key?: boolean }> = [
  { len: 5, label: 'Ciudad' },
  { len: 2, label: 'Entidad' },
  { len: 2, label: 'Especialidad' },
  { len: 3, label: 'Despacho' },
  { len: 4, label: 'Año', key: true },
  { len: 5, label: 'Consecutivo', key: true },
  { len: 2, label: 'Recurso' },
];

export type RadicadoMarkSize = 'md' | 'lg' | 'xl';

const SIZE: Record<RadicadoMarkSize, string> = {
  md: 'text-[15px] leading-6',
  lg: 'text-[24px] leading-8',
  xl: 'text-[30px] leading-9 sm:text-[34px] sm:leading-10',
};

/**
 * Radicado de 23 (o 21) dígitos segmentado como se lee en el despacho.
 * `annotated` añade debajo de cada grupo qué significa.
 */
@Component({
  selector: 'app-radicado-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-block max-w-full' },
  template: `
    @if (segmentos(); as segs) {
      <span
        class="inline-flex flex-wrap items-start gap-x-[0.35em] gap-y-1 tabular-nums tracking-[0.01em]"
        [class]="sizeClass()"
        [attr.aria-label]="'Radicado ' + plain()"
        role="text"
      >
        @for (s of segs; track $index) {
          <span class="inline-flex flex-col" aria-hidden="true">
            <span
              [class]="s.key ? 'font-semibold text-primary' : 'font-normal text-on-surface-variant'"
              >{{ s.digits }}</span
            >
            @if (annotated()) {
              <span
                class="mt-1 pt-1 border-t border-outline-variant text-[11px] leading-3 font-normal text-on-surface-variant tracking-normal"
                >{{ s.label }}</span
              >
            }
          </span>
        }
      </span>
    } @else {
      <span class="tabular-nums" [class]="sizeClass()">{{ value() }}</span>
    }
  `,
})
export class RadicadoMark {
  readonly value = input.required<string>();
  readonly size = input<RadicadoMarkSize>('lg');
  readonly annotated = input(false);

  readonly sizeClass = computed(() => SIZE[this.size()]);
  readonly plain = computed(() => this.value().replace(/\D/g, ''));

  readonly segmentos = computed<Segmento[] | null>(() => {
    const d = this.plain();
    // 21 dígitos: sin los 2 del recurso.
    const partes = d.length === 23 ? PARTES : d.length === 21 ? PARTES.slice(0, 6) : null;
    if (!partes) return null;
    let i = 0;
    return partes.map((p) => {
      const digits = d.slice(i, i + p.len);
      i += p.len;
      return { digits, label: p.label, key: !!p.key };
    });
  });
}
