import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { FlatFolderRow } from '../../models/case-files.models';

/** Índice del expediente: cada carpeta como un separador; la activa queda unida al contenido. */
@Component({
  selector: 'app-case-folder-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'block min-w-0 bg-surface-container-low/60 lg:border-r border-b lg:border-b-0 border-outline-variant/70' },
  template: `
    <nav class="py-3 flex flex-col gap-0.5 select-none" aria-label="Carpetas del expediente">
      @if (rows().length === 0) {
        <p class="m-0 px-4 py-2 text-caption text-on-surface-variant">
          Aún no hay carpetas. Crea una o espera a que lleguen correos con este radicado.
        </p>
      }
      @for (row of rows(); track row.folder.id) {
        @let active = row.folder.id === selectedId();
        <div
          class="group relative flex items-center gap-1 pr-1.5 cursor-pointer"
          [class]="
            active
              ? 'bg-surface-container-lowest text-primary shadow-[inset_3px_0_0_var(--color-primary)] lg:-mr-px'
              : 'text-on-surface hover:bg-surface-container'
          "
          [style.padding-left.px]="14 + row.depth * 14"
          (click)="select.emit(row.folder.id)"
        >
          <button
            type="button"
            class="flex-1 min-w-0 flex items-start gap-2 py-2 border-0 bg-transparent cursor-pointer text-left text-inherit"
            [attr.aria-current]="active ? 'true' : null"
          >
            <app-material-icon
              [name]="row.folder.origen === 'correo' ? 'mail' : active ? 'folder_open' : 'folder'"
              [size]="16"
              [className]="active ? 'text-primary' : 'text-on-surface-variant'"
            />
            <span
              class="text-body-compact line-clamp-2"
              [class.font-semibold]="active"
              [title]="row.folder.name"
              >{{ row.folder.name }}</span
            >
            @if (row.folder.correo?.radicado_conflicto) {
              <span
                class="w-1.5 h-1.5 rounded-full bg-tertiary shrink-0"
                title="El correo menciona otro radicado"
              ></span>
            }
          </button>
          <span class="text-caption text-on-surface-variant tabular-nums">{{ row.itemCount }}</span>
          <button
            type="button"
            class="p-1 rounded-[4px] text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-0 bg-transparent cursor-pointer opacity-60 group-hover:opacity-100 focus-visible:opacity-100"
            [attr.aria-label]="'Acciones de la carpeta ' + row.folder.name"
            (click)="onMenu($event, row.folder.id, row.folder.name)"
          >
            <app-material-icon name="more_vert" [size]="16" />
          </button>
        </div>
      }
      <p class="m-0 mt-3 px-4 text-caption text-on-surface-variant leading-4">
        Lo que llegó por correo no se puede borrar, pero sí moverse entre carpetas.
      </p>
    </nav>
  `,
})
export class CaseFolderTree {
  readonly rows = input.required<FlatFolderRow[]>();
  readonly selectedId = input<string | null>(null);
  readonly select = output<string>();
  readonly menu = output<{ id: string; name: string; x: number; y: number }>();

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
