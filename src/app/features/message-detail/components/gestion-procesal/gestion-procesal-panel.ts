import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiError } from '../../../../core/api/client';
import { caseFilesApi, gestionApi } from '../../../../core/api/endpoints';
import { errorText } from '../../../../core/api/errors';
import type { CaseFolderItem, GestionSupport } from '../../../../core/api/types';
import { ToastService } from '../../../../core/services/toast.service';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { CaseFileViewer } from '../../../cases/components/case-file-viewer/case-file-viewer';
import { GestionDropzone } from './gestion-dropzone';
import { GestionSupportList } from './gestion-support-list';

const HIGHLIGHT_MS = 2500;

/**
 * Sección "Gestión procesal" del detalle del correo (SPEC 25): anexar de 1 a 5 PDF por envío y ver los ya
 * anexados. Quedan en la carpeta "Gestión procesal" del correo dentro del expediente del caso.
 * Cualquier rol que vea el correo puede anexar (el auxiliar solo ve sus correos asignados).
 */
@Component({
  selector: 'app-gestion-procesal-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBanner, MaterialIcon, RouterLink, GestionDropzone, GestionSupportList, CaseFileViewer],
  template: `
    <article class="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col" aria-labelledby="gestion-title">
      <header
        class="px-5 sm:px-6 py-4 border-b border-surface-container-high flex items-start justify-between gap-3"
      >
        <div class="min-w-0 flex-1 flex items-start gap-3">
          <span
            class="shrink-0 size-9 rounded-lg bg-secondary-container/60 text-on-secondary-container flex items-center justify-center"
            aria-hidden="true"
          >
            <app-material-icon name="fact_check" [size]="20" />
          </span>
          <div class="min-w-0">
            <h2 id="gestion-title" class="m-0 text-headline-md text-on-surface flex items-center gap-2">
              Gestión procesal
              @if (soportes().length) {
                <span
                  class="inline-flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-surface-container-high text-label-compact text-on-surface-variant"
                >
                  {{ soportes().length }}
                </span>
              }
            </h2>
            <p class="m-0 mt-1 text-body-compact text-on-surface-variant">
              Soportes de lo que se hizo con este correo. Quedan en el expediente del proceso.
            </p>
          </div>
        </div>
        @if (expedienteLink(); as link) {
          <a
            class="shrink-0 h-9 px-2.5 sm:px-3 rounded-md border border-outline-variant text-label-compact text-on-surface no-underline hover:bg-surface-container-low inline-flex items-center gap-1.5"
            [routerLink]="link.path"
            [queryParams]="link.query"
            title="Ver en el expediente"
            aria-label="Ver en el expediente"
          >
            <app-material-icon name="folder_open" [size]="16" />
            <span class="hidden sm:inline">Ver en el expediente</span>
          </a>
        }
      </header>

      <div class="px-5 sm:px-6 py-5 flex flex-col gap-5">
        @if (!caseId()) {
          <app-alert-banner variant="info" title="Correo sin proceso">
            Asocia este correo a un proceso para anexar soportes: se guardan en su expediente.
          </app-alert-banner>
        } @else {
          <app-gestion-dropzone [busy]="uploading()" (submit)="upload($event)" />
        }

        @if (error()) {
          <app-alert-banner variant="error">{{ error() }}</app-alert-banner>
        }

        <section class="flex flex-col gap-2" aria-label="Soportes anexados">
          <h3 class="m-0 text-label-default font-semibold text-on-surface-variant uppercase tracking-wide">
            Soportes anexados
          </h3>
          @if (loading()) {
            <p class="m-0 text-body-compact text-on-surface-variant">Cargando soportes…</p>
          } @else if (loadError()) {
            <p class="m-0 text-body-compact text-error">
              {{ loadError() }}
              <button type="button" class="ml-1 underline border-0 bg-transparent cursor-pointer text-inherit" (click)="load()">
                Reintentar
              </button>
            </p>
          } @else {
            <app-gestion-support-list
              [soportes]="soportes()"
              [highlight]="recent()"
              (view)="viewing.set(asItem($event))"
              (download)="download($event)"
            />
          }
        </section>
      </div>
    </article>

    @if (viewing(); as item) {
      <app-case-file-viewer [item]="item" (close)="viewing.set(null)" (download)="downloadItem(item)" />
    }
  `,
})
export class GestionProcesalPanel {
  private readonly toast = inject(ToastService);
  private readonly dropzone = viewChild(GestionDropzone);

  readonly messageId = input.required<string>();
  /** null: correo en "Sin clasificar"; no se puede anexar. */
  readonly caseId = input<string | null>(null);

  readonly soportes = signal<GestionSupport[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly recent = signal<string[]>([]);
  readonly viewing = signal<CaseFolderItem | null>(null);

  /** Abre el expediente del caso en la carpeta "Gestión procesal" (la del soporte más reciente). */
  readonly expedienteLink = computed(() => {
    const caseId = this.caseId();
    if (!caseId) return null;
    const last = this.soportes().filter((s) => s.case_id === caseId).at(-1);
    return { path: ['/cases', caseId], query: last ? { folder: last.folder_id } : {} };
  });

  constructor() {
    effect(() => {
      this.messageId();
      untracked(() => void this.load());
    });
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.soportes.set((await gestionApi.list(this.messageId())).soportes);
    } catch (e) {
      this.loadError.set(errorText(e instanceof ApiError ? e.code : null));
    } finally {
      this.loading.set(false);
    }
  }

  async upload(files: File[]): Promise<void> {
    this.uploading.set(true);
    this.error.set(null);
    try {
      const created = await gestionApi.upload(this.messageId(), files);
      this.soportes.update((s) => [...s, ...created]);
      this.dropzone()?.clear();
      this.flash(created.map((c) => c.item_id));
      this.toast.push({
        type: 'success',
        title: created.length === 1 ? 'Soporte anexado' : `${created.length} soportes anexados`,
        description: 'Ya están en el expediente del proceso.',
      });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : null;
      this.error.set(
        code === 'unsupported_upload_type'
          ? 'Algún archivo no es un PDF válido. No se anexó ninguno.'
          : errorText(code),
      );
    } finally {
      this.uploading.set(false);
    }
  }

  async download(s: GestionSupport): Promise<void> {
    await this.downloadItem(this.asItem(s));
  }

  async downloadItem(item: CaseFolderItem): Promise<void> {
    try {
      const blob = await caseFilesApi.content(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename || 'soporte.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      this.toast.push({
        type: 'error',
        title: 'No se pudo descargar',
        description: errorText(e instanceof ApiError ? e.code : null),
      });
      if (e instanceof ApiError && e.status === 404) void this.load();
    }
  }

  /** El visor del expediente trabaja con items del árbol. */
  asItem(s: GestionSupport): CaseFolderItem {
    return {
      id: s.item_id,
      kind: 'subido',
      message_id: null,
      attachment_id: null,
      filename: s.filename,
      content_type: s.content_type,
      size_bytes: s.size_bytes,
      created_at: s.created_at,
      upload_id: s.upload_id,
      uploaded_by: s.uploaded_by,
    };
  }

  private flash(ids: string[]): void {
    this.recent.set(ids);
    setTimeout(() => this.recent.set([]), HIGHLIGHT_MS);
  }
}
