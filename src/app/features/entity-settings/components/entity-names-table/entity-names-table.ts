import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { EntityName } from '../../../../core/api/types';
import { formatBogotaDate } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Nombres configurados de la entidad del tenant. */
@Component({
  selector: 'app-entity-names-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full border-collapse text-body-compact">
        <thead>
          <tr class="text-left text-caption text-on-surface-variant">
            <th class="font-medium px-2 py-2 border-b border-outline-variant/30">Nombre</th>
            <th class="font-medium px-2 py-2 border-b border-outline-variant/30">NIT</th>
            <th class="font-medium px-2 py-2 border-b border-outline-variant/30">Agregado</th>
            @if (canManage()) {
              <th class="w-10 border-b border-outline-variant/30"></th>
            }
          </tr>
        </thead>
        <tbody>
          @for (n of names(); track n.id) {
            <tr>
              <td class="px-2 py-2 border-b border-outline-variant/15 text-on-surface font-medium">
                {{ n.nombre }}
              </td>
              <td class="px-2 py-2 border-b border-outline-variant/15 text-on-surface-variant font-mono">
                {{ n.nit || '—' }}
              </td>
              <td class="px-2 py-2 border-b border-outline-variant/15 text-on-surface-variant">
                {{ formatBogotaDate(n.created_at) }}
              </td>
              @if (canManage()) {
                <td class="px-1 py-2 border-b border-outline-variant/15">
                  <button
                    type="button"
                    class="p-1 rounded text-on-surface-variant hover:text-error hover:bg-surface-container border-0 bg-transparent cursor-pointer disabled:opacity-40"
                    [attr.aria-label]="'Eliminar ' + n.nombre"
                    [disabled]="busyId() === n.id"
                    (click)="remove.emit(n)"
                  >
                    <app-material-icon name="delete" [size]="16" />
                  </button>
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class EntityNamesTable {
  readonly names = input.required<EntityName[]>();
  readonly canManage = input(false);
  readonly busyId = input<string | null>(null);
  readonly remove = output<EntityName>();
  readonly formatBogotaDate = formatBogotaDate;
}
