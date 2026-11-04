import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, type ToastType } from '../../../core/services/toast.service';
import { MaterialIcon } from '../material-icon/material-icon';

@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="fixed bottom-space-lg right-space-lg z-50 flex flex-col gap-space-xs pointer-events-none"
      role="status"
      aria-live="polite"
    >
      @for (item of toast.items(); track item.id) {
        <div
          class="pointer-events-auto flex items-start gap-space-sm p-space-sm bg-surface-container-lowest rounded-[6px] min-w-[280px] max-w-sm shadow-md"
        >
          <span
            class="w-2 h-2 rounded-full shrink-0 mt-1"
            [class]="dotClass(item.type)"
          ></span>
          <div class="flex flex-col gap-0.5 flex-1 pr-space-xs min-w-0">
            <span class="text-label-compact text-on-surface font-medium">{{ item.title }}</span>
            @if (item.description) {
              <span class="text-caption text-on-surface-variant leading-tight">{{
                item.description
              }}</span>
            }
          </div>
          <button
            type="button"
            class="text-outline hover:text-on-surface p-0.5 cursor-pointer"
            aria-label="Cerrar notificación"
            (click)="toast.dismiss(item.id)"
          >
            <app-material-icon name="close" [size]="14" />
          </button>
        </div>
      }
    </div>
  `,
})
export class Toast {
  readonly toast = inject(ToastService);

  dotClass(type: ToastType): string {
    switch (type) {
      case 'error':
        return 'bg-error';
      case 'warn':
        return 'bg-tertiary';
      case 'sync':
        return 'bg-on-surface-variant';
      default:
        return 'bg-primary-container';
    }
  }
}
