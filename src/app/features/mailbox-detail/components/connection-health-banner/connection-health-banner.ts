import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { ConnectionHealth } from '../../models/mailbox-detail.models';

@Component({
  selector: 'app-connection-health-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @if (health() === 'reauth') {
      <div class="w-full bg-tertiary-container/10 px-margin-desktop py-space-sm">
        <div class="max-w-[1120px] mx-auto flex items-center justify-between gap-space-md">
          <div class="flex items-center gap-space-sm">
            <app-material-icon name="warning" [size]="18" className="text-tertiary" />
            <span class="text-body-compact text-on-surface">
              <strong>Requiere reautorización:</strong> El token de actualización de Microsoft 365
              ha caducado o el administrador del tenant revocó los alcances.
            </span>
          </div>
          <button
            type="button"
            class="h-[30px] px-space-sm rounded-[6px] bg-tertiary text-on-tertiary text-label-compact hover:opacity-90 transition-opacity cursor-pointer"
            (click)="reauthorize.emit()"
          >
            Reautorizar buzón
          </button>
        </div>
      </div>
    }

    @if (health() === 'error') {
      <div class="w-full bg-error-container/20 px-margin-desktop py-space-sm">
        <div class="max-w-[1120px] mx-auto flex items-center justify-between gap-space-md">
          <div class="flex items-center gap-space-sm">
            <app-material-icon name="error" [size]="18" className="text-error" />
            <span class="text-body-compact text-error">
              <strong>Fallo crítico de sincronización:</strong> Graph API reportó
              "MailboxNotEnabledForRESTAPI". Verifique la licencia de Exchange Online.
            </span>
          </div>
          <button
            type="button"
            class="h-[30px] px-space-sm rounded-[6px] bg-error text-on-error text-label-compact hover:opacity-90 transition-opacity cursor-pointer"
            (click)="diagnose.emit()"
          >
            Reintentar diagnóstico
          </button>
        </div>
      </div>
    }
  `,
})
export class ConnectionHealthBanner {
  readonly health = input.required<ConnectionHealth>();
  readonly reauthorize = output<void>();
  readonly diagnose = output<void>();
}
