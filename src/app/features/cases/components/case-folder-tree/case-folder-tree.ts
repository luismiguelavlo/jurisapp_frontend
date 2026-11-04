import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { FlatFolderRow } from '../../models/case-files.models';

@Component({
  selector: 'app-case-folder-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'contents' },
  template: `
    <aside
      class="lg:col-span-4 min-w-0 bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col gap-3"
    >
      <div class="flex items-center justify-between pb-2">
        <span
          class="font-label-default text-label-default text-on-surface uppercase tracking-wider text-[11px]"
          >Expediente</span
        >
        <span class="font-caption text-caption text-on-surface-variant"
          >{{ rootCount() }} carpeta{{ rootCount() === 1 ? '' : 's' }}</span
        >
      </div>

      @if (rows().length === 0) {
        <p class="font-caption text-caption text-on-surface-variant m-0 py-2">
          Aún no hay carpetas. Crea una o espera correos agrupados al radicado.
        </p>
      } @else {
        <nav class="flex flex-col gap-1 select-none">
          @for (row of rows(); track row.folder.id) {
            <div
              class="group relative flex items-center justify-between p-2 rounded-lg cursor-pointer"
              [class]="
                row.folder.id === selectedId()
                  ? 'bg-secondary-container/40 text-primary-container font-medium'
                  : 'hover:bg-surface-container-low text-on-surface'
              "
              [style.padding-left.px]="8 + row.depth * 12"
              (click)="select.emit(row.folder.id)"
            >
              <div class="flex items-center gap-2 truncate min-w-0">
                <app-material-icon
                  [name]="
                    row.folder.origen === 'correo'
                      ? 'mail'
                      : row.folder.id === selectedId()
                        ? 'folder_open'
                        : 'folder'
                  "
                  [size]="18"
                  [className]="
                    row.folder.id === selectedId() ? '' : 'text-on-surface-variant'
                  "
                />
                <span class="font-body-compact text-body-compact truncate" [title]="row.folder.name">{{
                  row.folder.name
                }}</span>
                @if (row.folder.correo?.radicado_conflicto) {
                  <span
                    class="w-1.5 h-1.5 rounded-full bg-[#D97706] shrink-0"
                    title="Conflicto de radicado"
                  ></span>
                }
              </div>
              <div class="flex items-center gap-1 shrink-0">
                <span class="font-caption text-caption text-on-surface-variant text-[11px]"
                  >{{ row.itemCount }} doc</span
                >
                <button
                  type="button"
                  class="p-1 hover:bg-surface-container-high rounded-md text-on-surface-variant hover:text-on-surface border-0 bg-transparent cursor-pointer"
                  (click)="onMenu($event, row.folder.id, row.folder.name)"
                >
                  <app-material-icon name="more_vert" [size]="16" />
                </button>
              </div>
            </div>
          }
        </nav>
      }

      <div class="mt-2 p-3 bg-surface-container-low rounded-lg flex items-start gap-2">
        <app-material-icon
          name="info"
          [size]="16"
          className="text-primary-container shrink-0 mt-0.5"
        />
        <p class="font-caption text-caption text-on-surface-variant leading-snug m-0">
          Los documentos que llegaron por correo no se pueden eliminar; puedes moverlos y crear
          carpetas.
        </p>
      </div>
    </aside>
  `,
})
export class CaseFolderTree {
  readonly rows = input.required<FlatFolderRow[]>();
  readonly selectedId = input<string | null>(null);
  readonly select = output<string>();
  readonly menu = output<{ id: string; name: string; x: number; y: number }>();

  readonly rootCount = computed(() => this.rows().filter((r) => r.depth === 0).length);

  onMenu(event: MouseEvent, id: string, name: string): void {
    event.stopPropagation();
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.menu.emit({
      id,
      name,
      x: Math.min(rect.left, window.innerWidth - 230),
      y: rect.bottom + 4,
    });
  }
}
