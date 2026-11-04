import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { ContextMenuAction } from '../../models/case-files.models';

@Component({
  selector: 'app-case-context-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'contents' },
  template: `
    <div
      class="fixed z-[100] bg-surface-container-lowest rounded-xl shadow-xl p-1.5 min-w-[210px] flex flex-col gap-0.5 ring-1 ring-outline-variant/30"
      [style.top.px]="top()"
      [style.left.px]="left()"
      (click)="$event.stopPropagation()"
    >
      <div
        class="px-2 py-1 text-[11px] font-caption text-on-surface-variant uppercase tracking-wider truncate"
      >
        {{ header() }}
      </div>
      @for (action of visibleActions(); track action.id) {
        <button
          type="button"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-lg font-body-compact text-body-compact w-full text-left transition-colors border-0 bg-transparent cursor-pointer"
          [class]="
            action.tone === 'error'
              ? 'text-error hover:bg-error-container/40'
              : 'text-on-surface hover:bg-surface-container-low'
          "
          (click)="actionSelect.emit(action.id)"
        >
          <app-material-icon
            [name]="action.icon"
            [size]="16"
            [className]="
              action.tone === 'error'
                ? 'text-error'
                : action.tone === 'primary'
                  ? 'text-primary-container'
                  : 'text-on-surface-variant'
            "
          />
          <span>{{ action.label }}</span>
        </button>
      }
    </div>
  `,
})
export class CaseContextMenu {
  readonly header = input('');
  readonly actions = input.required<ReadonlyArray<ContextMenuAction<string>>>();
  readonly canManage = input(false);
  readonly top = input(0);
  readonly left = input(0);
  readonly actionSelect = output<string>();

  readonly visibleActions = computed(() =>
    this.actions().filter((a) => !a.requiresAdmin || this.canManage()),
  );
}
