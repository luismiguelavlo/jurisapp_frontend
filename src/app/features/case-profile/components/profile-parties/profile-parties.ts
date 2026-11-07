import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ParteFicha } from '../../../../core/api/types';
import { matchesEntity } from '../../../../core/utils/entity-name';
import { ToneBadge } from '../../../../shared/components/tone-badge/tone-badge';

/** Partes de la ficha: accionados y vinculados, resaltando la entidad del tenant. */
@Component({
  selector: 'app-profile-parties',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToneBadge],
  template: `
    <div class="flex flex-col gap-3">
      @for (g of groups(); track g.label) {
        <div class="flex flex-col gap-1.5 min-w-0">
          <p class="m-0 text-caption text-on-surface-variant">{{ g.label }}</p>
          @if (g.items.length === 0) {
            <p class="m-0 text-body-compact text-on-surface-variant">—</p>
          } @else {
            <ul class="m-0 p-0 list-none flex flex-col gap-1">
              @for (p of g.items; track $index) {
                <li
                  class="flex flex-wrap items-center gap-2 -mx-2 px-2 py-1 rounded-[4px] text-body-compact"
                  [class]="
                    p.mine
                      ? 'bg-primary-fixed/60 text-on-surface font-medium'
                      : 'text-on-surface'
                  "
                >
                  {{ p.nombre }}
                  @if (p.mine) {
                    <app-tone-badge tone="info">Tu entidad</app-tone-badge>
                  }
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
})
export class ProfileParties {
  readonly partes = input.required<ParteFicha[]>();
  /** Nombres normalizados de la entidad (configurados o detectado). */
  readonly entityNames = input<readonly string[]>([]);

  readonly groups = computed(() => {
    const names = this.entityNames();
    const tag = (p: ParteFicha) => ({ nombre: p.nombre, mine: matchesEntity(p.nombre, names) });
    const ps = this.partes();
    return [
      { label: 'Accionados', items: ps.filter((p) => p.rol === 'accionado').map(tag) },
      { label: 'Vinculados', items: ps.filter((p) => p.rol === 'vinculado').map(tag) },
    ];
  });
}
