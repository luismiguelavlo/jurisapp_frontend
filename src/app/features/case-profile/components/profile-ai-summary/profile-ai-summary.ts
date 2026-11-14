import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Más de esto se recorta a cuatro líneas con "Ver más". */
const LONG_TEXT = 360;

/**
 * Resumen del caso generado con IA. Desplegable (abierto por defecto) y,
 * si es largo, recortado con "Ver más".
 */
@Component({
  selector: 'app-profile-ai-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'block min-w-0' },
  template: `
    <section class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <h2 class="m-0">
        <button
          type="button"
          class="w-full flex items-center gap-3 px-5 sm:px-6 py-3.5 border-0 bg-transparent cursor-pointer text-left hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-primary focus-visible:-outline-offset-2"
          [attr.aria-expanded]="open()"
          aria-controls="ai-summary-body"
          (click)="open.set(!open())"
        >
          <app-material-icon name="auto_awesome" [size]="18" className="text-primary" class="shrink-0" />
          <span class="flex-1 min-w-0 text-headline-sm text-on-surface">Resumen con IA</span>
          @if (!open() && text()) {
            <span class="hidden sm:block min-w-0 max-w-[48ch] truncate text-body-compact text-on-surface-variant">
              {{ text() }}
            </span>
          }
          <app-material-icon
            name="expand_more"
            [size]="20"
            className="text-on-surface-variant"
            class="shrink-0 transition-transform duration-200 motion-reduce:transition-none"
            [class.rotate-180]="open()"
          />
        </button>
      </h2>

      @if (open()) {
        <div id="ai-summary-body" class="px-5 sm:px-6 pb-5 pt-1 flex flex-col gap-2">
          @if (text(); as t) {
            <p
              class="m-0 max-w-[72ch] text-body-default text-on-surface whitespace-pre-line"
              [class.line-clamp-4]="long() && !expanded()"
            >
              {{ t }}
            </p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
              @if (long()) {
                <button
                  type="button"
                  class="p-0 border-0 bg-transparent cursor-pointer text-label-default text-primary hover:underline"
                  [attr.aria-expanded]="expanded()"
                  (click)="expanded.set(!expanded())"
                >
                  {{ expanded() ? 'Ver menos' : 'Ver más' }}
                </button>
              }
              <span class="text-caption text-on-surface-variant">
                @if (reviewed()) {
                  Revisado por una persona.
                } @else {
                  Generado automáticamente; contrástalo con los documentos.
                }
              </span>
            </div>
          } @else {
            <p class="m-0 text-body-compact text-on-surface-variant">
              El resumen aparece cuando se analizan los documentos del expediente.
            </p>
          }
        </div>
      }
    </section>
  `,
})
export class ProfileAiSummary {
  readonly text = input<string | null>(null);
  readonly reviewed = input(false);

  readonly open = signal(true);
  readonly expanded = signal(false);
  readonly long = computed(() => (this.text()?.length ?? 0) > LONG_TEXT);
}
