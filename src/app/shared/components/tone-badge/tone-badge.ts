import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeTone = 'danger' | 'success' | 'warn' | 'info' | 'neutral';

/** Variante sólida: para el indicador que más importa (p. ej. "Te toca responder"). */
const SOLID: Record<BadgeTone, string> = {
  danger: 'bg-error text-on-error border-error',
  success: 'bg-emerald-700 text-white border-emerald-700',
  warn: 'bg-tertiary text-on-tertiary border-tertiary',
  info: 'bg-primary text-on-primary border-primary',
  neutral: 'bg-on-surface-variant text-surface border-on-surface-variant',
};

const TONES: Record<BadgeTone, string> = {
  danger:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60',
  warn: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
  neutral: 'bg-surface-container text-on-surface-variant border-outline-variant/40',
};

/** Chip pequeño con tono semántico. */
@Component({
  selector: 'app-tone-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    <span [class]="classes()" [attr.title]="hint() || null">
      <ng-content />
    </span>
  `,
})
export class ToneBadge {
  readonly tone = input<BadgeTone>('neutral');
  readonly strong = input(false);
  readonly hint = input<string | null>(null);

  readonly classes = computed(
    () =>
      `inline-flex items-center gap-1 rounded-full border whitespace-nowrap ${
        this.strong()
          ? `px-2.5 py-0.5 text-label-compact font-semibold ${SOLID[this.tone()]}`
          : `px-2 py-0.5 text-[11px] leading-4 font-medium ${TONES[this.tone()]}`
      }`,
  );
}
