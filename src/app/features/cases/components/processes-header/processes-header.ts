import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-processes-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-headline-lg text-on-surface">Procesos</h1>
        <p class="m-0 text-body-default text-on-surface-variant">
          Un expediente por radicado, con el término de cada providencia.
        </p>
      </div>
      @if (unclassifiedCount() > 0) {
        <a
          routerLink="/cases/sin-clasificar"
          class="inline-flex items-center gap-1.5 text-label-compact text-primary no-underline hover:underline"
        >
          <app-material-icon name="inbox" [size]="16" />
          {{ unclassifiedCount() }} correo{{ unclassifiedCount() === 1 ? '' : 's' }} sin
          clasificar
        </a>
      }
    </header>
  `,
})
export class ProcessesHeader {
  readonly unclassifiedCount = input(0);
}
