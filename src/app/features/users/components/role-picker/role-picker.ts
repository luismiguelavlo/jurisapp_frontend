import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ROLE_HELP, ROLE_LABEL, type UserRole } from '../../models/users.models';

/** Rol como lista de opciones con lo que permite cada una; solo muestra los que el actor puede conceder. */
@Component({
  selector: 'app-role-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="m-0 p-0 border-0 flex flex-col gap-1.5">
      <legend class="mb-1.5 p-0 text-label-compact text-on-surface">Rol</legend>
      <div class="flex flex-col rounded-[6px] border border-outline-variant overflow-hidden" role="radiogroup">
        @for (r of roles(); track r) {
          <label
            class="flex items-start gap-3 px-3 py-2.5 cursor-pointer border-b border-outline-variant/60 last:border-b-0 transition-colors"
            [class]="value() === r ? 'bg-primary-fixed/45' : 'bg-surface-container-lowest hover:bg-surface-container-low'"
          >
            <input
              type="radio"
              class="mt-0.5 accent-[var(--color-primary)] w-4 h-4 shrink-0"
              [name]="name()"
              [value]="r"
              [checked]="value() === r"
              (change)="valueChange.emit(r)"
            />
            <span class="flex flex-col">
              <span class="text-body-medium" [class]="value() === r ? 'text-primary' : 'text-on-surface'">{{ label[r] }}</span>
              <span class="text-caption text-on-surface-variant">{{ help[r] }}</span>
            </span>
          </label>
        }
      </div>
      @if (note()) {
        <p class="m-0 text-caption text-on-surface-variant">{{ note() }}</p>
      }
    </fieldset>
  `,
})
export class RolePicker {
  readonly roles = input.required<ReadonlyArray<UserRole>>();
  readonly value = input.required<UserRole>();
  readonly name = input('role');
  readonly note = input<string | null>(null);
  readonly valueChange = output<UserRole>();

  readonly label = ROLE_LABEL;
  readonly help = ROLE_HELP;
}
