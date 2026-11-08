import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-mail-connections-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <header class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div class="flex flex-col gap-1">
        <h1 class="m-0 text-headline-lg text-on-surface">Conexiones de correo</h1>
        <p class="m-0 text-body-default text-on-surface-variant max-w-[60ch]">
          Los buzones donde los juzgados notifican a tu entidad. JurisApp los lee para traer cada
          auto y fallo a la bandeja.
        </p>
      </div>

      @if (auth.canManage()) {
        <button
          type="button"
          class="h-9 px-4 rounded-[4px] bg-primary text-on-primary hover:bg-brand-hover text-label-default inline-flex items-center gap-1.5 border-0 cursor-pointer shrink-0"
          (click)="connectClick.emit()"
        >
          <app-material-icon name="add" [size]="16" />
          Conectar buzón
        </button>
      }
    </header>
  `,
})
export class MailConnectionsHeader {
  readonly auth = inject(AuthService);
  readonly connectClick = output<void>();
}
