import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-mailbox-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm px-6 py-10 flex flex-col items-start gap-3">
      <p class="m-0 text-headline-sm text-on-surface">Todavía no hay buzones conectados</p>
      <p class="m-0 text-body-default text-on-surface-variant max-w-[60ch]">
        Conecta el correo donde tu entidad recibe las notificaciones judiciales. Funciona con
        Microsoft 365, Google Workspace o cualquier servidor IMAP.
      </p>
      @if (auth.canManage()) {
        <button
          type="button"
          class="mt-1 h-9 px-4 rounded-[4px] bg-primary text-on-primary hover:bg-brand-hover text-label-default inline-flex items-center gap-1.5 border-0 cursor-pointer"
          (click)="connectClick.emit()"
        >
          <app-material-icon name="add" [size]="16" />
          Conectar buzón
        </button>
      } @else {
        <p class="m-0 text-caption text-on-surface-variant">
          Pídele a un administrador de tu entidad que conecte el buzón.
        </p>
      }
    </div>
  `,
})
export class MailboxEmptyState {
  readonly auth = inject(AuthService);
  readonly connectClick = output<void>();
}
