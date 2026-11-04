import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { Role } from '../../../../core/api/types';
import { formatRadicado } from '../../../../core/utils/date-format';

@Component({
  selector: 'app-case-role-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section
      class="bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-8 h-8 rounded-lg bg-secondary-container flex items-center justify-center text-primary-container shrink-0"
        >
          <app-material-icon name="verified_user" [size]="18" />
        </div>
        <div class="flex flex-col">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-headline-sm text-headline-sm text-on-surface">
              Expediente {{ formatRadicado(radicado()) }}
            </span>
            <span
              class="bg-surface-container-lowest text-primary font-label-compact text-label-compact px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
              Rol: {{ roleLabel() }}
            </span>
          </div>
          <span class="font-caption text-caption text-on-surface-variant">
            @if (canManage()) {
              Puedes organizar el expediente y usar la papelera (eliminar / restaurar).
            } @else {
              Vista de permisos de rol: Member (las opciones de eliminar y el acceso a la papelera
              están ocultos automáticamente).
            }
          </span>
        </div>
      </div>
      @if (!canManage()) {
        <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span
            class="font-caption text-caption text-on-surface-variant bg-surface-container-lowest px-2.5 py-1 rounded-lg shadow-sm"
          >
            Auditoría de borrado restringida
          </span>
        </div>
      }
    </section>
  `,
})
export class CaseRoleBanner {
  readonly radicado = input.required<string>();
  readonly role = input<Role | null>(null);
  readonly canManage = input(false);

  readonly formatRadicado = formatRadicado;

  roleLabel(): string {
    const r = this.role();
    if (r === 'owner') return 'Owner';
    if (r === 'admin') return 'Admin';
    return 'Member';
  }
}
