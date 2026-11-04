import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { CaseFolder } from '../../../../core/api/types';
import { flattenFolders } from '../../models/case-files.models';

@Component({
  selector: 'app-case-move-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40"
      (click)="cancel.emit()"
    >
      <div
        class="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-5 flex flex-col gap-4 max-h-[90vh]"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between gap-3">
          <h2 class="font-headline-sm text-headline-sm text-on-surface m-0 truncate">
            Mover «{{ itemName() }}»
          </h2>
          <button
            type="button"
            class="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer shrink-0"
            (click)="cancel.emit()"
            aria-label="Cerrar"
          >
            <app-material-icon name="close" [size]="18" />
          </button>
        </div>

        @if (!allowRoot()) {
          <p class="font-caption text-caption text-on-surface-variant m-0">
            Los documentos siempre van dentro de una carpeta.
          </p>
        }

        <div class="flex flex-col gap-0.5 overflow-y-auto max-h-64 border border-outline-variant/20 rounded-lg p-1">
          @if (allowRoot()) {
            <button
              type="button"
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left border-0 cursor-pointer font-body-compact text-body-compact"
              [class]="
                selectedId() === null
                  ? 'bg-secondary-container/40 text-primary-container'
                  : 'bg-transparent text-on-surface hover:bg-surface-container-low'
              "
              (click)="selectedId.set(null)"
            >
              <app-material-icon name="account_tree" [size]="16" />
              Raíz del expediente
            </button>
          }
          @for (row of rows(); track row.folder.id) {
            <button
              type="button"
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg text-left border-0 font-body-compact text-body-compact"
              [style.padding-left.px]="10 + row.depth * 12"
              [disabled]="isDisabled(row.folder.id)"
              [class]="
                selectedId() === row.folder.id
                  ? 'bg-secondary-container/40 text-primary-container cursor-pointer'
                  : isDisabled(row.folder.id)
                    ? 'bg-transparent text-on-surface-variant/40 cursor-not-allowed'
                    : 'bg-transparent text-on-surface hover:bg-surface-container-low cursor-pointer'
              "
              [title]="disabledReason(row.folder.id) ?? ''"
              (click)="!isDisabled(row.folder.id) && selectedId.set(row.folder.id)"
            >
              <app-material-icon
                [name]="row.folder.origen === 'correo' ? 'mail' : 'folder'"
                [size]="16"
              />
              <span class="truncate">{{ row.folder.name }}</span>
            </button>
          }
        </div>

        @if (error()) {
          <div class="rounded-lg bg-[#FEF2F2] text-[#991B1B] px-3 py-2 font-caption text-caption">
            {{ error() }}
          </div>
        }

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg font-label-default text-label-default text-on-surface-variant hover:bg-surface-container-low border-0 bg-transparent cursor-pointer"
            (click)="cancel.emit()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg font-label-default text-label-default bg-primary-container text-on-primary border-0 cursor-pointer disabled:opacity-40"
            [disabled]="!canConfirm() || submitting()"
            (click)="onConfirm()"
          >
            Mover
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CaseMoveModal {
  readonly itemName = input.required<string>();
  /** Carpetas del árbol. */
  readonly folders = input.required<CaseFolder[]>();
  /** Si true, permite elegir raíz (mover carpeta). */
  readonly allowRoot = input(false);
  /** Ids de carpetas no válidas como destino (p.ej. la propia y descendientes). */
  readonly disabledIds = input<ReadonlySet<string>>(new Set());
  readonly error = input<string | null>(null);
  readonly submitting = input(false);
  readonly cancel = output<void>();
  /** null = raíz (solo si allowRoot). */
  readonly confirm = output<string | null>();

  readonly selectedId = signal<string | null | undefined>(undefined);

  readonly rows = computed(() => flattenFolders(this.folders()));

  isDisabled(id: string): boolean {
    return this.disabledIds().has(id);
  }

  disabledReason(id: string): string | null {
    if (!this.disabledIds().has(id)) return null;
    return 'No puedes mover una carpeta dentro de sí misma';
  }

  canConfirm(): boolean {
    const sel = this.selectedId();
    if (sel === undefined) return false;
    if (sel === null) return this.allowRoot();
    return !this.disabledIds().has(sel);
  }

  onConfirm(): void {
    const sel = this.selectedId();
    if (sel === undefined || !this.canConfirm() || this.submitting()) return;
    this.confirm.emit(sel);
  }
}
