import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { CaseFolder, CaseFolderItem } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatBytes,
} from '../../../../core/utils/date-format';
import {
  itemDisplayName,
  itemIcon,
  itemTypeLabel,
  radicadoSourceLabel,
} from '../../models/case-files.models';

@Component({
  selector: 'app-case-files-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'block min-w-0' },
  template: `
    <section class="min-w-0 px-4 sm:px-6 py-5 flex flex-col gap-5 min-h-[320px]">
      @if (!folder()) {
        <div class="flex flex-col items-start gap-1 py-10">
          <p class="m-0 text-headline-sm text-on-surface">Elige una carpeta</p>
          <p class="m-0 text-body-default text-on-surface-variant">
            Su contenido aparecerá aquí.
          </p>
        </div>
      } @else {
        @let fo = folder()!;
        <header class="flex flex-wrap items-baseline justify-between gap-2">
          <h2 class="m-0 text-headline-md text-on-surface min-w-0 truncate">{{ fo.name }}</h2>
          <span class="text-caption text-on-surface-variant tabular-nums"
            >{{ filteredItems().length }} archivo{{ filteredItems().length === 1 ? '' : 's' }}</span
          >
        </header>

        @if (fo.correo; as correo) {
          <div class="rounded-[6px] border border-outline-variant/80 bg-surface-container-low/50 px-4 py-3 flex flex-col gap-2">
            <dl class="m-0 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1 text-body-compact">
              <dt class="text-on-surface-variant">De</dt>
              <dd class="m-0 text-on-surface break-all">{{ correo.sender || 'Sin remitente' }}</dd>
              <dt class="text-on-surface-variant">Asunto</dt>
              <dd class="m-0 text-on-surface">{{ correo.subject || 'Sin asunto' }}</dd>
              <dt class="text-on-surface-variant">Recibido</dt>
              <dd class="m-0 text-on-surface"><time>{{ formatBogotaDateTime(correo.received_at) }}</time></dd>
            </dl>
            @if (correo.radicado_conflicto) {
              <p class="m-0 flex items-start gap-1.5 text-caption text-tertiary">
                <app-material-icon name="warning" [size]="14" className="shrink-0 mt-px" />
                El correo menciona otro radicado. Revisa que esté en el proceso correcto.
              </p>
            }
            <div class="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/50">
              <span class="text-caption text-on-surface-variant"
                >Radicado leído en: {{ radicadoSourceLabel(correo.radicado_source) }}</span
              >
              <button
                type="button"
                class="text-label-compact text-primary border-0 bg-transparent cursor-pointer p-0 hover:underline"
                (click)="reassign.emit()"
              >
                Mover a otro proceso
              </button>
            </div>
          </div>
        }

        @if (fo.children.length > 0) {
          <div class="flex flex-wrap gap-2">
            @for (child of fo.children; track child.id) {
              <button
                type="button"
                class="inline-flex items-center gap-1.5 h-8 px-3 rounded-[4px] border border-outline-variant bg-surface-container-lowest text-body-compact text-on-surface hover:border-primary hover:text-primary cursor-pointer"
                (click)="openFolder.emit(child.id)"
              >
                <app-material-icon
                  [name]="child.origen === 'correo' ? 'mail' : 'folder'"
                  [size]="16"
                />
                {{ child.name }}
              </button>
            }
          </div>
        }

        @if (filteredItems().length === 0) {
          <div class="flex flex-col items-start gap-3 py-6">
            <p class="m-0 text-body-default text-on-surface-variant">
              @if (query().trim()) {
                Ningún archivo de esta carpeta coincide con «{{ query().trim() }}».
              } @else {
                Esta carpeta está vacía.
              }
            </p>
            @if (!query().trim()) {
              <button
                type="button"
                class="h-8 px-3 rounded-[4px] bg-primary text-on-primary hover:bg-brand-hover text-label-compact border-0 cursor-pointer flex items-center gap-1.5"
                (click)="uploadHere.emit()"
              >
                <app-material-icon name="upload" [size]="16" />
                Subir archivo aquí
              </button>
            }
          </div>
        } @else {
          <div class="w-full min-w-0 overflow-x-auto -mx-1">
            <table class="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr class="text-caption text-on-surface-variant border-b border-outline-variant/70">
                  <th class="py-2 px-1 font-medium" scope="col">Nombre</th>
                  <th class="py-2 px-3 font-medium whitespace-nowrap" scope="col">Tipo</th>
                  <th class="py-2 px-3 font-medium whitespace-nowrap" scope="col">Fecha</th>
                  <th class="py-2 px-1 w-10" scope="col"><span class="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                @for (item of filteredItems(); track item.id) {
                  <tr class="group border-b border-outline-variant/40 last:border-b-0 hover:bg-surface-container-low">
                    <td class="py-2.5 px-1 max-w-0 w-full">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <app-material-icon
                          [name]="itemIcon(item)"
                          [size]="20"
                          className="text-primary shrink-0"
                        />
                        <div class="flex flex-col min-w-0">
                          <button
                            type="button"
                            class="text-body-default text-on-surface group-hover:text-primary cursor-pointer border-0 bg-transparent p-0 text-left truncate max-w-full"
                            [title]="itemDisplayName(item)"
                            (click)="openItem.emit(item)"
                          >
                            {{ itemDisplayName(item) }}
                          </button>
                          <span class="text-caption text-on-surface-variant truncate">
                            @if (item.kind === 'subido') {
                              Subido por {{ item.uploaded_by ? userEmail(item.uploaded_by) : 'un usuario eliminado' }}
                            } @else {
                              Llegó por correo
                            }
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="py-2.5 px-3 text-body-compact text-on-surface-variant whitespace-nowrap tabular-nums">
                      {{ formatTypeWeight(item) }}
                    </td>
                    <td class="py-2.5 px-3 text-body-compact text-on-surface whitespace-nowrap">
                      <time>{{ formatBogotaDateTime(item.created_at) }}</time>
                    </td>
                    <td class="py-2.5 px-1 text-right">
                      <button
                        type="button"
                        class="p-1.5 rounded-[4px] text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-0 bg-transparent cursor-pointer inline-flex"
                        [attr.aria-label]="'Acciones de ' + itemDisplayName(item)"
                        (click)="onMenu($event, item)"
                      >
                        <app-material-icon name="more_vert" [size]="18" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <p class="m-0 text-caption text-on-surface-variant">
            Los archivos que subes no generan vencimientos ni aparecen en la bandeja.
          </p>
        }
      }
    </section>
  `,
})
export class CaseFilesTable {
  readonly folder = input<CaseFolder | null>(null);
  readonly query = input('');
  readonly userEmails = input<ReadonlyMap<string, string>>(new Map());
  readonly openFolder = output<string>();
  readonly openItem = output<CaseFolderItem>();
  readonly uploadHere = output<void>();
  readonly reassign = output<void>();
  readonly menu = output<{ item: CaseFolderItem; x: number; y: number }>();

  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly formatBytes = formatBytes;
  readonly itemDisplayName = itemDisplayName;
  readonly itemIcon = itemIcon;
  readonly itemTypeLabel = itemTypeLabel;
  readonly radicadoSourceLabel = radicadoSourceLabel;

  readonly filteredItems = computed(() => {
    const folder = this.folder();
    if (!folder) return [] as CaseFolderItem[];
    const q = this.query().trim().toLowerCase();
    const items = [...folder.items].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (!q) return items;
    return items.filter((item) => itemDisplayName(item).toLowerCase().includes(q));
  });

  userEmail(userId: string): string {
    return this.userEmails().get(userId) ?? userId.slice(0, 8);
  }

  /** Guía §2.6: cuerpo → "Texto"; resto tipo + peso. */
  formatTypeWeight(item: CaseFolderItem): string {
    if (item.kind === 'cuerpo') return 'Texto';
    const type = itemTypeLabel(item);
    if (item.size_bytes == null) return type;
    return `${type} · ${formatBytes(item.size_bytes)}`;
  }

  onMenu(event: MouseEvent, item: CaseFolderItem): void {
    event.stopPropagation();
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.menu.emit({
      item,
      x: Math.min(rect.left, window.innerWidth - 220),
      y: rect.bottom + 4,
    });
  }
}
