import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Interruptor "Recibe correos" (SPEC 24). Sin `editable`, solo la etiqueta. */
@Component({
  selector: 'app-assignment-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex' },
  template: `
    @if (editable()) {
      <button
        type="button"
        role="switch"
        class="relative w-9 h-5 rounded-full border-0 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        [class]="on() ? 'bg-primary' : 'bg-outline-variant'"
        [attr.aria-checked]="on()"
        [attr.aria-label]="label()"
        [attr.title]="disabledReason() ?? label()"
        [disabled]="busy() || !!disabledReason()"
        (click)="toggle.emit(!on())"
      >
        <span
          class="absolute top-0.5 w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm transition-[left]"
          [class]="on() ? 'left-[18px]' : 'left-0.5'"
        ></span>
      </button>
    } @else {
      <span class="text-body-compact" [class]="on() ? 'text-on-surface' : 'text-on-surface-variant'">{{
        on() ? 'Sí' : 'No'
      }}</span>
    }
  `,
})
export class AssignmentToggle {
  readonly on = input.required<boolean>();
  readonly editable = input(false);
  readonly busy = input(false);
  /** Si viene, el interruptor se deshabilita y lo explica en el título. */
  readonly disabledReason = input<string | null>(null);
  readonly label = input('Recibe correos asignados automáticamente');
  readonly toggle = output<boolean>();
}
