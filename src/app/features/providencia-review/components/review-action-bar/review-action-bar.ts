import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-review-action-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="flex items-center justify-between p-space-sm bg-surface-container-lowest rounded-lg shadow-sm"
    >
      <div class="flex items-center gap-2">
        @if (extractorVersion()) {
          <span class="text-caption text-on-surface-variant"
            >Extractor {{ extractorVersion() }}</span
          >
        }
      </div>
      <div class="flex items-center gap-space-xs">
        <button
          type="button"
          class="h-9 px-3 rounded-[6px] bg-surface-container text-on-surface text-label-default hover:bg-surface-container-high transition-colors border-0 cursor-pointer"
          (click)="discard.emit()"
        >
          Descartar cambios
        </button>
        <button
          type="button"
          class="h-9 px-4 rounded-[6px] bg-primary text-on-primary text-label-default font-medium hover:bg-primary-container transition-colors shadow-sm flex items-center gap-1.5 border-0 cursor-pointer disabled:opacity-60"
          [disabled]="saving()"
          (click)="confirm.emit()"
        >
          <app-material-icon
            [name]="saving() ? 'refresh' : 'check_circle'"
            [size]="16"
            [className]="saving() ? 'animate-spin' : ''"
          />
          <span>{{ dirty() ? 'Guardar cambios' : 'Confirmar datos' }}</span>
        </button>
      </div>
    </div>
  `,
})
export class ReviewActionBar {
  readonly dirty = input(false);
  readonly saving = input(false);
  readonly extractorVersion = input<string | null>(null);
  readonly confirm = output<void>();
  readonly discard = output<void>();
}
