import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MaterialIcon } from '../material-icon/material-icon';
import { ThemeToggle } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, ThemeToggle],
  template: `
    <header
      class="w-full max-w-[1120px] mx-auto px-margin-desktop h-16 flex items-center justify-between"
    >
      <div class="flex items-center gap-space-sm">
        <div
          class="w-6 h-6 rounded-lg bg-primary-container flex items-center justify-center"
        >
          <app-material-icon name="health_metrics" [size]="16" className="text-on-primary" />
        </div>
        <span class="text-headline-sm tracking-tight text-on-surface">salud-auto</span>
      </div>
      <div class="flex items-center gap-space-sm">
        <app-theme-toggle variant="icon" />
      </div>
    </header>
  `,
})
export class AppHeader {}
