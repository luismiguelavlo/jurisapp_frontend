import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-unassigned-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <header class="flex flex-col gap-3">
      <nav class="flex items-center gap-1.5 font-caption text-caption text-on-surface-variant">
        <a routerLink="/cases" class="hover:text-primary no-underline text-inherit">Procesos</a>
        <span>/</span>
        <span class="text-on-surface">Sin clasificar</span>
      </nav>
      <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h1 class="text-headline-lg text-on-surface tracking-tight m-0 font-semibold">
            Sin clasificar
          </h1>
          <p class="text-body-default text-on-surface-variant m-0">
            Correos descargados en los que no se encontró un radicado de 23 dígitos.
          </p>
        </div>
        <div class="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container font-label-default text-label-default border-0 cursor-pointer flex items-center gap-1.5"
            (click)="refresh.emit()"
          >
            <app-material-icon name="refresh" [size]="16" />
            Actualizar
          </button>
          @if (canSync()) {
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-default text-label-default border-0 cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
              [disabled]="syncing()"
              (click)="syncAll.emit()"
            >
              <app-material-icon name="sync" [size]="16" />
              {{ syncing() ? 'Sincronizando…' : 'Sincronizar ahora' }}
            </button>
          }
        </div>
      </div>
    </header>
  `,
})
export class UnassignedHeader {
  readonly canSync = input(false);
  readonly syncing = input(false);
  readonly refresh = output<void>();
  readonly syncAll = output<void>();
}
