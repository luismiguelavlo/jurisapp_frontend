import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  providenciaTitle,
  responseStatusInk,
  responseStatusLabel,
  responseStatusRail,
  reviewStatusLabel,
} from '../../../../core/api/document-labels';
import type { DocumentItem } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  relativeFromNow,
  remainingLabel,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { RadicadoMark } from '../../../../shared/components/radicado-mark/radicado-mark';

/**
 * Bandeja de providencias: qué llegó, de qué proceso, si ya se revisó y si exige respuesta.
 * El borde de la fila marca el estado de la respuesta.
 */
@Component({
  selector: 'app-documents-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon, RadicadoMark],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse min-w-[860px]">
          <thead>
            <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
              <th class="py-2.5 pl-6 pr-4 font-medium" scope="col">Providencia</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Radicado</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Revisión</th>
              <th class="py-2.5 px-4 font-medium" scope="col">Respuesta</th>
              <th class="py-2.5 pl-4 pr-6 font-medium text-right" scope="col">Recibida</th>
            </tr>
          </thead>
          <tbody>
            @for (doc of items(); track doc.attachment_id) {
              <tr
                class="cursor-pointer border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low transition-colors"
                [routerLink]="['/documents', doc.attachment_id]"
              >
                <td class="py-3 pl-6 pr-4 max-w-[320px]" [class]="responseStatusRail(doc.respuesta_estado)">
                  <a
                    [routerLink]="['/documents', doc.attachment_id]"
                    class="flex flex-col no-underline min-w-0"
                  >
                    <span
                      class="text-body-default text-on-surface"
                      [class.font-semibold]="doc.review_status === 'unreviewed'"
                      [class.font-medium]="doc.review_status !== 'unreviewed'"
                      >{{ tipoOf(doc) }}</span
                    >
                    <span class="text-caption text-on-surface-variant truncate" [title]="doc.filename">{{
                      doc.filename
                    }}</span>
                  </a>
                </td>
                <td class="py-3 px-4">
                  @if (radicadoOf(doc); as r) {
                    <app-radicado-mark [value]="r" size="md" />
                  } @else {
                    <span class="text-body-compact text-on-surface-variant">Sin radicado</span>
                  }
                </td>
                <td class="py-3 px-4 text-body-compact whitespace-nowrap">
                  @if (doc.review_status === 'unreviewed') {
                    <span class="inline-flex items-center gap-1.5 text-primary font-medium">
                      <span class="w-2 h-2 rounded-full bg-primary"></span>
                      Sin revisar
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1 text-on-surface-variant">
                      <app-material-icon name="check" [size]="15" />
                      {{ reviewStatusLabel(doc.review_status) }}
                    </span>
                  }
                </td>
                <td class="py-3 px-4">
                  <span class="block text-body-compact" [class]="responseStatusInk(doc.respuesta_estado)">{{
                    responseStatusLabel(doc.respuesta_estado, doc.a_tiempo)
                  }}</span>
                  @if (doc.respuesta_estado === 'pendiente' && doc.vence_at) {
                    <span class="block text-caption text-on-surface-variant">{{
                      remainingLabel(doc.vence_at)
                    }}</span>
                  }
                </td>
                <td class="py-3 pl-4 pr-6 text-right whitespace-nowrap">
                  <time
                    class="text-caption text-on-surface-variant"
                    [attr.title]="formatBogotaDateTime(doc.correo.recibido_at)"
                    >{{ receivedOf(doc) }}</time
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
            {{ loadingMore() ? 'Cargando providencias…' : 'Cargar más providencias' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class DocumentsTable {
  readonly reviewStatusLabel = reviewStatusLabel;
  readonly responseStatusLabel = responseStatusLabel;
  readonly remainingLabel = remainingLabel;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly responseStatusRail = responseStatusRail;
  readonly responseStatusInk = responseStatusInk;

  readonly items = input.required<ReadonlyArray<DocumentItem>>();
  readonly nextCursor = input<string | null>(null);
  readonly loadingMore = input(false);
  readonly loadMore = output<void>();

  radicadoOf(doc: DocumentItem): string | null {
    return doc.fields?.radicado?.valor?.normalizado ?? null;
  }

  tipoOf(doc: DocumentItem): string {
    const t = doc.fields?.tipo_providencia?.valor;
    return t ? providenciaTitle(t.clase, t.subtipo) : 'Providencia sin clasificar';
  }

  receivedOf(doc: DocumentItem): string {
    const iso = doc.correo.recibido_at;
    if (!iso) return '—';
    return relativeFromNow(iso) || formatBogotaDateTime(iso);
  }

}
