import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  documentStatusLabel,
  messageReviewLabel,
  responseStatusInk,
  responseStatusLabel,
  responseStatusRail,
} from '../../../core/api/document-labels';
import type { InboxMessage } from '../../../core/api/types';
import {
  formatBogotaDateTime,
  relativeFromNow,
  remainingLabel,
} from '../../../core/utils/date-format';
import { MaterialIcon } from '../material-icon/material-icon';
import { RadicadoMark } from '../radicado-mark/radicado-mark';

/**
 * Lista de correos (bandeja y "Correos del proceso"): una fila por correo con sus adjuntos,
 * el peor estado de revisión y la respuesta más urgente. El borde marca la respuesta.
 */
@Component({
  selector: 'app-inbox-messages-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon, RadicadoMark],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
              <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Correo</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Radicado</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Adjuntos</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Estado</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Vencimiento</th>
              <th class="py-2.5 pl-4 pr-6 font-medium text-right" scope="col">Recibido</th>
            </tr>
          </thead>
          <tbody>
            @for (m of items(); track m.message_id) {
              <tr
                class="cursor-pointer border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low transition-colors"
                [routerLink]="['/bandeja', m.message_id]"
              >
                <td
                  class="py-3 pl-6 pr-4 max-w-[340px]"
                  [class]="
                    m.respuesta_estado
                      ? responseStatusRail(m.respuesta_estado)
                      : 'shadow-[inset_3px_0_0_var(--color-outline-variant)]'
                  "
                >
                  <a [routerLink]="['/bandeja', m.message_id]" class="flex flex-col no-underline min-w-0">
                    <span
                      class="text-body-default text-on-surface truncate"
                      [class.font-semibold]="m.review_status === 'unreviewed'"
                      [class.font-medium]="m.review_status !== 'unreviewed'"
                      [title]="m.correo.asunto || ''"
                      >{{ m.correo.asunto || '(Sin asunto)' }}</span
                    >
                    <span class="text-caption text-on-surface-variant truncate" [title]="m.correo.remitente || ''">{{
                      m.correo.remitente || 'Remitente desconocido'
                    }}</span>
                  </a>
                </td>
                <td class="py-3 px-4">
                  <span class="inline-flex items-center gap-1.5">
                    @if (m.caso.radicado; as r) {
                      <app-radicado-mark [value]="r" size="md" />
                    } @else {
                      <span class="text-body-compact text-on-surface-variant">Sin clasificar</span>
                    }
                    @if (m.caso.radicado_conflicto) {
                      <span title="Radicados distintos: revisar" aria-label="Radicados distintos: revisar">
                        <app-material-icon name="warning" [size]="16" className="text-tertiary" />
                      </span>
                    }
                  </span>
                </td>
                <td class="py-3 px-4">
                  @if (m.documentos_count > 0) {
                    <span
                      class="inline-flex items-center gap-1 text-body-compact text-on-surface"
                      [title]="filenames(m)"
                    >
                      <app-material-icon name="attach_file" [size]="16" className="text-on-surface-variant" />
                      {{ m.documentos_count }}
                    </span>
                  } @else {
                    <span class="text-caption text-on-surface-variant">Sin adjuntos</span>
                  }
                </td>
                <td class="py-3 px-4 text-body-compact whitespace-nowrap">
                  @if (m.documentos_count === 0) {
                    <span class="text-on-surface-variant">—</span>
                  } @else {
                    <span class="flex flex-col gap-0.5">
                      @if (m.document_status && m.document_status !== 'extracted') {
                        <span class="text-on-surface-variant">{{ documentStatusLabel(m.document_status) }}</span>
                      } @else if (m.review_status === 'unreviewed') {
                        <span class="inline-flex items-center gap-1.5 text-primary font-medium">
                          <span class="w-2 h-2 rounded-full bg-primary"></span>
                          Por revisar
                        </span>
                      } @else if (m.review_status) {
                        <span class="inline-flex items-center gap-1 text-on-surface-variant">
                          <app-material-icon name="check" [size]="15" />
                          {{ messageReviewLabel(m.review_status) }}
                        </span>
                      }
                      @if (m.sugerido_ia) {
                        <span
                          class="inline-flex items-center gap-1 text-caption text-on-surface-variant"
                          title="Algún documento tiene campos sugeridos por IA"
                        >
                          <app-material-icon name="auto_awesome" [size]="13" />
                          Sugerido por IA
                        </span>
                      }
                    </span>
                  }
                </td>
                <td class="py-3 px-4">
                  @if (m.respuesta_estado; as re) {
                    <span class="block text-body-compact" [class]="responseStatusInk(re)">{{
                      responseStatusLabel(re, null)
                    }}</span>
                    @if (m.proximo_vencimiento) {
                      <span
                        class="block text-caption text-on-surface-variant"
                        [title]="formatBogotaDateTime(m.proximo_vencimiento)"
                        >{{ remainingLabel(m.proximo_vencimiento) || formatBogotaDateTime(m.proximo_vencimiento) }}</span
                      >
                    }
                  } @else {
                    <span class="text-body-compact text-on-surface-variant">—</span>
                  }
                </td>
                <td class="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                  <time
                    class="text-caption text-on-surface-variant"
                    [attr.title]="formatBogotaDateTime(m.correo.recibido_at)"
                    >{{ receivedOf(m) }}</time
                  >
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
            {{ loadingMore() ? 'Cargando correos…' : 'Cargar más correos' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class InboxMessagesTable {
  readonly documentStatusLabel = documentStatusLabel;
  readonly messageReviewLabel = messageReviewLabel;
  readonly responseStatusLabel = responseStatusLabel;
  readonly responseStatusRail = responseStatusRail;
  readonly responseStatusInk = responseStatusInk;
  readonly remainingLabel = remainingLabel;
  readonly formatBogotaDateTime = formatBogotaDateTime;

  readonly items = input.required<ReadonlyArray<InboxMessage>>();
  readonly nextCursor = input<string | null>(null);
  readonly loadingMore = input(false);
  readonly loadMore = output<void>();

  filenames(m: InboxMessage): string {
    return m.documentos.map((d) => d.filename).join('\n');
  }

  receivedOf(m: InboxMessage): string {
    const iso = m.correo.recibido_at;
    if (!iso) return '—';
    return relativeFromNow(iso) || formatBogotaDateTime(iso);
  }
}
