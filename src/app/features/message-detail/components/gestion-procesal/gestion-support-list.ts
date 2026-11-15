import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { GestionSupport } from '../../../../core/api/types';
import { formatBogotaDateTime, formatBytes } from '../../../../core/utils/date-format';
import { displayName } from '../../../../core/utils/person-name';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Soportes ya anexados a la gestión procesal: nombre, quién y cuándo, ver y descargar. */
@Component({
  selector: 'app-gestion-support-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @if (soportes().length) {
      <ul class="m-0 p-0 list-none divide-y divide-surface-container-high border-y border-surface-container-high">
        @for (s of soportes(); track s.item_id) {
          <li
            class="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-md transition-colors duration-700"
            [class]="highlight().includes(s.item_id) ? 'bg-primary-fixed/30' : ''"
          >
            <app-material-icon name="picture_as_pdf" [size]="22" className="text-[#B3261E] shrink-0" />
            <button
              type="button"
              class="min-w-0 flex-1 flex flex-col items-start text-left border-0 bg-transparent p-0 cursor-pointer group"
              (click)="view.emit(s)"
            >
              <span class="text-body-compact text-on-surface truncate max-w-full group-hover:text-primary group-hover:underline" [title]="s.filename">
                {{ s.filename }}
              </span>
              <span class="text-caption text-on-surface-variant">
                {{ formatBytes(s.size_bytes) }} · {{ displayName(person(s)) }} · {{ formatDate(s.created_at) }}
              </span>
            </button>
            <div class="shrink-0 flex items-center gap-0.5">
              <button
                type="button"
                class="p-1.5 rounded-md border-0 bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary cursor-pointer"
                [attr.aria-label]="'Ver ' + s.filename"
                title="Ver"
                (click)="view.emit(s)"
              >
                <app-material-icon name="visibility" [size]="18" />
              </button>
              <button
                type="button"
                class="p-1.5 rounded-md border-0 bg-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary cursor-pointer"
                [attr.aria-label]="'Descargar ' + s.filename"
                title="Descargar"
                (click)="download.emit(s)"
              >
                <app-material-icon name="download" [size]="18" />
              </button>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="m-0 text-body-compact text-on-surface-variant">
        Aún no hay soportes anexados a este correo.
      </p>
    }
  `,
})
export class GestionSupportList {
  readonly soportes = input.required<GestionSupport[]>();
  /** Recién anexados: se resaltan un momento. */
  readonly highlight = input<string[]>([]);
  readonly view = output<GestionSupport>();
  readonly download = output<GestionSupport>();

  readonly formatBytes = formatBytes;
  readonly formatDate = formatBogotaDateTime;
  readonly displayName = displayName;

  person(s: GestionSupport) {
    return { first_name: s.uploaded_by_first_name, last_name: s.uploaded_by_last_name, email: s.uploaded_by_email };
  }
}
