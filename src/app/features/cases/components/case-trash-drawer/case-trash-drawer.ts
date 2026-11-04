import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { CaseTrash } from '../../../../core/api/types';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';

@Component({
  selector: 'app-case-trash-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="fixed inset-0 z-[110] flex justify-end bg-black/40" (click)="close.emit()">
      <aside
        class="w-full max-w-lg h-full bg-surface-container-lowest shadow-xl flex flex-col"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
        aria-label="Papelera del proceso"
      >
        <header
          class="h-14 px-4 border-b border-outline-variant/30 flex items-center justify-between shrink-0"
        >
          <h2 class="font-headline-sm text-headline-sm text-on-surface m-0">Papelera del proceso</h2>
          <button
            type="button"
            class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            (click)="close.emit()"
            aria-label="Cerrar"
          >
            <app-material-icon name="close" [size]="18" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          @if (loading()) {
            <p class="font-body-default text-on-surface-variant m-0">Cargando papelera…</p>
          } @else if (error()) {
            <div class="rounded-lg bg-[#FEF2F2] text-[#991B1B] px-3 py-2 font-caption text-caption">
              {{ error() }}
            </div>
          } @else if (!trash() || (trash()!.folders.length === 0 && trash()!.items.length === 0)) {
            <p class="font-body-default text-on-surface-variant m-0">La papelera está vacía.</p>
          } @else {
            <p class="font-caption text-caption text-on-surface-variant m-0">
              Los elementos de la papelera se conservan; los documentos que llegaron por correo nunca
              se eliminan.
            </p>

            @for (folder of trash()!.folders; track folder.id) {
              <div
                class="flex items-center justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <app-material-icon name="folder" [size]="18" className="text-on-surface-variant" />
                  <div class="min-w-0">
                    <p class="font-body-compact text-body-compact text-on-surface m-0 truncate">
                      {{ folder.name }}
                    </p>
                    <p class="font-caption text-caption text-on-surface-variant m-0">
                      Carpeta · {{ formatBogotaDateTime(folder.deleted_at) }} ·
                      {{ userEmail(folder.deleted_by) }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="font-label-compact text-label-compact text-primary-container border-0 bg-transparent cursor-pointer shrink-0"
                  (click)="restoreFolder.emit(folder.id)"
                >
                  Restaurar
                </button>
              </div>
            }

            @for (item of trash()!.items; track item.id) {
              <div
                class="flex items-center justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <app-material-icon
                    name="description"
                    [size]="18"
                    className="text-on-surface-variant"
                  />
                  <div class="min-w-0">
                    <p class="font-body-compact text-body-compact text-on-surface m-0 truncate">
                      {{ item.filename }}
                    </p>
                    <p class="font-caption text-caption text-on-surface-variant m-0">
                      Archivo · {{ formatBogotaDateTime(item.deleted_at) }} ·
                      {{ userEmail(item.deleted_by) }}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  class="font-label-compact text-label-compact text-primary-container border-0 bg-transparent cursor-pointer shrink-0"
                  (click)="restoreItem.emit(item.id)"
                >
                  Restaurar
                </button>
              </div>
            }
          }
        </div>
      </aside>
    </div>
  `,
})
export class CaseTrashDrawer {
  readonly trash = input<CaseTrash | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly userEmails = input<ReadonlyMap<string, string>>(new Map());
  readonly close = output<void>();
  readonly restoreFolder = output<string>();
  readonly restoreItem = output<string>();

  readonly formatBogotaDateTime = formatBogotaDateTime;

  userEmail(userId: string): string {
    return this.userEmails().get(userId) ?? userId.slice(0, 8);
  }
}
