import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/** Filtro de una sola elección (estado, revisión…) como pestañas compactas. */
@Component({
  selector: 'app-segmented-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block max-w-full overflow-x-auto' },
  template: `
    <div
      class="inline-flex items-center gap-0.5 p-0.5 rounded-[6px] bg-surface-container"
      role="radiogroup"
      [attr.aria-label]="label()"
    >
      @for (o of options(); track o.value) {
        <button
          type="button"
          role="radio"
          class="px-3 py-1.5 rounded-[4px] text-label-compact whitespace-nowrap border-0 cursor-pointer transition-colors"
          [class]="
            value() === o.value
              ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm'
              : 'bg-transparent text-on-surface-variant hover:text-on-surface'
          "
          [attr.aria-checked]="value() === o.value"
          (click)="valueChange.emit(o.value)"
        >
          {{ o.label }}
        </button>
      }
    </div>
  `,
})
export class SegmentedFilter<T extends string> {
  readonly options = input.required<ReadonlyArray<SegmentOption<T>>>();
  readonly value = input.required<T>();
  readonly label = input('Filtro');
  readonly valueChange = output<T>();
}
