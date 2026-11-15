import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatRelativeTime } from '../../../../core/api/labels';
import type { AssigneeWorkload } from '../../../../core/api/types';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { ROLE_LABEL, STATUS_LABEL } from '../../models/users.models';
import { UserIdentity } from '../user-identity/user-identity';

/**
 * Carga de los revisores (SPEC 24, `GET /assignments/workload`): pendientes por persona para ver si el reparto
 * está equilibrado. Cada fila abre la bandeja filtrada por ese revisor.
 */
@Component({
  selector: 'app-assignment-workload-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon, UserIdentity],
  template: `
    <section class="flex flex-col gap-2" aria-labelledby="workload-title">
      <div class="flex items-end justify-between gap-3 px-1">
        <div class="flex flex-col gap-0.5">
          <h2 id="workload-title" class="m-0 text-headline-sm text-on-surface">Reparto de correos</h2>
          <p class="m-0 text-body-compact text-on-surface-variant max-w-[72ch]">
            Cada correo con un proceso que llega se asigna solo a quien tenga menos pendientes entre los marcados
            como «Recibe correos».
          </p>
        </div>
      </div>

      <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
        @if (noReceivers()) {
          <p class="m-0 flex items-start gap-2 px-6 py-3 border-b border-outline-variant/60 text-body-compact text-tertiary">
            <app-material-icon name="warning" [size]="16" className="mt-0.5 shrink-0" />
            <span>
              Nadie recibe asignaciones: los correos nuevos quedarán sin asignar.
              @if (canManage()) {
                Activa «Recibe correos» en la tabla de usuarios.
              }
            </span>
          </p>
        }
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[680px]">
            <thead>
              <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
                <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Revisor</th>
                <th class="py-2.5 px-4 font-medium" scope="col">Pendientes</th>
                <th class="py-2.5 px-4 font-medium text-right" scope="col">Total</th>
                <th class="py-2.5 pl-4 pr-6 font-medium text-right whitespace-nowrap" scope="col">Última asignación</th>
              </tr>
            </thead>
            <tbody>
              @for (w of rows(); track w.user_id) {
                @let stale = w.status !== 'active' && w.pendientes > 0;
                <tr
                  class="border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low/50 cursor-pointer"
                  [routerLink]="['/documents']"
                  [queryParams]="{ asignado: w.user_id }"
                >
                  <td class="py-3 pl-6 pr-4 max-w-[300px]">
                    <a [routerLink]="['/documents']" [queryParams]="{ asignado: w.user_id }" class="no-underline block">
                      <app-user-identity [person]="w" [muted]="w.status !== 'active'" />
                    </a>
                    <span class="mt-1 flex flex-wrap gap-x-2 text-caption text-on-surface-variant">
                      <span>{{ roleLabel[w.role] }}</span>
                      @if (!w.receives_assignments) {
                        <span>· No recibe nuevos</span>
                      }
                      @if (w.status !== 'active') {
                        <span class="text-tertiary">· {{ statusLabel[w.status] }}</span>
                      }
                    </span>
                  </td>
                  <td class="py-3 px-4 w-[38%]">
                    <span class="flex items-center gap-2">
                      <span class="flex-1 h-1.5 rounded-full bg-surface-container overflow-hidden" aria-hidden="true">
                        <span
                          class="block h-full rounded-full"
                          [class]="stale ? 'bg-tertiary' : 'bg-primary'"
                          [style.width.%]="bar(w)"
                        ></span>
                      </span>
                      <span class="w-8 text-right text-body-compact tabular-nums" [class]="stale ? 'text-tertiary font-medium' : 'text-on-surface'">
                        {{ w.pendientes }}
                      </span>
                    </span>
                    @if (stale) {
                      <span class="block mt-1 text-caption text-tertiary">No está activo: reasigna sus correos</span>
                    }
                  </td>
                  <td class="py-3 px-4 text-right text-body-compact text-on-surface-variant tabular-nums">{{ w.total }}</td>
                  <td class="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                    <time
                      class="text-caption text-on-surface-variant"
                      [attr.title]="w.ultima_asignacion_at ? formatDateTime(w.ultima_asignacion_at) : null"
                      >{{ w.ultima_asignacion_at ? relative(w.ultima_asignacion_at) : 'Aún ninguna' }}</time
                    >
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4" class="px-6 py-8 text-body-compact text-on-surface-variant">
                    Todavía nadie recibe ni tiene correos asignados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `,
})
export class AssignmentWorkloadPanel {
  readonly workload = input.required<ReadonlyArray<AssigneeWorkload>>();
  readonly canManage = input(false);

  readonly roleLabel = ROLE_LABEL;
  readonly statusLabel = STATUS_LABEL;
  readonly relative = formatRelativeTime;
  readonly formatDateTime = formatBogotaDateTime;

  /** Más pendientes primero: lo que hay que mirar. */
  readonly rows = computed(() => [...this.workload()].sort((a, b) => b.pendientes - a.pendientes || b.total - a.total));
  readonly noReceivers = computed(() =>
    this.workload().every((w) => !w.receives_assignments || w.status !== 'active'),
  );
  private readonly maxPending = computed(() => Math.max(1, ...this.workload().map((w) => w.pendientes)));

  bar(w: AssigneeWorkload): number {
    return Math.round((w.pendientes / this.maxPending()) * 100);
  }
}
