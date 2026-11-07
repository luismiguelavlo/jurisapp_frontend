import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  caseStatusInk,
  caseStatusLabel,
  caseStatusRail,
} from '../../../../core/api/document-labels';
import type { CaseSummary } from '../../../../core/api/types';
import { formatBogotaDateTime, remainingLabel } from '../../../../core/utils/date-format';
import { RadicadoMark } from '../../../../shared/components/radicado-mark/radicado-mark';

/**
 * Lista de procesos como libro de radicación: el borde de cada fila marca el término
 * y el vencimiento se lee primero como tiempo restante.
 */
@Component({
  selector: 'app-cases-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RadicadoMark],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div class="w-full overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
              <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Radicado</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Vencimiento</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Estado</th>
              <th class="py-2.5 px-4 font-medium text-right" scope="col">Providencias</th>
              <th class="py-2.5 pl-4 pr-6 font-medium text-right" scope="col">Correos</th>
            </tr>
          </thead>
          <tbody>
            @for (c of items(); track c.id) {
              <tr
                class="cursor-pointer border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low transition-colors"
                [routerLink]="['/cases', c.id]"
              >
                <td class="py-3 pl-6 pr-4" [class]="caseStatusRail(c.estado)">
                  <a
                    [routerLink]="['/cases', c.id]"
                    class="no-underline text-inherit"
                    [attr.aria-label]="'Abrir proceso ' + c.radicado"
                  >
                    <app-radicado-mark [value]="c.radicado" size="md" />
                  </a>
                </td>
                <td class="py-3 px-4">
                  @if (c.proximo_vencimiento) {
                    <span
                      class="block text-body-default font-medium"
                      [class]="caseStatusInk(c.estado)"
                      >{{ remainingLabel(c.proximo_vencimiento) }}</span
                    >
                    <time class="block text-caption text-on-surface-variant">{{
                      formatBogotaDateTime(c.proximo_vencimiento)
                    }}</time>
                  } @else {
                    <span class="text-body-compact text-on-surface-variant">Sin término</span>
                  }
                </td>
                <td class="py-3 px-4 text-body-compact text-on-surface">
                  {{ caseStatusLabel(c.estado) }}
                </td>
                <td class="py-3 px-4 text-right text-body-default text-on-surface tabular-nums">
                  {{ c.providencias }}
                </td>
                <td class="py-3 pl-4 pr-6 text-right text-body-default text-on-surface-variant tabular-nums">
                  {{ c.mensajes_count }}
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (nextCursor()) {
        <div class="px-6 py-3 border-t border-outline-variant/70">
          <button
            type="button"
            class="text-label-compact text-primary border-0 bg-transparent cursor-pointer p-0 hover:underline disabled:opacity-50 disabled:no-underline"
            [disabled]="loadingMore()"
            (click)="loadMore.emit()"
          >
            {{ loadingMore() ? 'Cargando procesos…' : 'Cargar más procesos' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class CasesTable {
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly remainingLabel = remainingLabel;
  readonly caseStatusLabel = caseStatusLabel;
  readonly caseStatusRail = caseStatusRail;
  readonly caseStatusInk = caseStatusInk;

  readonly items = input.required<ReadonlyArray<CaseSummary>>();
  readonly nextCursor = input<string | null>(null);
  readonly loadingMore = input(false);
  readonly loadMore = output<void>();
}
