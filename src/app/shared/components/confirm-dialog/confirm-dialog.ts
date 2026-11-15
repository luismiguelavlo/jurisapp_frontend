import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { BTN } from '../../ui/ui-classes';
import { DialogShell } from '../dialog-shell/dialog-shell';

/** Confirmación de una acción con consecuencias. El botón repite el verbo de la acción. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DialogShell],
  template: `
    <app-dialog-shell [title]="title()" width="sm" (closed)="cancelled.emit()">
      <div class="flex flex-col gap-2 text-body-default text-on-surface max-w-[60ch]">
        <ng-content />
      </div>
      <ng-container dialog-actions>
        <button type="button" [class]="btn.quiet" (click)="cancelled.emit()">Cancelar</button>
        <button
          type="button"
          data-autofocus
          [class]="tone() === 'danger' ? btn.danger : btn.primary"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          {{ confirmLabel() }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly tone = input<'danger' | 'primary'>('primary');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
  readonly btn = BTN;
}
