import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { MaterialIcon } from '../material-icon/material-icon';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @switch (variant()) {
      @case ('labeled') {
        <button
          type="button"
          class="h-7 px-2 flex items-center gap-1.5 rounded-[6px] bg-surface-container-lowest dark:bg-zinc-900 border border-outline-variant/40 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          aria-label="Alternar modo visual"
          (click)="theme.toggle()"
        >
          <app-material-icon
            [name]="theme.isDark() ? 'light_mode' : 'dark_mode'"
            [size]="16"
          />
          <span class="text-label-compact">{{ theme.isDark() ? 'Claro' : 'Oscuro' }}</span>
        </button>
      }
      @case ('ghost') {
        <button
          type="button"
          class="w-8 h-8 rounded-[6px] flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors cursor-pointer"
          title="Alternar tema"
          [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
          (click)="theme.toggle()"
        >
          <app-material-icon
            [name]="theme.isDark() ? 'dark_mode' : 'light_mode'"
            [size]="16"
          />
        </button>
      }
      @default {
        <button
          type="button"
          class="p-1.5 rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface-variant hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
          [attr.aria-label]="theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'"
          (click)="theme.toggle()"
        >
          <app-material-icon
            [name]="theme.isDark() ? 'light_mode' : 'dark_mode'"
            [size]="18"
          />
        </button>
      }
    }
  `,
})
export class ThemeToggle {
  readonly theme = inject(ThemeService);
  readonly variant = input<'icon' | 'labeled' | 'ghost'>('icon');
}
