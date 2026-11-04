import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-material-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'inline-flex items-center justify-center',
  },
  template: `
    <span
      [class]="classes()"
      [style.font-size.px]="size()"
      [attr.aria-hidden]="ariaLabel() ? null : true"
      [attr.aria-label]="ariaLabel()"
    >
      {{ name() }}
    </span>
  `,
})
export class MaterialIcon {
  readonly name = input.required<string>();
  readonly size = input(18);
  readonly className = input('');
  readonly ariaLabel = input<string | undefined>(undefined);

  readonly classes = computed(
    () => `material-symbols-outlined leading-none ${this.className()}`.trim(),
  );
}
