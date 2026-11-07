import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  claseLabel,
  documentStatusLabel,
  messageReviewLabel,
} from '../../../../core/api/document-labels';
import type { Clase, InboxDocumentSummary } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Una pestaña por documento del correo, en el orden en que vienen. */
@Component({
  selector: 'app-message-document-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="flex gap-1 overflow-x-auto border-b border-outline-variant/30" role="tablist">
      @for (d of documentos(); track d.attachment_id; let i = $index) {
        <button
          type="button"
          role="tab"
          class="relative shrink-0 max-w-[260px] flex flex-col items-start gap-0.5 px-3 py-2 border-0 bg-transparent cursor-pointer text-left"
          [class]="
            selectedId() === d.attachment_id
              ? 'text-primary-container'
              : 'text-on-surface-variant hover:text-on-surface'
          "
          [attr.aria-selected]="selectedId() === d.attachment_id"
          (click)="select.emit(d.attachment_id)"
        >
          <span class="inline-flex items-center gap-1.5 text-label-default max-w-full">
            @if (d.review_status === 'unreviewed' && d.document_status === 'extracted') {
              <span class="w-2 h-2 rounded-full bg-primary shrink-0" title="Por revisar"></span>
            }
            <app-material-icon name="picture_as_pdf" [size]="15" />
            <span class="truncate" [title]="d.filename">{{ d.filename }}</span>
          </span>
          <span class="text-caption text-on-surface-variant">
            {{ i + 1 }}. {{ subtitle(d) }}
          </span>
          @if (selectedId() === d.attachment_id) {
            <span class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary-container rounded-full"></span>
          }
        </button>
      }
    </div>
  `,
})
export class MessageDocumentTabs {
  readonly documentos = input.required<ReadonlyArray<InboxDocumentSummary>>();
  readonly selectedId = input<string | null>(null);
  readonly select = output<string>();

  subtitle(d: InboxDocumentSummary): string {
    if (d.document_status !== 'extracted') return documentStatusLabel(d.document_status);
    const clase = d.clase_providencia ? claseLabel(d.clase_providencia as Clase) : 'Sin clasificar';
    return `${clase} · ${messageReviewLabel(d.review_status)}`;
  }
}
