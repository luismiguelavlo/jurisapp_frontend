import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-processes-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary-container"></span>
          <h1 class="text-headline-lg text-on-surface tracking-tight m-0 font-semibold">Procesos</h1>
        </div>
        <p class="text-body-default text-on-surface-variant m-0">
          Expedientes judiciales agrupados por radicado unificado nacional
        </p>
      </div>
      <a
        routerLink="/cases/sin-clasificar"
        class="group flex items-center gap-2 px-3 py-1.5 bg-surface-container-lowest rounded-lg hover:bg-surface-container-low transition-colors shadow-sm no-underline"
      >
        <app-material-icon
          name="folder_open"
          [size]="16"
          className="text-tertiary-container group-hover:rotate-12 transition-transform"
        />
        <span class="text-label-compact text-on-surface font-medium">Sin clasificar</span>
        @if (unclassifiedCount() > 0) {
          <span
            class="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-error-container text-on-error-container leading-none"
            >{{ unclassifiedCount() }}</span
          >
        }
      </a>
    </header>
  `,
})
export class ProcessesHeader {
  readonly unclassifiedCount = input(0);
}
