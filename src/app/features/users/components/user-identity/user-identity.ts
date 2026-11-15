import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { displayName, initials } from '../../models/users.models';

type Person = { first_name: string | null; last_name: string | null; email: string };

/** Iniciales + nombre + correo. El correo solo se repite si hay nombre. */
@Component({
  selector: 'app-user-identity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-center gap-3 min-w-0' },
  template: `
    <span
      class="w-8 h-8 shrink-0 rounded-full inline-flex items-center justify-center text-[12px] font-semibold tracking-wide"
      [class]="muted() ? 'bg-surface-container text-on-surface-variant' : 'bg-primary-fixed text-on-primary-fixed-variant'"
      aria-hidden="true"
      >{{ ini() }}</span
    >
    <span class="flex flex-col min-w-0">
      <span class="text-body-medium truncate" [class]="muted() ? 'text-on-surface-variant' : 'text-on-surface'">
        {{ name() }}
        @if (isSelf()) {
          <span class="text-caption text-on-surface-variant font-normal">(tú)</span>
        }
      </span>
      @if (hasName()) {
        <span class="text-caption text-on-surface-variant truncate">{{ person().email }}</span>
      }
    </span>
  `,
})
export class UserIdentity {
  readonly person = input.required<Person>();
  readonly muted = input(false);
  readonly isSelf = input(false);

  readonly name = computed(() => displayName(this.person()));
  readonly ini = computed(() => initials(this.person()));
  readonly hasName = computed(() => this.name() !== this.person().email);
}
