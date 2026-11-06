import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { PageText } from '../../../../core/api/types';
import * as pdfjs from 'pdfjs-dist';

// El builder no empaqueta `new URL(...)`: angular.json copia el worker a /pdfjs.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';

@Component({
  selector: 'app-pdf-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="bg-surface-container-lowest rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div
        class="h-10 px-space-xs bg-surface-container-low flex items-center justify-between text-on-surface-variant"
      >
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer disabled:opacity-40"
            title="Página anterior"
            [disabled]="currentPage() <= 1"
            (click)="pageChange.emit(currentPage() - 1)"
          >
            <app-material-icon name="chevron_left" [size]="16" />
          </button>
          <span class="text-caption font-medium px-1 text-on-surface"
            >Pág. {{ currentPage() }} de {{ pageCount() || '…' }}</span
          >
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer disabled:opacity-40"
            title="Página siguiente"
            [disabled]="!pageCount() || currentPage() >= pageCount()"
            (click)="pageChange.emit(currentPage() + 1)"
          >
            <app-material-icon name="chevron_right" [size]="16" />
          </button>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            title="Alejar"
            (click)="zoomChange.emit(-10)"
          >
            <app-material-icon name="zoom_out" [size]="16" />
          </button>
          <span class="text-caption w-10 text-center">{{ zoom() }}%</span>
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            title="Acercar"
            (click)="zoomChange.emit(10)"
          >
            <app-material-icon name="zoom_in" [size]="16" />
          </button>
          <button
            type="button"
            class="p-1 rounded hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            title="Descargar"
            (click)="download.emit()"
          >
            <app-material-icon name="download" [size]="16" />
          </button>
        </div>
      </div>

      <div class="flex h-[760px] bg-[#E4E4E7] overflow-hidden">
        <div class="w-20 bg-surface-container-lowest shrink-0 p-2 flex flex-col gap-2 overflow-y-auto">
          @for (p of pageNumbers(); track p) {
            <button
              type="button"
              class="cursor-pointer p-1 rounded flex flex-col gap-1 items-center border-0"
              [class]="
                currentPage() === p
                  ? 'bg-[#F0FDFA] ring-1 ring-primary'
                  : 'bg-transparent hover:bg-surface-container-low'
              "
              (click)="pageChange.emit(p)"
            >
              <div
                class="w-14 h-20 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1)] flex items-center justify-center text-[10px] text-on-surface-variant"
              >
                {{ p }}
              </div>
              <span class="text-[10px] font-medium text-on-surface">Pág {{ p }}</span>
              @if (badgeFor(p); as badge) {
                <span
                  class="inline-flex items-center gap-0.5 px-1 rounded text-[9px] font-medium"
                  [class]="badge.className"
                  >{{ badge.label }}</span
                >
              }
            </button>
          }
        </div>

        <div class="flex-1 overflow-auto p-4 flex justify-center items-start">
          @if (loading()) {
            <p class="text-caption text-on-surface-variant">Cargando PDF…</p>
          } @else if (error()) {
            <p class="text-caption text-error">{{ error() }}</p>
          }
          <canvas #canvas class="bg-white shadow-md max-w-full" [class.hidden]="loading() || !!error()"></canvas>
        </div>
      </div>

      <div
        class="px-space-sm py-1.5 bg-surface-container-low text-caption text-on-surface-variant flex items-center justify-between"
      >
        <span>{{ extractorVersion() || 'Documento judicial' }}</span>
        <button
          type="button"
          class="text-primary hover:underline flex items-center gap-0.5 text-xs border-0 bg-transparent cursor-pointer"
          (click)="locateField.emit()"
        >
          <span>Localizar campo activo</span>
          <app-material-icon name="my_location" [size]="14" />
        </button>
      </div>
    </div>
  `,
})
export class PdfViewer implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private pdfDoc: pdfjs.PDFDocumentProxy | null = null;
  private viewReady = false;

  readonly pdfData = input<ArrayBuffer | null>(null);
  readonly pageTexts = input<ReadonlyArray<PageText>>([]);
  readonly currentPage = input(1);
  readonly zoom = input(100);
  readonly extractorVersion = input<string | null>(null);
  readonly pageCountHint = input<number | null>(null);

  readonly pageChange = output<number>();
  readonly zoomChange = output<number>();
  readonly locateField = output<void>();
  readonly download = output<void>();

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pageCount = signal(0);
  readonly pageNumbers = signal<number[]>([]);

  constructor() {
    effect(() => {
      const data = this.pdfData();
      if (this.viewReady) void this.loadPdf(data);
    });

    effect(() => {
      const page = this.currentPage();
      const zoom = this.zoom();
      if (this.pdfDoc && this.viewReady) void this.renderPage(page, zoom);
    });

    this.destroyRef.onDestroy(() => {
      void this.pdfDoc?.destroy();
      this.pdfDoc = null;
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.loadPdf(this.pdfData());
  }

  badgeFor(page: number): { label: string; className: string } | null {
    const t = this.pageTexts().find((x) => x.page_number === page);
    if (!t) return null;
    if (!t.has_text) {
      return { label: 'Sin texto', className: 'bg-surface-container text-on-surface-variant' };
    }
    if (t.method === 'ocr') {
      const pct = t.ocr_confidence != null ? ` ${t.ocr_confidence}%` : '';
      return { label: `OCR${pct}`, className: 'bg-[#FEF3C7] text-[#B45309]' };
    }
    return { label: 'Nativo', className: 'bg-[#DCFCE7] text-[#15803D]' };
  }

  private async loadPdf(data: ArrayBuffer | null): Promise<void> {
    if (this.pdfDoc) {
      await this.pdfDoc.destroy();
      this.pdfDoc = null;
    }
    if (!data) {
      const n = this.pageCountHint() ?? 0;
      this.pageCount.set(n);
      this.pageNumbers.set(Array.from({ length: n }, (_, i) => i + 1));
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      this.pdfDoc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
      this.pageCount.set(this.pdfDoc.numPages);
      this.pageNumbers.set(Array.from({ length: this.pdfDoc.numPages }, (_, i) => i + 1));
      await this.renderPage(this.currentPage(), this.zoom());
    } catch {
      this.error.set('No se pudo renderizar el PDF');
    } finally {
      this.loading.set(false);
    }
  }

  private async renderPage(pageNum: number, zoomPct: number): Promise<void> {
    if (!this.pdfDoc) return;
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    const page = await this.pdfDoc.getPage(Math.min(pageNum, this.pdfDoc.numPages));
    const viewport = page.getViewport({ scale: (zoomPct / 100) * 1.25 });
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport }).promise;
  }
}
