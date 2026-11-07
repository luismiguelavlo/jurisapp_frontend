import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ESTADO_ANTECEDENTE } from '../../../../core/api/ficha-labels';
import type { Antecedente, EstadoAntecedente } from '../../../../core/api/types';
import { formatCalendarDate } from '../../../../core/utils/date-format';
import { type BadgeTone, ToneBadge } from '../../../../shared/components/tone-badge/tone-badge';

const TONE: Record<EstadoAntecedente, BadgeTone> = {
  pendiente: 'warn',
  agotado: 'danger',
  negado: 'danger',
  entregado: 'success',
  otro: 'neutral',
};

/** Antecedentes en línea de tiempo por fecha (sin fecha al final). Solo lectura. */
@Component({
  selector: 'app-profile-antecedentes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToneBadge],
  template: `
    @if (sorted().length === 0) {
      <p class="m-0 text-body-compact text-on-surface-variant">Sin elementos.</p>
    } @else {
      <ol
        class="m-0 list-none relative pl-6 flex flex-col gap-3 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-0.5 before:bg-surface-container-high"
      >
        @for (a of sorted(); track $index) {
          <li class="relative">
            <span class="absolute left-[-19px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary"></span>
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-caption font-medium text-on-surface-variant">
                {{ a.fecha ? formatCalendarDate(a.fecha) : 'Sin fecha' }}
              </span>
              @if (a.estado; as e) {
                <app-tone-badge [tone]="tone(e)">{{ estadoLabel(e) }}</app-tone-badge>
              }
            </div>
            <p class="m-0 mt-0.5 text-body-compact text-on-surface">{{ a.descripcion }}</p>
            @if (a.referencia) {
              <p class="m-0 text-caption text-on-surface-variant">Ref.: {{ a.referencia }}</p>
            }
          </li>
        }
      </ol>
    }
  `,
})
export class ProfileAntecedentes {
  readonly items = input.required<Antecedente[]>();
  readonly formatCalendarDate = formatCalendarDate;

  readonly sorted = computed(() =>
    [...this.items()].sort((a, b) => {
      if (!a.fecha) return b.fecha ? 1 : 0;
      if (!b.fecha) return -1;
      return a.fecha.localeCompare(b.fecha);
    }),
  );

  tone = (e: EstadoAntecedente) => TONE[e];
  estadoLabel = (e: EstadoAntecedente) => ESTADO_ANTECEDENTE[e];
}
