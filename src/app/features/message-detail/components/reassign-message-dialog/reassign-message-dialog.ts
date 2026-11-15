import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { assignmentsApi } from '../../../../core/api/endpoints';
import type { AssigneeWorkload, MessageAssignment, TenantUser } from '../../../../core/api/types';
import { displayName } from '../../../../core/utils/person-name';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { DialogShell } from '../../../../shared/components/dialog-shell/dialog-shell';
import { BTN } from '../../../../shared/ui/ui-classes';

const ROLE: Record<TenantUser['role'], string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  member: 'Miembro',
  auxiliar: 'Auxiliar',
};

/**
 * Asignar o reasignar un correo a mano (owner/admin, SPEC 24). Lista los miembros activos con sus correos
 * pendientes para elegir al menos cargado.
 */
@Component({
  selector: 'app-reassign-message-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell, AlertBanner],
  template: `
    <app-dialog-shell
      [title]="current() ? 'Reasignar correo' : 'Asignar correo'"
      [description]="subtitle()"
      width="sm"
      (closed)="cancel.emit()"
    >
      <div class="flex flex-col gap-3">
        @if (error()) {
          <app-alert-banner variant="error">{{ error() }}</app-alert-banner>
        }
        @if (current(); as c) {
          <p class="m-0 text-body-compact text-on-surface-variant">
            Ahora lo tiene <span class="text-on-surface font-medium">{{ name(c) }}</span>.
          </p>
        }
        <fieldset class="m-0 p-0 border-0 flex flex-col gap-1 max-h-[46vh] overflow-y-auto">
          <legend class="sr-only">Revisor</legend>
          @for (u of options(); track u.id) {
            <label
              class="flex items-center gap-3 px-3 py-2 rounded-[6px] cursor-pointer hover:bg-surface-container-low"
              [class.bg-surface-container-low]="selected() === u.id"
            >
              <input
                type="radio"
                name="assignee"
                class="accent-primary"
                [value]="u.id"
                [checked]="selected() === u.id"
                [disabled]="u.id === current()?.user_id"
                (change)="selected.set(u.id)"
              />
              <span class="flex flex-col min-w-0 flex-1">
                <span class="text-body-compact text-on-surface truncate">
                  {{ name(u) }}
                  @if (u.id === current()?.user_id) {
                    <span class="text-caption text-on-surface-variant">(actual)</span>
                  }
                </span>
                <span class="text-caption text-on-surface-variant truncate">{{ roleLabel[u.role] }} · {{ u.email }}</span>
              </span>
              @if (pending().get(u.id); as w) {
                <span class="text-caption text-on-surface-variant whitespace-nowrap tabular-nums" title="Correos sin revisar">
                  {{ w }} {{ w === 1 ? 'pendiente' : 'pendientes' }}
                </span>
              }
            </label>
          } @empty {
            <p class="m-0 text-body-compact text-on-surface-variant">No hay usuarios activos.</p>
          }
        </fieldset>
      </div>

      <ng-container dialog-actions>
        <button type="button" [class]="btn.quiet" (click)="cancel.emit()">Cancelar</button>
        <button
          type="button"
          [class]="btn.primary"
          [disabled]="!selected() || submitting()"
          (click)="confirm.emit(selected()!)"
        >
          {{ submitting() ? 'Asignando…' : 'Asignar' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class ReassignMessageDialog implements OnInit {
  readonly users = input.required<ReadonlyArray<TenantUser>>();
  readonly current = input<MessageAssignment | null>(null);
  readonly subtitle = input('');
  readonly error = input<string | null>(null);
  readonly submitting = input(false);
  readonly cancel = output<void>();
  readonly confirm = output<string>();

  readonly btn = BTN;
  readonly roleLabel = ROLE;
  readonly name = displayName;
  readonly selected = signal<string | null>(null);
  private readonly workload = signal<AssigneeWorkload[]>([]);

  readonly pending = computed(() => new Map(this.workload().map((w) => [w.user_id, w.pendientes])));
  /** Los que menos pendientes tienen primero; luego por nombre. */
  readonly options = computed(() => {
    const p = this.pending();
    return [...this.users()].sort(
      (a, b) => (p.get(a.id) ?? 0) - (p.get(b.id) ?? 0) || displayName(a).localeCompare(displayName(b), 'es'),
    );
  });

  ngOnInit(): void {
    assignmentsApi
      .workload()
      .then((w) => this.workload.set(w))
      .catch(() => undefined);
  }
}
