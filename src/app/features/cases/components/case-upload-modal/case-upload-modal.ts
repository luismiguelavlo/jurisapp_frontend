import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from '../../../../core/api/types';
import { formatBytes } from '../../../../core/utils/date-format';

export type UploadRowStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadRow {
  id: string;
  file: File;
  status: UploadRowStatus;
  error?: string;
}

@Component({
  selector: 'app-case-upload-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40"
      (click)="onBackdrop()"
    >
      <div
        class="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-lg p-5 flex flex-col gap-4 max-h-[90vh]"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-headline-sm text-headline-sm text-on-surface m-0">Subir archivos</h2>
            <p class="font-caption text-caption text-on-surface-variant m-0 mt-1">
              Se subirán a: {{ destination() }}
            </p>
          </div>
          <button
            type="button"
            class="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            [disabled]="busy()"
            (click)="close.emit()"
            aria-label="Cerrar"
          >
            <app-material-icon name="close" [size]="18" />
          </button>
        </div>

        <label
          class="flex flex-col items-center justify-center gap-2 border border-dashed border-outline-variant/50 rounded-xl p-6 cursor-pointer hover:bg-surface-container-low transition-colors"
        >
          <app-material-icon name="upload_file" [size]="28" className="text-primary-container" />
          <span class="font-body-medium text-body-medium text-on-surface"
            >Arrastra archivos aquí o selecciona</span
          >
          <span class="font-caption text-caption text-on-surface-variant text-center">
            PDF, Word (.docx), Excel (.xlsx), JPG o PNG · máximo 25 MB
          </span>
          <input
            type="file"
            class="sr-only"
            multiple
            [accept]="accept"
            (change)="onFilesSelected($event)"
          />
        </label>

        @if (rows().length > 0) {
          <ul class="flex flex-col gap-2 overflow-y-auto max-h-48 m-0 p-0 list-none">
            @for (row of rows(); track row.id) {
              <li
                class="flex items-center justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2"
              >
                <div class="min-w-0 flex flex-col">
                  <span class="font-body-compact text-body-compact text-on-surface truncate">{{
                    row.file.name
                  }}</span>
                  <span class="font-caption text-caption text-on-surface-variant">{{
                    formatBytes(row.file.size)
                  }}</span>
                  @if (row.status === 'error' && row.error) {
                    <span class="font-caption text-caption text-error">{{ row.error }}</span>
                  }
                </div>
                <span class="font-caption text-caption shrink-0">
                  @switch (row.status) {
                    @case ('uploading') {
                      <span class="text-primary-container">Subiendo…</span>
                    }
                    @case ('done') {
                      <span class="text-secondary">Subido ✓</span>
                    }
                    @case ('error') {
                      <button
                        type="button"
                        class="text-error underline border-0 bg-transparent cursor-pointer p-0"
                        (click)="retry.emit(row.id)"
                      >
                        Reintentar
                      </button>
                    }
                    @default {
                      <span class="text-on-surface-variant">En cola</span>
                    }
                  }
                </span>
              </li>
            }
          </ul>
        }

        <div class="flex justify-end pt-1">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg font-label-default text-label-default bg-surface-container-low text-on-surface border-0 cursor-pointer disabled:opacity-40"
            [disabled]="busy()"
            (click)="close.emit()"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CaseUploadModal {
  readonly destination = input('');
  readonly rows = input.required<UploadRow[]>();
  readonly busy = input(false);
  readonly filesAdded = output<File[]>();
  readonly retry = output<string>();
  readonly close = output<void>();

  readonly accept = UPLOAD_ACCEPT;
  readonly formatBytes = formatBytes;
  readonly dragOver = signal(false);

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (files.length) this.filesAdded.emit(files);
  }

  onBackdrop(): void {
    if (!this.busy()) this.close.emit();
  }

  static validateFile(file: File): string | null {
    if (file.size <= 0) return 'El archivo está vacío o no se pudo leer';
    if (file.size > UPLOAD_MAX_BYTES) return 'El archivo supera 25 MB';
    const name = file.name.toLowerCase();
    const ok =
      name.endsWith('.pdf') ||
      name.endsWith('.docx') ||
      name.endsWith('.xlsx') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.png');
    if (!ok) {
      return 'Solo PDF, Word (.docx), Excel (.xlsx), JPG o PNG; el contenido debe coincidir con la extensión';
    }
    return null;
  }
}
