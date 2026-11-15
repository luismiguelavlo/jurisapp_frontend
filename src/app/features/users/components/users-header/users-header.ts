import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { BTN } from '../../../../shared/ui/ui-classes';

@Component({
  selector: 'app-users-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-headline-lg text-on-surface">Usuarios</h1>
        <p class="m-0 text-body-default text-on-surface-variant max-w-[62ch]">
          Quién puede entrar a {{ tenantName() }} y qué puede hacer. Las invitaciones llegan por correo
          con un enlace que sirve una sola vez.
        </p>
      </div>
      @if (canManage()) {
        <button type="button" [class]="btn.primary + ' shrink-0'" (click)="invite.emit()">
          <app-material-icon name="person_add" [size]="16" />
          Invitar usuario
        </button>
      }
    </header>
  `,
})
export class UsersHeader {
  readonly tenantName = input('tu entidad');
  readonly canManage = input(false);
  readonly invite = output<void>();
  readonly btn = BTN;
}
