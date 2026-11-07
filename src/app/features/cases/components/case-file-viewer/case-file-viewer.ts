import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import * as pdfjs from 'pdfjs-dist';
import { ApiError } from '../../../../core/api/client';
import { caseFilesApi } from '../../../../core/api/endpoints';
import { errorText } from '../../../../core/api/errors';
import type { CaseFolderItem } from '../../../../core/api/types';
import { formatBytes } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { itemDisplayName, itemOrigenLabel, itemTypeLabel } from '../../models/case-files.models';

// El builder no empaqueta `new URL(...)`: angular.json copia el worker a /pdfjs.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

@Component({
  selector: 'app-case-file-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="fixed inset-0 z-[120] flex justify-end bg-black/40" (click)="close.emit()">
      <aside
        class="w-full max-w-[560px] h-full bg-surface-container-lowest shadow-xl flex flex-col"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <header
          class="h-14 px-4 border-b border-outline-variant/30 flex items-center justify-between gap-3 shrink-0"
        >
          <div class="min-w-0">
            <p class="font-headline-sm text-headline-sm text-on-surface m-0 truncate">
              {{ itemDisplayName(item()) }}
            </p>
            <p class="font-caption text-caption text-on-surface-variant m-0">
              {{ itemTypeLabel(item()) }}
              @if (item().size_bytes != null) {
                · {{ formatBytes(item().size_bytes) }}
              }
              · {{ itemOrigenLabel(item().kind) }}
            </p>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="px-2 py-1.5 rounded-lg font-label-compact text-label-compact text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer flex items-center gap-1"
              (click)="download.emit()"
            >
              <app-material-icon name="download" [size]="16" />
              Descargar
            </button>
            <button
              type="button"
              class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
              (click)="close.emit()"
              aria-label="Cerrar"
            >
              <app-material-icon name="close" [size]="18" />
            </button>
          </div>
        </header>

        @if (mode() === 'pdf' && !loading() && !error()) {
          <div
            class="h-10 px-3 bg-surface-container-low flex items-center justify-between text-on-surface-variant shrink-0 border-b border-outline-variant/20"
          >
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer disabled:opacity-40"
                [disabled]="page() <= 1"
                (click)="goPage(page() - 1)"
              >
                <app-material-icon name="chevron_left" [size]="16" />
              </button>
              <span class="font-caption text-caption text-on-surface px-1"
                >Página {{ page() }} de {{ pageCount() }}</span
              >
              <button
                type="button"
                class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer disabled:opacity-40"
                [disabled]="page() >= pageCount()"
                (click)="goPage(page() + 1)"
              >
                <app-material-icon name="chevron_right" [size]="16" />
              </button>
            </div>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer"
                (click)="zoomBy(-10)"
              >
                <app-material-icon name="zoom_out" [size]="16" />
              </button>
              <span class="font-caption text-caption w-10 text-center">{{ zoom() }}%</span>
              <button
                type="button"
                class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer"
                (click)="zoomBy(10)"
              >
                <app-material-icon name="zoom_in" [size]="16" />
              </button>
            </div>
          </div>
        }

        <div class="flex-1 overflow-auto p-4 bg-surface-container-low/40">
          @if (loading()) {
            <p class="font-body-default text-on-surface-variant m-0">Abriendo archivo…</p>
          } @else if (error()) {
            <div class="flex flex-col gap-3">
              <div class="rounded-lg bg-[#FEF2F2] text-[#991B1B] px-3 py-2 font-caption text-caption">
                {{ error() }}
              </div>
              <button
                type="button"
                class="self-start bg-primary-container text-on-primary px-3 py-1.5 rounded-lg font-label-default border-0 cursor-pointer"
                (click)="download.emit()"
              >
                Descargar de todas formas
              </button>
            </div>
          } @else if (mode() === 'pdf') {
            <div class="flex justify-center bg-[#E4E4E7] rounded-lg p-2 min-h-[50vh]">
              <canvas #pdfCanvas class="max-w-full shadow-sm bg-white"></canvas>
            </div>
          } @else if (mode() === 'image' && objectUrl()) {
            <img
              class="max-w-full mx-auto rounded-lg"
              [src]="objectUrl()!"
              [alt]="itemDisplayName(item())"
            />
          } @else if (mode() === 'text') {
            <p class="font-caption text-caption text-on-surface-variant m-0 mb-2">
              Texto plano del correo
            </p>
            <pre
              class="m-0 p-3 rounded-lg bg-surface-container-lowest text-body-compact text-on-surface whitespace-pre-wrap break-words font-sans"
              >{{ text() }}</pre
            >
          } @else {
            <div class="flex flex-col items-start gap-3 py-8">
              <p class="font-body-default text-on-surface-variant m-0">
                Este tipo de archivo no se previsualiza.
              </p>
              <button
                type="button"
                class="bg-primary-container text-on-primary px-3 py-1.5 rounded-lg font-label-default border-0 cursor-pointer"
                (click)="download.emit()"
              >
                Descargar
              </button>
            </div>
          }
        </div>
      </aside>
    </div>
  `,
})
export class CaseFileViewer implements OnDestroy {
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('pdfCanvas');
  private pdfDoc: pdfjs.PDFDocumentProxy | null = null;
  private loadGen = 0;

  readonly item = input.required<CaseFolderItem>();
  /** Página a mostrar al abrir un PDF (p. ej. la de una fuente de la ficha). */
  readonly initialPage = input(1);
  readonly close = output<void>();
  readonly download = output<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mode = signal<'pdf' | 'image' | 'text' | 'none'>('none');
  readonly objectUrl = signal<string | null>(null);
  readonly text = signal('');
  readonly page = signal(1);
  readonly pageCount = signal(0);
  readonly zoom = signal(100);

  readonly itemDisplayName = itemDisplayName;
  readonly itemTypeLabel = itemTypeLabel;
  readonly itemOrigenLabel = itemOrigenLabel;
  readonly formatBytes = formatBytes;

  constructor() {
    effect(() => {
      const current = this.item();
      void this.load(current);
    });

    effect(() => {
      const page = this.page();
      const zoom = this.zoom();
      const mode = this.mode();
      const busy = this.loading();
      if (!busy && mode === 'pdf' && this.pdfDoc) {
        void this.renderPage(page, zoom);
      }
    });
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  goPage(n: number): void {
    const max = this.pageCount();
    if (n < 1 || n > max) return;
    this.page.set(n);
  }

  zoomBy(delta: number): void {
    this.zoom.update((z) => Math.min(200, Math.max(50, z + delta)));
  }

  private cleanup(): void {
    const url = this.objectUrl();
    if (url) URL.revokeObjectURL(url);
    this.objectUrl.set(null);
    const doc = this.pdfDoc;
    this.pdfDoc = null;
    if (doc) {
      void doc.destroy();
    }
  }

  private async load(item: CaseFolderItem): Promise<void> {
    const gen = ++this.loadGen;
    this.loading.set(true);
    this.error.set(null);
    this.cleanup();
    this.text.set('');
    this.mode.set('none');
    this.page.set(1);
    this.pageCount.set(0);
    this.zoom.set(100);

    try {
      const blob = await caseFilesApi.content(item.id);
      if (gen !== this.loadGen) return;

      const type = itemTypeLabel(item);
      const filename = (item.filename ?? '').toLowerCase();
      const isPdf =
        item.kind !== 'cuerpo' &&
        (type === 'PDF' || blob.type === 'application/pdf' || filename.endsWith('.pdf'));

      if (item.kind === 'cuerpo') {
        this.text.set(await blob.text());
        this.mode.set('text');
        return;
      }

      if (isPdf) {
        const data = await blob.arrayBuffer();
        if (gen !== this.loadGen) return;
        this.pdfDoc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
        if (gen !== this.loadGen) return;
        this.pageCount.set(this.pdfDoc.numPages);
        this.page.set(Math.min(Math.max(1, untracked(this.initialPage)), this.pdfDoc.numPages));
        this.mode.set('pdf');
        return;
      }

      if (type === 'JPG' || type === 'PNG' || blob.type.startsWith('image/')) {
        this.objectUrl.set(URL.createObjectURL(blob));
        this.mode.set('image');
        return;
      }

      this.mode.set('none');
    } catch (e) {
      if (gen !== this.loadGen) return;
      this.error.set(this.mapOpenError(e));
    } finally {
      if (gen === this.loadGen) this.loading.set(false);
    }
  }

  private async renderPage(pageNum: number, zoomPct: number): Promise<void> {
    if (!this.pdfDoc) return;
    await Promise.resolve();
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) {
      requestAnimationFrame(() => {
        void this.renderPage(pageNum, zoomPct);
      });
      return;
    }
    try {
      const page = await this.pdfDoc.getPage(Math.min(pageNum, this.pdfDoc.numPages));
      const viewport = page.getViewport({ scale: (zoomPct / 100) * 1.2 });
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch {
      this.error.set('No se pudo renderizar el PDF');
    }
  }

  private mapOpenError(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.status === 404) return 'El documento ya no existe';
      if (e.code === 'blob_store_unavailable' || e.status === 503) {
        return 'No se pudo abrir el archivo. Intenta más tarde.';
      }
      return errorText(e.code);
    }
    return 'No se pudo abrir el archivo. Intenta más tarde.';
  }
}
