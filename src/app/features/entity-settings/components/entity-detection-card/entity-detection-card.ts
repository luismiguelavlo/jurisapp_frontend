import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { deteccionEvidencia } from '../../../../core/api/ficha-labels';
import type { EntidadDetectada } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Tarjeta de la entidad detectada automáticamente (§7.2). */
@Component({
  selector: 'app-entity-detection-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 p-4 flex flex-col gap-3">
      <p class="m-0 flex items-start gap-2 text-body-default text-on-surface">
        <app-material-icon name="auto_awesome" [size]="18" className="text-sky-700 dark:text-sky-300 mt-0.5" />
        <span>
          Detectamos que tu entidad es <strong>{{ detectada().nombre }}</strong>
          ({{ evidencia() }}). Si es correcto no necesitas hacer nada.
        </span>
      </p>
      @if (canManage()) {
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-default border-0 cursor-pointer disabled:opacity-50"
            [disabled]="busy()"
            (click)="confirm.emit()"
          >
            Confirmar
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-transparent text-on-surface-variant hover:bg-surface-container font-label-default border-0 cursor-pointer"
            [disabled]="busy()"
            (click)="reject.emit()"
          >
            No es mi entidad
          </button>
        </div>
      }
    </div>
  `,
})
export class EntityDetectionCard {
  readonly detectada = input.required<EntidadDetectada>();
  readonly canManage = input(false);
  readonly busy = input(false);
  readonly confirm = output<void>();
  readonly reject = output<void>();

  readonly evidencia = computed(() => deteccionEvidencia(this.detectada()));
}
