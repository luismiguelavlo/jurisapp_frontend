import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant"
    >
      <span
        class="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
        [class]="online() ? 'bg-emerald-500' : 'bg-outline'"
      ></span>
      <span class="text-body-compact text-on-surface-variant">{{ label() }}</span>
    </div>
  `,
})
export class StatusBadge {
  readonly online = input(true);
  readonly label = input('Sistema: En línea');
}
