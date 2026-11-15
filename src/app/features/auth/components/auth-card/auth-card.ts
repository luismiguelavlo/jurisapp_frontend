import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Hoja blanca centrada para los pasos de acceso (invitación, cambio de contraseña). */
@Component({
  selector: 'app-auth-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full' },
  template: `
    <div class="w-full bg-surface-container-lowest rounded-xl p-6 sm:p-7 text-on-surface shadow-sm">
      <div class="mb-5 flex flex-col gap-1">
        <h2 class="m-0 text-headline-md text-on-surface">{{ title() }}</h2>
        @if (description()) {
          <p class="m-0 text-body-compact text-on-surface-variant">{{ description() }}</p>
        }
      </div>
      <ng-content />
    </div>
  `,
})
export class AuthCard {
  readonly title = input.required<string>();
  readonly description = input<string | null>(null);
}
