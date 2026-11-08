import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { documentsApi } from '../../../../core/api/endpoints';
import { TIPO_DOCUMENTO } from '../../../../core/api/ficha-labels';
import type {
  DocumentDetail,
  DocumentoFuente,
  MessageDetail,
  PageText,
} from '../../../../core/api/types';
import { formatBogotaDateTime, formatBytes } from '../../../../core/utils/date-format';
import { ToastService } from '../../../../core/services/toast.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { ToneBadge } from '../../../../shared/components/tone-badge/tone-badge';
import { PdfViewer } from '../../../providencia-review/components/pdf-viewer/pdf-viewer';

interface LoadedPdf {
  blob: Blob;
  data: ArrayBuffer;
  texts: PageText[];
}

/**
 * Todos los documentos del correo en un solo lugar: la lista de archivos (con tipo, páginas y
 * respuesta) y el visor del que se esté mirando. El cuerpo del correo también se puede leer aquí.
 */
@Component({
  selector: 'app-message-documents-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, ToneBadge, PdfViewer],
  template: `
    <div class="flex flex-col gap-3">
      <div class="bg-surface-container-lowest rounded-xl shadow-sm p-3 flex flex-col gap-1">
        <h3 class="m-0 px-1 pb-1 text-label-default font-semibold text-on-surface">
          Documentos del correo ({{ documentos().length }})
        </h3>
        @for (d of documentos(); track d.attachment_id; let i = $index) {
          <div
            class="flex items-center gap-3 rounded-lg px-2 py-2 cursor-pointer"
            [class]="d.attachment_id === selectedId() ? 'bg-primary/10' : 'hover:bg-surface-container-low'"
            role="button"
            tabindex="0"
            (click)="selectDoc.emit(d.attachment_id)"
            (keydown.enter)="selectDoc.emit(d.attachment_id)"
          >
            <app-material-icon name="picture_as_pdf" [size]="20" className="text-error shrink-0" />
            <div class="flex flex-col min-w-0 flex-1">
              <span class="text-body-compact text-on-surface truncate" [title]="d.filename">{{ d.filename }}</span>
              <span class="text-caption text-on-surface-variant">
                {{ tipo(d.attachment_id) }} · {{ d.page_count ?? '—' }} pág. · {{ size(d.attachment_id) }}
              </span>
            </div>
            @if (d.respuesta_estado === 'pendiente' || d.respuesta_estado === 'vencido_sin_respuesta') {
              <button
                type="button"
                class="shrink-0 h-7 px-2 rounded-md border border-outline-variant bg-transparent text-caption text-on-surface cursor-pointer hover:bg-surface-container"
                [title]="d.vence_at ? 'Vence ' + formatDate(d.vence_at) : ''"
                (click)="$event.stopPropagation(); recordResponse.emit(d.attachment_id)"
              >
                Registrar respuesta
              </button>
            } @else if (d.respuesta_estado === 'respondido') {
              <app-tone-badge tone="success">Respondido</app-tone-badge>
            }
            @if (d.document_status === 'pending') {
              <app-tone-badge tone="info">Procesando</app-tone-badge>
            } @else if (d.document_status === 'failed' || d.document_status === 'needs_ocr') {
              <app-tone-badge tone="danger">Sin texto</app-tone-badge>
            }
          </div>
        }
        @if (body()) {
          <button
            type="button"
            class="flex items-center gap-3 rounded-lg px-2 py-2 border-0 text-left cursor-pointer"
            [class]="showBody() ? 'bg-primary/10' : 'bg-transparent hover:bg-surface-container-low'"
            (click)="showBody.set(!showBody())"
          >
            <app-material-icon name="mail" [size]="20" className="text-primary shrink-0" />
            <span class="text-body-compact text-on-surface">Cuerpo del correo</span>
          </button>
        }
      </div>

      @if (showBody() && body(); as text) {
        <pre
          class="m-0 bg-surface-container-lowest rounded-xl shadow-sm p-4 max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-body-compact text-on-surface font-sans"
        >{{ text }}</pre>
      }

      @if (selected(); as d) {
        <app-pdf-viewer
          [pdfData]="pdf()?.data ?? null"
          [pageTexts]="pdf()?.texts ?? []"
          [currentPage]="page()"
          [zoom]="zoom()"
          [extractorVersion]="d.extractor_version"
          [pageCountHint]="d.page_count"
          (pageChange)="pageChange.emit($event)"
          (zoomChange)="zoom.set(clampZoom(zoom() + $event))"
          (download)="download(d)"
        />
      }
    </div>
  `,
})
export class MessageDocumentsPanel {
  private readonly toast = inject(ToastService);

  readonly documentos = input.required<DocumentDetail[]>();
  /** Tipos que asignó el análisis unificado a cada adjunto. */
  readonly fuentes = input<DocumentoFuente[]>([]);
  readonly rawMessage = input<MessageDetail | null>(null);
  readonly selectedId = input<string | null>(null);
  readonly page = input(1);

  readonly selectDoc = output<string>();
  readonly pageChange = output<number>();
  readonly recordResponse = output<string>();

  readonly zoom = signal(100);
  readonly showBody = signal(false);
  private readonly cache = signal<Record<string, LoadedPdf>>({});
  private readonly loading = new Set<string>();

  readonly formatDate = formatBogotaDateTime;

  readonly selected = computed(
    () => this.documentos().find((d) => d.attachment_id === this.selectedId()) ?? this.documentos()[0] ?? null,
  );
  readonly pdf = computed(() => {
    const d = this.selected();
    return d ? (this.cache()[d.attachment_id] ?? null) : null;
  });
  readonly body = computed(() => this.rawMessage()?.body_text?.trim() || null);

  constructor() {
    effect(() => {
      const d = this.selected();
      if (d) untracked(() => void this.load(d));
    });
  }

  tipo(attachmentId: string): string {
    const f = this.fuentes().find((x) => x.attachment_id === attachmentId);
    return f ? TIPO_DOCUMENTO[f.tipo_documento] : 'Documento';
  }

  size(attachmentId: string): string {
    const a = this.rawMessage()?.attachments.find((x) => x.id === attachmentId);
    return a ? formatBytes(a.size_bytes) : '—';
  }

  clampZoom(z: number): number {
    return Math.min(Math.max(z, 60), 160);
  }

  private async load(d: DocumentDetail): Promise<void> {
    if (this.cache()[d.attachment_id] || this.loading.has(d.attachment_id)) return;
    this.loading.add(d.attachment_id);
    try {
      const [blob, texts] = await Promise.all([
        documentsApi.pdf(d),
        documentsApi.text(d.attachment_id).catch(() => [] as PageText[]),
      ]);
      const data = await blob.arrayBuffer();
      this.cache.update((c) => ({ ...c, [d.attachment_id]: { blob, data, texts } }));
    } catch {
      this.toast.push({ type: 'error', title: 'No se pudo cargar el PDF', description: '' });
    } finally {
      this.loading.delete(d.attachment_id);
    }
  }

  download(d: DocumentDetail): void {
    const blob = this.cache()[d.attachment_id]?.blob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = d.filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
