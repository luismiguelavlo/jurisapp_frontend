import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer
      class="w-full max-w-[1120px] mx-auto px-margin-desktop py-space-md flex items-center justify-between text-outline text-caption border-t border-outline-variant/20"
    >
      <span>© 2025 salud-auto Inc. HIPAA &amp; SOC2 Type II Certified.</span>
      <div class="flex items-center gap-space-md">
        <a class="hover:text-on-surface transition-colors" href="#">Security Protocol</a>
        <a class="hover:text-on-surface transition-colors" href="#">Status</a>
        <a class="hover:text-on-surface transition-colors" href="#">Support</a>
      </div>
    </footer>
  `,
})
export class AppFooter {}
