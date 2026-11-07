import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type AppLogoSize = 'sm' | 'md' | 'lg';

const MARK_PX: Record<AppLogoSize, number> = { sm: 22, md: 28, lg: 36 };
const TEXT: Record<AppLogoSize, string> = {
  sm: 'text-headline-sm',
  md: 'text-headline-sm',
  lg: 'text-headline-md',
};

/** Logo de JurisApp: balanza con fiel en "J" + wordmark. */
@Component({
  selector: 'app-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex items-center gap-2' },
  template: `
    <svg
      viewBox="0 0 32 32"
      [attr.width]="markPx()"
      [attr.height]="markPx()"
      [attr.aria-hidden]="wordmark() ? true : null"
      [attr.aria-label]="wordmark() ? null : 'JurisApp'"
      role="img"
      class="shrink-0"
    >
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <g
        fill="none"
        stroke="#ffffff"
        stroke-width="2.2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M16 7.5V20a4 4 0 0 1-8 0" />
        <path d="M8.5 11h15" />
        <path d="M23.5 11l-2.6 5.2h5.2z" />
        <path d="M8.5 11l-2.4 4.8h4.8z" />
      </g>
    </svg>
    @if (wordmark()) {
      <span class="font-semibold tracking-tight text-on-surface" [class]="textClass()"
        >Juris<span class="text-brand">App</span></span
      >
    }
  `,
})
export class AppLogo {
  readonly size = input<AppLogoSize>('md');
  readonly wordmark = input(true);

  readonly markPx = computed(() => MARK_PX[this.size()]);
  readonly textClass = computed(() => TEXT[this.size()]);
}
