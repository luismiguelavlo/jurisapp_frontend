import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CASE_STATUS_OPTIONS } from '../../../../core/api/document-labels';
import type { CaseStatus } from '../../../../core/api/types';
import { formatRadicado, normalizeRadicadoInput } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { SegmentedFilter } from '../../../../shared/components/segmented-filter/segmented-filter';

/** Búsqueda por radicado + filtro por estado del término. */
@Component({
  selector: 'app-processes-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, SegmentedFilter],
  template: `
    <section class="flex flex-col lg:flex-row lg:items-start gap-3">
      <div class="flex flex-col gap-1 lg:w-[360px] shrink-0">
        <label class="sr-only" for="input-radicado">Buscar por radicado</label>
        <div class="relative flex items-center">
          <app-material-icon
            name="search"
            [size]="18"
            className="absolute left-3 text-on-surface-variant pointer-events-none"
          />
          <input
            id="input-radicado"
            class="w-full h-9 pl-9 pr-16 bg-surface-container-lowest border rounded-[4px] text-body-default tabular-nums text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
            [class]="invalid() ? 'border-error' : 'border-outline-variant'"
            inputmode="numeric"
            maxlength="29"
            placeholder="Buscar por radicado"
            type="text"
            [attr.aria-invalid]="invalid()"
            aria-describedby="radicado-help"
            [value]="radicadoDisplay()"
            (input)="onRadicadoInput($event)"
          />
          <span class="absolute right-8 text-caption text-on-surface-variant tabular-nums">
            @if (digits().length) {
              {{ digits().length }}/23
            }
          </span>
          @if (digits().length > 0) {
            <button
              type="button"
              class="absolute right-2 p-0.5 text-on-surface-variant hover:text-on-surface border-0 bg-transparent cursor-pointer"
              aria-label="Borrar búsqueda"
              (click)="clearRadicado.emit()"
            >
              <app-material-icon name="close" [size]="16" />
            </button>
          }
        </div>
        <p
          id="radicado-help"
          class="m-0 text-caption"
          [class]="invalid() ? 'text-error' : 'text-on-surface-variant'"
        >
          @if (invalid()) {
            Un radicado tiene 23 dígitos (21 sin el recurso).
          } @else {
            Escribe el radicado completo; los guiones son opcionales.
          }
        </p>
      </div>

      <app-segmented-filter
        class="lg:ml-auto"
        label="Estado del término"
        [options]="options"
        [value]="estado()"
        (valueChange)="estadoChange.emit($event)"
      />
    </section>
  `,
})
export class ProcessesFilters {
  readonly radicadoDigits = input('');
  readonly estado = input<CaseStatus | 'all'>('all');

  readonly radicadoChange = output<string>();
  readonly clearRadicado = output<void>();
  readonly estadoChange = output<CaseStatus | 'all'>();

  readonly options = CASE_STATUS_OPTIONS;

  readonly digits = computed(() => normalizeRadicadoInput(this.radicadoDigits()));
  readonly radicadoDisplay = computed(() => {
    const d = this.digits();
    return d ? formatRadicado(d) : '';
  });
  readonly invalid = computed(() => {
    const n = this.digits().length;
    return n > 0 && n !== 21 && n !== 23;
  });

  onRadicadoInput(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.radicadoChange.emit(normalizeRadicadoInput(event.target.value).slice(0, 23));
  }
}
