import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Cabecera de la hoja del expediente: acciones y filtro por nombre. */
@Component({
  selector: 'app-case-files-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="px-4 sm:px-5 py-3 border-b border-outline-variant/70 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
    >
      <div class="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          class="h-8 px-3 rounded-[4px] bg-primary text-on-primary hover:bg-brand-hover text-label-compact flex items-center gap-1.5 border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!canUpload()"
          [title]="canUpload() ? '' : 'Elige una carpeta para subir archivos'"
          (click)="upload.emit()"
        >
          <app-material-icon name="upload" [size]="16" />
          Subir archivo
        </button>
        <button
          type="button"
          class="h-8 px-3 rounded-[4px] bg-transparent text-on-surface hover:bg-surface-container text-label-compact flex items-center gap-1.5 border-0 cursor-pointer"
          (click)="newFolder.emit()"
        >
          <app-material-icon name="create_new_folder" [size]="16" />
          Nueva carpeta
        </button>
        @if (canManage()) {
          <button
            type="button"
            class="h-8 px-3 rounded-[4px] bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-label-compact flex items-center gap-1.5 border-0 cursor-pointer"
            (click)="trash.emit()"
          >
            <app-material-icon name="delete" [size]="16" />
            Papelera
          </button>
        }
      </div>
      <div class="relative sm:w-60">
        <label class="sr-only" for="files-filter">Filtrar archivos por nombre</label>
        <app-material-icon
          name="search"
          [size]="16"
          className="absolute left-2.5 top-2 text-on-surface-variant pointer-events-none"
        />
        <input
          id="files-filter"
          class="w-full h-8 pl-8 pr-3 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          placeholder="Filtrar por nombre"
          type="search"
          [value]="query()"
          (input)="queryChange.emit($any($event.target).value)"
        />
      </div>
    </div>
  `,
})
export class CaseFilesToolbar {
  readonly canManage = input(false);
  readonly canUpload = input(false);
  readonly query = input('');
  readonly newFolder = output<void>();
  readonly upload = output<void>();
  readonly trash = output<void>();
  readonly queryChange = output<string>();
}
