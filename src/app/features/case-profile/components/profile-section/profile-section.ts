import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { fuenteLabel, mergeFuentes } from '../../../../core/api/ficha-labels';
import type { Fuente, Seccion } from '../../../../core/api/types';
import { ToneBadge } from '../../../../shared/components/tone-badge/tone-badge';

export type ProfileSectionVariant = 'main' | 'rail';

/**
 * Sección de la ficha sin caja: título, contenido (slot) y la procedencia como cita al pie
 * (§3.6). `main` va dentro de la hoja; `rail` en el margen de datos. Sección `null` → vacío.
 */
@Component({
  selector: 'app-profile-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToneBadge],
  host: { class: 'block min-w-0' },
  template: `
    <section class="flex flex-col min-w-0" [class]="variant() === 'main' ? 'gap-2.5' : 'gap-1.5'">
      <header class="flex flex-wrap items-center gap-2">
        <h3 class="m-0" [class]="titleClass()">{{ title() }}</h3>
        @if (seccion()?.nuevo_desde_revision) {
          <app-tone-badge tone="warn">Nuevo</app-tone-badge>
        }
      </header>

      @if (seccion() || forceContent()) {
        <ng-content />
      } @else {
        <p class="m-0 text-body-compact text-on-surface-variant">No aparece en los documentos.</p>
      }

      @if (seccion(); as s) {
        @if (s.fuentes.length || s.origen === 'revision' || (hint() && s.origen === 'modelo')) {
          <p class="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-caption text-on-surface-variant">
            @if (s.fuentes.length) {
              <span>Fuente:</span>
              @for (f of merge(s.fuentes); track $index; let last = $last) {
                <button
                  type="button"
                  class="text-caption text-primary hover:underline border-0 bg-transparent cursor-pointer p-0"
                  (click)="openSource.emit(f)"
                >
                  {{ fuenteLabel(f) }}{{ last ? '' : ';' }}
                </button>
              }
            }
            @if (s.origen === 'revision') {
              <span>Revisado por una persona.</span>
            } @else if (hint()) {
              <span>{{ hint() }}</span>
            }
          </p>
        }
      }
    </section>
  `,
})
export class ProfileSection {
  readonly title = input.required<string>();
  readonly seccion = input<Seccion<unknown> | null>(null);
  /** Nota cuando el valor viene del modelo (p. ej. "Resumen generado…"). */
  readonly hint = input<string | null>(null);
  /** Mostrar el contenido aunque no haya sección (p. ej. partes). */
  readonly forceContent = input(false);
  readonly variant = input<ProfileSectionVariant>('main');

  readonly openSource = output<Fuente>();
  readonly fuenteLabel = fuenteLabel;
  readonly merge = mergeFuentes;

  readonly titleClass = computed(() =>
    this.variant() === 'main'
      ? 'text-headline-sm text-on-surface'
      : 'text-caption font-semibold text-on-surface-variant',
  );
}
