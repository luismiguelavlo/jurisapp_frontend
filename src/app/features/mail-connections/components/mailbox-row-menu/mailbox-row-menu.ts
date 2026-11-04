import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { MailboxMenuAction } from '../../models/mailbox.models';

@Component({
  selector: 'app-mailbox-row-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: {
    class: 'contents',
  },
  template: `
    <div
      class="fixed w-48 bg-surface-container-lowest rounded-lg shadow-[0_8px_24px_rgba(0,0,0,0.12)] ring-1 ring-outline-variant/40 py-1 z-[100] text-left"
      [style.top.px]="top()"
      [style.left.px]="left()"
      (click)="$event.stopPropagation()"
    >
      @for (item of visibleItems(); track item.kind === 'action' ? item.action.id : item.id) {
        @if (item.kind === 'divider') {
          <div class="my-1 bg-surface-container h-px"></div>
        } @else {
          <button
            type="button"
            class="w-full px-3 py-1.5 text-left text-body-compact hover:bg-surface-container-low flex items-center gap-2 cursor-pointer border-0 bg-transparent"
            [class]="
              item.action.tone === 'error'
                ? 'text-error'
                : item.action.tone === 'primary'
                  ? 'text-primary font-medium'
                  : 'text-on-surface'
            "
            (click)="actionSelect.emit(item.action); $event.stopPropagation()"
          >
            <app-material-icon [name]="item.action.icon" [size]="16" />
            {{ item.action.label }}
          </button>
        }
      }
    </div>
  `,
})
export class MailboxRowMenu {
  readonly actions = input.required<ReadonlyArray<MailboxMenuAction>>();
  readonly canAdmin = input(true);
  /** Viewport Y of the menu top edge. */
  readonly top = input(0);
  /** Viewport X of the menu left edge. */
  readonly left = input(0);
  readonly actionSelect = output<MailboxMenuAction>();

  readonly visibleItems = computed(() => {
    const filtered = this.actions().filter(
      (action) => !action.requiresAdmin || this.canAdmin(),
    );

    const items: Array<
      | { kind: 'action'; action: MailboxMenuAction }
      | { kind: 'divider'; id: string }
    > = [];

    filtered.forEach((action, index) => {
      if (action.tone === 'error' && index > 0) {
        items.push({ kind: 'divider', id: `divider-${action.id}` });
      }
      items.push({ kind: 'action', action });
    });

    return items;
  });
}
