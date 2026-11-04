import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-review-alert-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="bg-[#FFFBEB] rounded-lg p-space-sm flex flex-col md:flex-row md:items-center justify-between gap-space-xs shadow-sm"
    >
      <div class="flex items-center gap-space-xs">
        <app-material-icon name="warning" [size]="18" className="text-[#B45309] shrink-0" />
        <p class="text-body-default text-[#78350F] m-0">
          <strong class="font-medium"
            >{{ pendingLabels().length }} campos requieren revisión antes de confirmar:</strong
          >
          {{ pendingLabels().join(', ') }}.
        </p>
      </div>
      <button
        type="button"
        class="px-space-xs py-1 rounded-[6px] bg-[#FDE68A] hover:bg-[#FCD34D] text-[#78350F] text-label-compact font-medium transition-colors flex items-center gap-1 border-0 cursor-pointer self-end md:self-auto"
        (click)="jumpToPending.emit()"
      >
        <span>Saltar a pendientes</span>
        <app-material-icon name="arrow_downward" [size]="14" />
      </button>
    </div>
  `,
})
export class ReviewAlertBanner {
  readonly pendingLabels = input.required<ReadonlyArray<string>>();
  readonly jumpToPending = output<void>();
}
