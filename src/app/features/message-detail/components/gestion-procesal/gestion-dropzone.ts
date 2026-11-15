import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { GESTION_MAX_FILES, UPLOAD_MAX_BYTES } from '../../../../core/api/types';
import { formatBytes } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

interface QueuedFile {
  id: string;
  file: File;
  error: string | null;
}

/**
 * Selección de soportes de la gestión procesal: arrastrar o elegir PDF, revisar la cola (máximo 5 por envío)
 * y anexarlos. La validación aquí es de cortesía; el backend vuelve a validar extensión y firma.
 */
@Component({
  selector: 'app-gestion-dropzone',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="flex flex-col gap-3">
      <label
        class="group flex flex-col sm:flex-row items-center gap-3 sm:gap-4 rounded-xl border border-dashed px-4 py-4 transition-colors"
        [class]="
          disabled()
            ? 'border-outline-variant/40 bg-surface-container-low/50 cursor-not-allowed opacity-70'
            : dragOver()
              ? 'border-primary bg-primary-fixed/30 cursor-copy'
              : 'border-outline-variant/60 hover:border-primary/60 hover:bg-surface-container-low cursor-pointer'
        "
        (dragover)="onDragOver($event)"
        (dragleave)="dragOver.set(false)"
        (drop)="onDrop($event)"
      >
        <span
          class="shrink-0 size-11 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center"
          aria-hidden="true"
        >
          <app-material-icon name="upload_file" [size]="22" />
        </span>
        <span class="flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
          <span class="text-body-default text-on-surface">
            <strong class="font-semibold text-primary">Selecciona</strong> o arrastra los PDF de soporte
          </span>
          <span class="text-caption text-on-surface-variant">
            Solo PDF · hasta {{ maxFiles }} por envío · máximo 25 MB cada uno
          </span>
        </span>
        <input
          type="file"
          class="sr-only"
          accept="application/pdf,.pdf"
          multiple
          [disabled]="disabled()"
          (change)="onPicked($event)"
        />
      </label>

      @if (queue().length) {
        <ul class="m-0 p-0 list-none flex flex-col gap-1.5" aria-label="Soportes por anexar">
          @for (q of queue(); track q.id) {
            <li
              class="flex items-center gap-3 rounded-lg px-3 py-2"
              [class]="q.error ? 'bg-[#FEF2F2]' : 'bg-surface-container-low'"
            >
              <app-material-icon
                [name]="q.error ? 'error' : 'picture_as_pdf'"
                [size]="20"
                [className]="q.error ? 'text-error' : 'text-[#B3261E]'"
              />
              <div class="min-w-0 flex-1 flex flex-col">
                <span class="text-body-compact text-on-surface truncate" [title]="q.file.name">{{ q.file.name }}</span>
                <span class="text-caption" [class]="q.error ? 'text-error' : 'text-on-surface-variant'">
                  {{ q.error ?? formatBytes(q.file.size) }}
                </span>
              </div>
              <button
                type="button"
                class="shrink-0 p-1 rounded-md border-0 bg-transparent text-on-surface-variant hover:bg-surface-container cursor-pointer disabled:opacity-40"
                [disabled]="busy()"
                [attr.aria-label]="'Quitar ' + q.file.name"
                (click)="remove(q.id)"
              >
                <app-material-icon name="close" [size]="16" />
              </button>
            </li>
          }
        </ul>

        @if (overLimit()) {
          <p class="m-0 text-caption text-error">
            Puedes anexar hasta {{ maxFiles }} PDF por envío. Quita {{ queue().length - maxFiles }}
            {{ queue().length - maxFiles === 1 ? 'archivo' : 'archivos' }} o anéxalos en otro envío.
          </p>
        }

        <div class="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            class="h-9 px-3 rounded-md border border-outline-variant bg-transparent text-label-compact text-on-surface cursor-pointer hover:bg-surface-container-low disabled:opacity-40"
            [disabled]="busy()"
            (click)="clear()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="h-9 px-4 rounded-md border-0 bg-primary text-on-primary text-label-compact font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            [disabled]="!canSubmit()"
            (click)="submitQueue()"
          >
            <app-material-icon [name]="busy() ? 'progress_activity' : 'attach_file'" [size]="16" [className]="busy() ? 'animate-spin' : ''" />
            {{ busy() ? 'Anexando…' : submitLabel() }}
          </button>
        </div>
      }
    </div>
  `,
})
export class GestionDropzone {
  readonly busy = input(false);
  readonly disabled = input(false);
  readonly submit = output<File[]>();

  readonly maxFiles = GESTION_MAX_FILES;
  readonly formatBytes = formatBytes;
  readonly dragOver = signal(false);
  readonly queue = signal<QueuedFile[]>([]);

  readonly valid = computed(() => this.queue().filter((q) => !q.error));
  readonly overLimit = computed(() => this.queue().length > this.maxFiles);
  readonly canSubmit = computed(
    () => !this.busy() && !this.overLimit() && this.valid().length > 0 && this.valid().length === this.queue().length,
  );
  readonly submitLabel = computed(() => {
    const n = this.valid().length;
    return `Anexar ${n} ${n === 1 ? 'soporte' : 'soportes'}`;
  });

  onDragOver(event: DragEvent): void {
    if (this.disabled()) return;
    event.preventDefault();
    this.dragOver.set(true);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver.set(false);
    if (this.disabled()) return;
    this.add(Array.from(event.dataTransfer?.files ?? []));
  }

  onPicked(event: Event): void {
    const el = event.target as HTMLInputElement;
    const files = Array.from(el.files ?? []);
    el.value = '';
    this.add(files);
  }

  remove(id: string): void {
    this.queue.update((q) => q.filter((x) => x.id !== id));
  }

  clear(): void {
    this.queue.set([]);
  }

  submitQueue(): void {
    if (this.canSubmit()) this.submit.emit(this.queue().map((q) => q.file));
  }

  private add(files: File[]): void {
    if (!files.length) return;
    this.queue.update((q) => [
      ...q,
      ...files.map((file) => ({ id: crypto.randomUUID(), file, error: validatePdf(file) })),
    ]);
  }
}

function validatePdf(file: File): string | null {
  if (file.size <= 0) return 'El archivo está vacío o no se pudo leer';
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Solo se aceptan archivos PDF';
  if (file.size > UPLOAD_MAX_BYTES) return 'Supera 25 MB';
  return null;
}
