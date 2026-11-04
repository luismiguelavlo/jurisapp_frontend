import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MaterialIcon } from '../material-icon/material-icon';

export type AlertBannerVariant = 'error' | 'warning' | 'surface-error';

@Component({
  selector: 'app-alert-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="flex items-start gap-space-xs rounded-[6px]" [class]="containerClass()" role="alert">
      <app-material-icon
        [name]="variant() === 'warning' ? 'schedule' : 'error'"
        [size]="16"
        [className]="iconClass() + ' shrink-0 mt-0.5'"
      />
      <div class="flex flex-col min-w-0 text-body-compact leading-tight">
        @if (title()) {
          <span class="text-label-compact font-semibold" [class]="titleClass()">{{ title() }}</span>
        }
        <span><ng-content /></span>
      </div>
    </div>
  `,
})
export class AlertBanner {
  readonly variant = input<AlertBannerVariant>('error');
  readonly title = input<string | undefined>(undefined);

  containerClass(): string {
    switch (this.variant()) {
      case 'surface-error':
        return 'p-3 bg-error-container text-on-error-container';
      case 'warning':
        return 'items-center gap-2 px-2.5 py-2 border bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-400';
      default:
        return 'items-center gap-2 px-2.5 py-2 border bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400';
    }
  }

  iconClass(): string {
    switch (this.variant()) {
      case 'surface-error':
        return 'text-error';
      case 'warning':
        return 'text-amber-700 dark:text-amber-400';
      default:
        return 'text-red-600 dark:text-red-400';
    }
  }

  titleClass(): string {
    return this.variant() === 'surface-error' ? 'text-error' : '';
  }
}
