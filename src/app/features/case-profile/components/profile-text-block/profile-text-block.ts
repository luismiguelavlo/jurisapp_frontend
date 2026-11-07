import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type ProfileTextVariant = 'body' | 'lead';

/** Texto de la ficha (hechos, objeto) en lectura o edición. `lead` = entrada en serif. */
@Component({
  selector: 'app-profile-text-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!editing()) {
      <p class="m-0 whitespace-pre-line max-w-[68ch]" [class]="textClass()">{{ text() }}</p>
    } @else {
      <textarea
        [rows]="rows()"
        [attr.aria-label]="label()"
        class="w-full px-2.5 py-2 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-on-surface focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        [class]="textClass()"
        [value]="text()"
        (input)="textChange.emit($any($event.target).value)"
      ></textarea>
    }
  `,
})
export class ProfileTextBlock {
  readonly text = input.required<string>();
  readonly label = input('Texto');
  readonly rows = input(6);
  readonly editing = input(false);
  readonly variant = input<ProfileTextVariant>('body');
  readonly textChange = output<string>();

  readonly textClass = computed(() =>
    this.variant() === 'lead'
      ? 'font-display text-[22px] leading-[30px] font-medium text-on-surface'
      : 'text-[15px] leading-[25px] text-on-surface',
  );
}
