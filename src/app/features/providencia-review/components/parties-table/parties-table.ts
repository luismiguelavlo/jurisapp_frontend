import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { confianzaLabel } from '../../../../core/api/document-labels';
import type { Parte } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-parties-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="overflow-x-auto rounded-[6px]">
      <table class="w-full text-left border-collapse text-body-compact">
        <thead>
          <tr class="bg-surface-container-low text-caption text-on-surface-variant h-9">
            <th class="px-3 py-1 font-medium">Rol</th>
            <th class="px-3 py-1 font-medium">Nombre / Razón Social</th>
            <th class="px-3 py-1 font-medium">Identificación</th>
            <th class="px-3 py-1 font-medium">Confianza</th>
            <th class="px-2 py-1 font-medium text-right">Acción</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-container-high">
          @for (party of parties(); track $index; let i = $index) {
            <tr class="hover:bg-surface-container-low/50 transition-colors">
              <td class="px-3 py-2">
                <span
                  class="px-1.5 py-0.5 rounded text-[11px] font-medium capitalize"
                  [class]="
                    party.rol === 'accionante'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-surface-container-high text-on-surface-variant'
                  "
                  >{{ party.rol }}</span
                >
              </td>
              <td class="px-3 py-2 font-medium text-on-surface">{{ party.nombre }}</td>
              <td class="px-3 py-2">
                @if (party.identificacion; as id) {
                  <span class="font-mono text-xs">{{ id.tipo }} {{ id.numero }}</span>
                  <span
                    class="ml-1 px-1 rounded text-[10px]"
                    [class]="
                      id.fuente === 'catalogo'
                        ? 'bg-[#E0F2FE] text-[#0369A1]'
                        : 'bg-surface-container text-on-surface-variant'
                    "
                    >{{ id.fuente === 'catalogo' ? 'del catálogo' : 'del documento' }}</span
                  >
                } @else {
                  <span class="text-on-surface-variant text-xs">—</span>
                }
              </td>
              <td class="px-3 py-2">
                <span
                  class="text-xs font-medium"
                  [class]="
                    party.confianza === 'alta'
                      ? 'text-[#15803D]'
                      : party.confianza === 'media'
                        ? 'text-[#B45309]'
                        : 'text-[#991B1B]'
                  "
                  >{{ confianzaLabel(party.confianza) }}</span
                >
              </td>
              <td class="px-2 py-2 text-right">
                <button
                  type="button"
                  class="p-1 rounded text-error hover:bg-error-container border-0 bg-transparent cursor-pointer"
                  (click)="remove.emit(i)"
                >
                  <app-material-icon name="delete" [size]="16" />
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div class="flex justify-end pt-1">
      <button
        type="button"
        class="px-space-xs py-1 rounded-[6px] border border-outline-variant text-caption font-medium hover:bg-surface-container-low transition-colors flex items-center gap-1 bg-transparent cursor-pointer"
        (click)="addParty.emit()"
      >
        <app-material-icon name="add" [size]="14" />
        <span>Agregar parte</span>
      </button>
    </div>
  `,
})
export class PartiesTable {
  readonly confianzaLabel = confianzaLabel;
  readonly parties = input.required<ReadonlyArray<Parte>>();
  readonly addParty = output<void>();
  readonly remove = output<number>();
}
