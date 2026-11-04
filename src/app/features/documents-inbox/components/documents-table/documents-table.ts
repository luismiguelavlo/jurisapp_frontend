import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  documentStatusLabel,
  providenciaTitle,
  responseStatusLabel,
  reviewStatusLabel,
} from '../../../../core/api/document-labels';
import type { DocumentItem } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatRadicado,
  relativeFromNow,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-documents-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <div class="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="h-9 bg-surface-container-low text-on-surface-variant text-label-compact">
              <th class="px-space-md font-medium" scope="col">Archivo / Radicado</th>
              <th class="px-space-md font-medium" scope="col">Tipo</th>
              <th class="px-space-md font-medium" scope="col">Extracción</th>
              <th class="px-space-md font-medium" scope="col">Revisión</th>
              <th class="px-space-md font-medium" scope="col">Respuesta</th>
              <th class="px-space-md font-medium" scope="col">Recibido</th>
              <th class="px-space-md font-medium text-right" scope="col"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container">
            @for (doc of items(); track doc.attachment_id) {
              <tr class="h-12 hover:bg-surface-container-low/60 transition-colors">
                <td class="px-space-md py-2.5">
                  <a
                    [routerLink]="['/documents', doc.attachment_id]"
                    class="flex flex-col gap-0.5 no-underline"
                  >
                    <span class="text-body-medium text-on-surface hover:underline truncate max-w-[280px]">
                      {{ doc.filename }}
                    </span>
                    <span class="font-mono text-caption text-on-surface-variant">
                      {{ radicadoOf(doc) }}
                    </span>
                  </a>
                </td>
                <td class="px-space-md py-2.5 text-body-compact text-on-surface">
                  {{ tipoOf(doc) }}
                </td>
                <td class="px-space-md py-2.5">
                  <span class="text-caption font-medium" [class]="statusClass(doc.document_status)">
                    {{ documentStatusLabel(doc.document_status) }}
                  </span>
                </td>
                <td class="px-space-md py-2.5">
                  <span class="text-caption font-medium">{{
                    reviewStatusLabel(doc.review_status)
                  }}</span>
                </td>
                <td class="px-space-md py-2.5 text-caption">
                  {{ responseStatusLabel(doc.respuesta_estado, doc.a_tiempo) }}
                </td>
                <td class="px-space-md py-2.5 text-caption text-on-surface-variant">
                  {{ receivedOf(doc) }}
                </td>
                <td class="px-space-md py-2.5 text-right">
                  <a
                    [routerLink]="['/documents', doc.attachment_id]"
                    class="inline-flex items-center gap-1 text-primary text-caption font-medium no-underline hover:underline"
                  >
                    Abrir
                    <app-material-icon name="arrow_forward" [size]="14" />
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (nextCursor()) {
        <div class="p-space-sm border-t border-surface-container flex justify-center">
          <button
            type="button"
            class="h-9 px-4 rounded-[6px] bg-surface-container text-on-surface text-label-default border-0 cursor-pointer hover:bg-surface-container-high"
            [disabled]="loadingMore()"
            (click)="loadMore.emit()"
          >
            {{ loadingMore() ? 'Cargando…' : 'Cargar más' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class DocumentsTable {
  readonly documentStatusLabel = documentStatusLabel;
  readonly reviewStatusLabel = reviewStatusLabel;
  readonly responseStatusLabel = responseStatusLabel;

  readonly items = input.required<ReadonlyArray<DocumentItem>>();
  readonly nextCursor = input<string | null>(null);
  readonly loadingMore = input(false);
  readonly loadMore = output<void>();

  radicadoOf(doc: DocumentItem): string {
    const n = doc.fields?.radicado?.valor?.normalizado;
    return n ? formatRadicado(n) : 'Sin radicado';
  }

  tipoOf(doc: DocumentItem): string {
    const t = doc.fields?.tipo_providencia?.valor;
    if (!t) return '—';
    return providenciaTitle(t.clase, t.subtipo);
  }

  receivedOf(doc: DocumentItem): string {
    const iso = doc.correo.recibido_at;
    if (!iso) return '—';
    return relativeFromNow(iso) || formatBogotaDateTime(iso);
  }

  statusClass(status: DocumentItem['document_status']): string {
    if (status === 'extracted') return 'text-[#15803D]';
    if (status === 'failed') return 'text-[#991B1B]';
    if (status === 'needs_ocr' || status === 'pending') return 'text-[#92400E]';
    return 'text-on-surface-variant';
  }
}
