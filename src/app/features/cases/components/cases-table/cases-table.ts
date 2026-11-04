import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { caseStatusLabel } from '../../../../core/api/document-labels';
import type { CaseStatus, CaseSummary } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatRadicado,
  remainingLabel,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-cases-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div class="px-5 py-3 bg-surface-container-low/40 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="text-label-compact text-on-surface font-medium">Expedientes activos</span>
          <span
            class="px-2 py-0.5 text-[11px] font-medium bg-surface-container-high rounded-full text-on-surface-variant"
            >{{ items().length }} registro{{ items().length === 1 ? '' : 's' }}</span
          >
        </div>
        <div class="flex items-center gap-4 text-caption text-on-surface-variant">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-primary-container"></span>
            Actualización automática
          </span>
        </div>
      </div>

      <div class="w-full overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="bg-surface-container-low/20 text-on-surface-variant text-label-compact tracking-tight h-10 select-none"
            >
              <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Radicado</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Estado</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Próximo vencimiento</th>
              <th class="py-2.5 px-4 text-right font-medium" scope="col">Providencias</th>
              <th class="py-2.5 px-4 text-right font-medium" scope="col">Correos</th>
            </tr>
          </thead>
          <tbody class="text-body-default text-on-surface">
            @for (c of items(); track c.id) {
              <tr
                class="cursor-pointer transition-colors duration-150 hover:bg-secondary-container/10 group"
                [routerLink]="['/cases', c.id]"
              >
                <td class="py-3.5 pl-6 pr-4">
                  <div class="flex items-center gap-2.5">
                    <app-material-icon
                      name="folder"
                      [size]="16"
                      className="text-outline group-hover:text-primary-container transition-colors"
                    />
                    <span
                      class="font-mono text-[13px] tracking-wide text-on-surface font-medium select-all"
                      >{{ formatRadicado(c.radicado) }}</span
                    >
                  </div>
                </td>
                <td class="py-3.5 px-4">
                  <span
                    class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-caption font-medium"
                    [class]="badgeClass(c.estado)"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" [class]="dotClass(c.estado)"></span>
                    <span>{{ caseStatusLabel(c.estado) }}</span>
                  </span>
                </td>
                <td class="py-3.5 px-4 text-on-surface-variant text-body-compact">
                  @if (c.proximo_vencimiento) {
                    <span class="text-on-surface font-medium">{{
                      formatBogotaDateTime(c.proximo_vencimiento)
                    }}</span>
                    @if (remainingLabel(c.proximo_vencimiento); as rem) {
                      <span [class]="remainingClass(c.estado)"> · {{ rem }}</span>
                    }
                  } @else {
                    <span>—</span>
                  }
                </td>
                <td class="py-3.5 px-4 text-right font-mono text-[13px]">{{ c.providencias }}</td>
                <td class="py-3.5 px-4 text-right font-mono text-[13px]">{{
                  c.mensajes_count
                }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (nextCursor()) {
        <div class="p-4 flex items-center justify-center">
          <button
            type="button"
            class="h-9 px-5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-compact font-medium transition-colors flex items-center gap-2 border-0 cursor-pointer disabled:opacity-50"
            [disabled]="loadingMore()"
            (click)="loadMore.emit()"
          >
            <app-material-icon name="expand_more" [size]="18" className="text-outline" />
            <span>{{ loadingMore() ? 'Consultando registros…' : 'Cargar más procesos' }}</span>
          </button>
        </div>
      }
    </div>
  `,
})
export class CasesTable {
  readonly formatRadicado = formatRadicado;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly remainingLabel = remainingLabel;
  readonly caseStatusLabel = caseStatusLabel;

  readonly items = input.required<ReadonlyArray<CaseSummary>>();
  readonly nextCursor = input<string | null>(null);
  readonly loadingMore = input(false);
  readonly loadMore = output<void>();

  badgeClass(estado: CaseStatus): string {
    switch (estado) {
      case 'por_vencer':
        return 'bg-amber-50 text-amber-800';
      case 'vencido':
        return 'bg-red-50 text-red-800';
      case 'en_termino':
        return 'bg-emerald-50 text-emerald-800';
      case 'respondido':
        return 'bg-teal-50 text-teal-800';
      default:
        return 'bg-zinc-100 text-zinc-700';
    }
  }

  dotClass(estado: CaseStatus): string {
    switch (estado) {
      case 'por_vencer':
        return 'bg-amber-500';
      case 'vencido':
        return 'bg-red-500';
      case 'en_termino':
        return 'bg-emerald-500';
      case 'respondido':
        return 'bg-primary-container';
      default:
        return 'bg-zinc-400';
    }
  }

  remainingClass(estado: CaseStatus): string {
    if (estado === 'vencido') return 'text-red-700';
    if (estado === 'por_vencer') return 'text-amber-700';
    return 'text-on-surface-variant';
  }
}
