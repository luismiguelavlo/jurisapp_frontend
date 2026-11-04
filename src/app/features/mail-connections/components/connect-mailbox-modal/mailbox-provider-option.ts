import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { MailProvider, MailProviderOption } from '../../models/connect-mailbox.models';

@Component({
  selector: 'app-mailbox-provider-option',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <label
      class="group relative flex items-start gap-space-sm p-3 rounded-[6px] cursor-pointer transition-all border"
      [class]="
        selected()
          ? 'bg-surface-container-low/40 border-primary-container/30'
          : 'bg-surface-container-lowest border-transparent hover:bg-surface-container-low'
      "
      [attr.for]="'provider-' + option().id"
    >
      <div class="pt-0.5">
        <input
          class="h-4 w-4 text-primary-container accent-primary-container cursor-pointer focus:ring-0"
          type="radio"
          name="provider_choice"
          [id]="'provider-' + option().id"
          [value]="option().id"
          [checked]="selected()"
          (change)="select.emit(option().id)"
        />
      </div>
      <div
        class="w-6 h-6 rounded-[4px] bg-surface-container-high flex items-center justify-center text-on-surface shrink-0 mt-0.5"
      >
        <app-material-icon [name]="option().icon" [size]="16" />
      </div>
      <div class="flex flex-col min-w-0">
        <div class="flex items-center gap-space-xs">
          <span class="text-body-medium text-on-surface font-semibold">{{ option().label }}</span>
          @if (option().badge; as badge) {
            <span
              class="px-1.5 py-0.5 rounded-[4px] text-[11px] font-medium"
              [class]="
                badge.tone === 'recommended'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface-container-high text-on-surface-variant'
              "
              >{{ badge.label }}</span
            >
          }
        </div>
        <p class="text-caption text-on-surface-variant leading-tight mt-0.5 mb-0">
          {{ option().description }}
        </p>
      </div>
    </label>
  `,
})
export class MailboxProviderOption {
  readonly option = input.required<MailProviderOption>();
  readonly selected = input(false);
  readonly select = output<MailProvider>();
}
