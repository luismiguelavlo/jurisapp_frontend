import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AppLogo } from '../app-logo/app-logo';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AppLogo],
  template: `
    <header class="w-full max-w-[1120px] mx-auto px-4 md:px-8 h-16 flex items-center">
      <app-logo size="md" />
    </header>
  `,
})
export class AppHeader {}
