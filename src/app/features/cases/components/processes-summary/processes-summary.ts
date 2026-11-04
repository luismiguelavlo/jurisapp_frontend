import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-processes-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-start gap-3">
        <div class="p-2 rounded-lg bg-secondary-container/30 text-primary-container">
          <app-material-icon name="verified" [size]="20" />
        </div>
        <div>
          <span
            class="text-caption text-on-surface-variant uppercase tracking-wider block"
            >Regla de radicación</span
          >
          <span class="text-label-default text-on-surface font-medium block mt-0.5"
            >23 dígitos obligatorios</span
          >
          <p class="text-caption text-on-surface-variant mt-1 m-0">
            Acorde al estándar del Consejo Superior de la Judicatura.
          </p>
        </div>
      </div>

      <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-start gap-3">
        <div class="p-2 rounded-lg bg-amber-50 text-amber-700">
          <app-material-icon name="timer" [size]="20" />
        </div>
        <div>
          <span
            class="text-caption text-on-surface-variant uppercase tracking-wider block"
            >Términos en riesgo</span
          >
          <span class="text-label-default text-on-surface font-medium block mt-0.5">
            @if (atRiskCount() === 1) {
              1 providencia crítica
            } @else {
              {{ atRiskCount() }} providencias críticas
            }
          </span>
          <p class="text-caption text-on-surface-variant mt-1 m-0">
            Vencimiento en 48 horas o menos, o ya vencidas.
          </p>
        </div>
      </div>

      <div class="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex items-start gap-3">
        <div class="p-2 rounded-lg bg-surface-container text-on-surface-variant">
          <app-material-icon name="sync" [size]="20" />
        </div>
        <div>
          <span
            class="text-caption text-on-surface-variant uppercase tracking-wider block"
            >Sin clasificar</span
          >
          <span class="text-label-default text-on-surface font-medium block mt-0.5">
            {{ unclassifiedCount() }} providencia{{ unclassifiedCount() === 1 ? '' : 's' }}
          </span>
          <p class="text-caption text-on-surface-variant mt-1 m-0">
            Extraídas sin radicado asociado a un proceso.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class ProcessesSummary {
  readonly atRiskCount = input(0);
  readonly unclassifiedCount = input(0);
}
