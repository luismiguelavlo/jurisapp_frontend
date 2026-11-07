import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  providenciaTitle,
  responseStatusInk,
  responseStatusLabel,
  responseStatusRail,
} from '../../../../core/api/document-labels';
import { UNIDAD_TERMINO } from '../../../../core/api/ficha-labels';
import type { TimelineEntry } from '../../../../core/api/types';
import {
  formatBogotaDate,
  formatBogotaDateTime,
  remainingLabel,
} from '../../../../core/utils/date-format';

/**
 * Línea de tiempo del proceso: una entrada por providencia notificada, con su término
 * y el estado de la respuesta. Es la que manda para los vencimientos.
 */
@Component({
  selector: 'app-case-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="bg-surface-container-lowest rounded-xl shadow-sm px-5 sm:px-8 py-6 flex flex-col gap-4">
      <header class="flex flex-col gap-1">
        <h2 class="m-0 text-headline-sm text-on-surface">Línea de tiempo</h2>
        <p class="m-0 text-caption text-on-surface-variant">
          Las providencias en el orden en que fueron notificadas. Aquí se cuentan los vencimientos.
        </p>
      </header>
      @if (entries().length === 0) {
        <p class="m-0 text-body-default text-on-surface-variant">
          Este proceso todavía no tiene providencias notificadas.
        </p>
      } @else {
        <ol class="m-0 p-0 list-none flex flex-col gap-1">
          @for (item of entries(); track item.attachment_id) {
            <li>
              <a
                class="grid grid-cols-1 sm:grid-cols-[120px_minmax(0,1fr)_auto] gap-x-4 gap-y-1 py-3 pl-4 pr-2 rounded-r-[4px] no-underline text-inherit hover:bg-surface-container-low"
                [class]="responseStatusRail(item.respuesta_estado)"
                [routerLink]="['/documents', item.attachment_id]"
              >
                <div class="flex flex-col">
                  <time class="text-body-default font-semibold text-on-surface">{{
                    formatBogotaDate(item.notified_at)
                  }}</time>
                  <span class="text-caption text-on-surface-variant">Notificada</span>
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-body-default font-medium text-on-surface">{{
                    providenciaTitle(item.clase, item.subtipo)
                  }}</span>
                  <span class="text-caption text-on-surface-variant truncate">
                    {{ item.juzgado || item.filename }}
                  </span>
                  @if (item.termino) {
                    <span class="text-caption text-on-surface-variant">{{ terminoTexto(item) }}</span>
                  }
                </div>
                <div class="flex flex-col sm:items-end">
                  <span class="text-body-compact" [class]="responseStatusInk(item.respuesta_estado)">{{
                    responseStatusLabel(item.respuesta_estado, item.a_tiempo)
                  }}</span>
                  @if (item.respuesta_estado === 'pendiente' && item.vence_at) {
                    <span class="text-caption text-on-surface-variant">{{
                      remainingLabel(item.vence_at)
                    }}</span>
                  }
                </div>
              </a>
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class CaseTimeline {
  readonly entries = input.required<TimelineEntry[]>();
  readonly formatBogotaDate = formatBogotaDate;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly remainingLabel = remainingLabel;
  readonly providenciaTitle = providenciaTitle;
  readonly responseStatusLabel = responseStatusLabel;
  readonly responseStatusRail = responseStatusRail;
  readonly responseStatusInk = responseStatusInk;

  terminoTexto(item: TimelineEntry): string {
    const t = item.termino;
    if (!t) return '';
    const base = 'Término de ' + t.cantidad + ' ' + UNIDAD_TERMINO[t.unidad];
    return item.vence_at ? base + ', vence el ' + formatBogotaDateTime(item.vence_at) : base;
  }
}
