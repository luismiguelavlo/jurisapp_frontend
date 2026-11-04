import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-mailbox-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="bg-surface-container-lowest rounded-xl py-16 px-space-md flex flex-col items-center justify-center text-center gap-space-md"
    >
      <p class="text-body-default text-on-surface-variant m-0">Aún no hay buzones conectados.</p>
      @if (auth.canManage()) {
        <button
          type="button"
          class="h-9 px-3.5 bg-primary-container text-on-primary hover:bg-primary text-label-default font-medium rounded-lg inline-flex items-center gap-space-xs transition-colors cursor-pointer"
          (click)="connectClick.emit()"
        >
          <app-material-icon name="add" [size]="16" />
          <span>Conectar buzón</span>
        </button>
      }
    </div>
  `,
})
export class MailboxEmptyState {
  readonly auth = inject(AuthService);
  readonly connectClick = output<void>();
}
