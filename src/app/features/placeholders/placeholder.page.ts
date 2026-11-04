import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-placeholder-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[1120px] mx-auto p-space-xl">
      <h1 class="text-headline-lg text-on-surface font-semibold tracking-tight m-0">
        {{ title() }}
      </h1>
      <p class="text-body-default text-on-surface-variant mt-space-sm mb-0">
        Sección en construcción.
      </p>
    </div>
  `,
})
export class PlaceholderPage {
  private readonly route = inject(ActivatedRoute);

  readonly title = toSignal(
    this.route.data.pipe(map((data) => (data['title'] as string | undefined) ?? 'Próximamente')),
    { initialValue: 'Próximamente' },
  );
}
