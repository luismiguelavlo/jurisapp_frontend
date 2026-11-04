import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import type { CaseStatus } from '../../../../core/api/types';
import { formatRadicado, normalizeRadicadoInput } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-processes-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section class="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3">
      <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
        <div class="md:col-span-8 flex flex-col gap-1.5">
          <label
            class="text-label-compact text-on-surface flex items-center justify-between font-medium"
            for="input-radicado"
          >
            <span>Radicado del proceso</span>
            <span class="text-caption text-on-surface-variant tracking-normal font-normal"
              >Formato 23 dígitos</span
            >
          </label>
          <div class="relative flex items-center">
            <app-material-icon
              name="tag"
              [size]="18"
              className="absolute left-3 text-outline pointer-events-none"
            />
            <input
              id="input-radicado"
              class="w-full h-9 pl-9 pr-9 bg-surface-container-low/50 font-mono text-[13px] tracking-wider text-on-surface rounded-lg focus:outline-none focus:bg-surface-container-lowest transition-all border-0"
              [class.bg-error-container/20]="invalid()"
              inputmode="numeric"
              maxlength="29"
              placeholder="05001-31-03-001-2024-00123-00"
              type="text"
              [value]="radicadoDisplay()"
              (input)="onRadicadoInput($event)"
            />
            @if (digits().length > 0) {
              <button
                type="button"
                class="absolute right-2.5 p-0.5 text-outline hover:text-on-surface transition-colors border-0 bg-transparent cursor-pointer"
                title="Borrar filtro"
                (click)="clearRadicado.emit()"
              >
                <app-material-icon name="close" [size]="16" />
              </button>
            }
          </div>
          <div class="min-h-[18px] flex items-center justify-between">
            @if (invalid()) {
              <p class="m-0 text-caption text-error flex items-center gap-1">
                <app-material-icon name="error" [size]="14" />
                <span>El radicado no es válido</span>
              </p>
            } @else {
              <p class="m-0 text-caption text-on-surface-variant">
                Ingresa el radicado completo (23 dígitos)
              </p>
            }
            <span class="text-caption text-outline font-mono text-[11px] ml-auto"
              >{{ digits().length }}/23</span
            >
          </div>
        </div>

        <div class="md:col-span-4 flex flex-col gap-1.5">
          <label class="text-label-compact text-on-surface font-medium" for="select-estado"
            >Estado procesal</label
          >
          <div class="relative flex items-center">
            <select
              id="select-estado"
              class="w-full h-9 pl-3 pr-8 bg-surface-container-low/50 text-body-default text-on-surface rounded-lg appearance-none cursor-pointer focus:outline-none focus:bg-surface-container-lowest transition-colors border-0"
              [value]="estado()"
              (change)="onEstadoChange($event)"
            >
              <option value="all">Todos los estados</option>
              <option value="por_vencer">Por vencer</option>
              <option value="en_termino">En término</option>
              <option value="vencido">Vencido</option>
              <option value="respondido">Respondido</option>
              <option value="sin_termino">Sin término</option>
            </select>
            <app-material-icon
              name="unfold_more"
              [size]="18"
              className="absolute right-2.5 text-outline pointer-events-none"
            />
          </div>
          <span class="text-caption text-on-surface-variant"
            >Filtro por vencimiento de providencias</span
          >
        </div>
      </div>
    </section>
  `,
})
export class ProcessesFilters {
  readonly radicadoDigits = input('');
  readonly estado = input<CaseStatus | 'all'>('all');

  readonly radicadoChange = output<string>();
  readonly clearRadicado = output<void>();
  readonly estadoChange = output<CaseStatus | 'all'>();

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

  onEstadoChange(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement)) return;
    this.estadoChange.emit(event.target.value as CaseStatus | 'all');
  }
}
