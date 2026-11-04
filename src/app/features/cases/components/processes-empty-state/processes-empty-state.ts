import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

export type ProcessesEmptyKind = 'no-results' | 'empty';

@Component({
  selector: 'app-processes-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <div
      class="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col items-center justify-center p-12 text-center"
    >
      @if (kind() === 'no-results') {
        <div
          class="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-outline mb-3"
        >
          <app-material-icon name="filter_list_off" [size]="24" />
        </div>
        <h3 class="text-headline-sm text-on-surface mb-1 m-0 font-semibold">
          Ningún proceso coincide con el filtro
        </h3>
        <p class="text-body-default text-on-surface-variant max-w-md mb-6 m-0">
          Verifica el número de radicado o ajusta el selector de estado procesal para ampliar los
          criterios de consulta.
        </p>
        <button
          type="button"
          class="h-9 px-4 rounded-lg bg-surface-container-high hover:bg-surface-container text-on-surface text-label-compact font-medium transition-colors flex items-center gap-2 border-0 cursor-pointer"
          (click)="resetFilters.emit()"
        >
          <app-material-icon name="restart_alt" [size]="16" />
          <span>Limpiar filtros</span>
        </button>
      } @else {
        <div
          class="w-12 h-12 rounded-full bg-secondary-container/40 flex items-center justify-center text-primary-container mb-3"
        >
          <app-material-icon name="inbox" [size]="24" />
        </div>
        <h3 class="text-headline-sm text-on-surface mb-1 m-0 font-semibold">
          No hay procesos todavía
        </h3>
        <p class="text-body-default text-on-surface-variant max-w-sm mb-6 m-0">
          Los procesos judiciales aparecerán aquí automáticamente una vez se sincronicen y
          clasifiquen las providencias desde la bandeja judicial.
        </p>
        <a
          routerLink="/documents"
          class="h-9 px-4 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-label-compact font-medium transition-colors inline-flex items-center gap-2 no-underline"
        >
          <app-material-icon name="move_to_inbox" [size]="16" />
          <span>Ir a bandeja de providencias</span>
        </a>
      }
    </div>
  `,
})
export class ProcessesEmptyState {
  readonly kind = input.required<ProcessesEmptyKind>();
  readonly resetFilters = output<void>();
}
