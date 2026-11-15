import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Fila de ajustes: explicación a la izquierda, hoja con el formulario a la derecha. */
@Component({
  selector: 'app-profile-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section class="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-3 md:gap-10" [attr.aria-labelledby]="id()">
      <div class="flex flex-col gap-1 md:pt-5">
        <h2 [id]="id()" class="m-0 text-headline-sm text-on-surface">{{ title() }}</h2>
        <p class="m-0 text-body-compact text-on-surface-variant">{{ description() }}</p>
      </div>
      <div class="bg-surface-container-lowest rounded-xl shadow-sm p-5 sm:p-6 max-w-[560px]">
        <ng-content />
      </div>
    </section>
  `,
})
export class ProfileSection {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly description = input('');
}
