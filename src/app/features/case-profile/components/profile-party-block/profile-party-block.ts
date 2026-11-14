import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { PersonaView } from '../../models/case-overview.models';

/** Una parte de la carátula: rol, nombre(s) en tipografía de expediente y su documento. */
@Component({
  selector: 'app-profile-party-block',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-0' },
  template: `
    <div class="flex flex-col gap-2 min-w-0">
      <p class="m-0 text-caption font-semibold text-on-surface-variant">{{ rol() }}</p>
      @if (personas().length) {
        <ul
          class="m-0 p-0 list-none gap-x-8 gap-y-3"
          [class]="layout() === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2' : 'flex flex-col'"
        >
          @for (p of personas(); track $index) {
            <li class="min-w-0">
              <span
                class="block font-display text-[20px] leading-7 text-on-surface break-words [text-wrap:balance]"
                >{{ p.nombre }}</span
              >
              <span class="block text-body-compact tabular-nums text-on-surface-variant">
                {{ p.documento ?? 'Documento no encontrado' }}
              </span>
            </li>
          }
        </ul>
      } @else {
        <p class="m-0 text-body-default text-on-surface-variant">{{ empty() }}</p>
      }
      @if (representante(); as r) {
        <p class="m-0 text-body-compact text-on-surface">
          <span class="text-on-surface-variant">Actúa por medio de</span> {{ r }}
        </p>
      }
    </div>
  `,
})
export class ProfilePartyBlock {
  readonly rol = input.required<string>();
  readonly personas = input<readonly PersonaView[]>([]);
  readonly representante = input<string | null>(null);
  readonly empty = input('No aparece en los documentos');
  readonly layout = input<'stack' | 'grid'>('stack');
}
