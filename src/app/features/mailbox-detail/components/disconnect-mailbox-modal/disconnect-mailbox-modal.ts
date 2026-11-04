import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-disconnect-mailbox-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-margin"
      role="dialog"
      aria-modal="true"
      aria-labelledby="disconnect-title"
      (click)="onBackdrop($event)"
    >
      <div
        class="bg-surface-container-lowest max-w-md w-full rounded-[6px] p-space-lg flex flex-col gap-space-md"
        (click)="$event.stopPropagation()"
      >
        <div class="flex items-start gap-space-sm">
          <div
            class="w-8 h-8 rounded-[6px] bg-error-container/40 flex items-center justify-center text-error shrink-0"
          >
            <app-material-icon name="warning" [size]="18" />
          </div>
          <div class="flex flex-col gap-1">
            <h3
              id="disconnect-title"
              class="text-headline-sm text-on-surface font-semibold m-0"
            >
              ¿Desconectar buzón de urgencias?
            </h3>
            <p class="text-body-compact text-on-surface-variant mb-0">
              Se revocará inmediatamente el acceso mediante OAuth 2.0 y se purgarán los tokens
              criptográficos de la memoria segura. Los metadatos clínicos ya sincronizados se
              conservarán con fines de auditoría médica.
            </p>
          </div>
        </div>

        <div class="flex items-center justify-end gap-space-xs pt-space-xs">
          <button
            type="button"
            class="h-9 px-space-md rounded-[6px] bg-surface-container-low hover:bg-surface-container text-on-surface text-label-default transition-colors cursor-pointer"
            (click)="cancelled.emit()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="h-9 px-space-md rounded-[6px] bg-error text-on-error hover:opacity-90 text-label-default transition-all flex items-center gap-1 cursor-pointer"
            (click)="confirmed.emit()"
          >
            <span>Desconectar buzón</span>
          </button>
        </div>
      </div>
    </div>
  `,
})
export class DisconnectMailboxModal {
  readonly cancelled = output<void>();
  readonly confirmed = output<void>();

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.cancelled.emit();
    }
  }
}
