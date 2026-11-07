import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="w-full max-w-[1120px] mx-auto px-4 md:px-8 py-5 text-caption text-on-surface-variant border-t border-outline-variant/70"
    >
      © 2026 JurisApp
    </footer>
  `,
})
export class AppFooter {}
