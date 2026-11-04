import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-case-files-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="bg-surface-container-lowest rounded-xl p-3 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
    >
      <div class="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          class="bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors px-3 py-1.5 rounded-lg font-label-default text-label-default flex items-center gap-1.5 border-0 cursor-pointer"
          (click)="newFolder.emit()"
        >
          <app-material-icon name="create_new_folder" [size]="18" className="text-primary-container" />
          <span>Nueva carpeta</span>
        </button>
        <button
          type="button"
          class="bg-primary-container text-on-primary hover:bg-secondary transition-colors px-3 py-1.5 rounded-lg font-label-default text-label-default flex items-center gap-1.5 shadow-sm border-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          [disabled]="!canUpload()"
          (click)="upload.emit()"
        >
          <app-material-icon name="cloud_upload" [size]="18" />
          <span>Subir archivo</span>
        </button>
        @if (canManage()) {
          <button
            type="button"
            class="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors px-3 py-1.5 rounded-lg font-label-default text-label-default flex items-center gap-1.5 border-0 bg-transparent cursor-pointer"
            (click)="trash.emit()"
          >
            <app-material-icon name="delete" [size]="18" />
            <span>Papelera</span>
          </button>
        }
      </div>
      <div class="flex items-center gap-2">
        <div class="relative flex-1 sm:w-64">
          <app-material-icon
            name="search"
            [size]="18"
            className="absolute left-2.5 top-2 text-on-surface-variant pointer-events-none"
          />
          <input
            class="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-compact text-body-compact pl-8 pr-3 py-1.5 rounded-lg border-0 focus:outline-none focus:bg-surface-container-lowest focus:ring-1 focus:ring-primary-container"
            placeholder="Filtrar por nombre"
            type="search"
            [value]="query()"
            (input)="queryChange.emit(($any($event.target)).value)"
          />
        </div>
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
