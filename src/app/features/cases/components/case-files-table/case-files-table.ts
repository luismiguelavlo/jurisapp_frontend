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
  itemOrigenLabel,
  itemTypeLabel,
  radicadoSourceLabel,
} from '../../models/case-files.models';

@Component({
  selector: 'app-case-files-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'contents' },
  template: `
    <section
      class="lg:col-span-8 min-w-0 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-4 min-h-[320px]"
    >
      @if (!folder()) {
        <div class="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <app-material-icon name="folder_open" [size]="32" className="text-on-surface-variant" />
          <p class="font-body-default text-on-surface-variant m-0">
            Selecciona una carpeta del directorio para ver su contenido.
          </p>
        </div>
      } @else {
        <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-headline-sm text-headline-sm text-on-surface truncate">{{
              folder()!.name
            }}</span>
            <span
              class="font-caption text-caption bg-surface-container-low text-on-surface-variant px-2 py-0.5 rounded-md shrink-0"
              >{{ filteredItems().length }} elemento{{
                filteredItems().length === 1 ? '' : 's'
              }}</span
            >
          </div>
        </div>

        @if (folder()!.correo; as correo) {
          <div class="bg-surface-container-low rounded-lg p-3 flex flex-col gap-1.5">
            <div class="flex flex-wrap gap-x-4 gap-y-1 font-caption text-caption text-on-surface-variant">
              <span
                ><span class="text-on-surface font-medium">Remitente:</span>
                {{ correo.sender || '—' }}</span
              >
              <span
                ><span class="text-on-surface font-medium">Asunto:</span>
                {{ correo.subject || '—' }}</span
              >
              <span
                ><span class="text-on-surface font-medium">Recibido:</span>
                {{ formatBogotaDateTime(correo.received_at) }}</span
              >
            </div>
            <span class="font-caption text-caption text-on-surface-variant">
              Radicado detectado en: {{ radicadoSourceLabel(correo.radicado_source) }}
            </span>
            @if (correo.radicado_conflicto) {
              <div
                class="mt-1 flex items-start gap-2 rounded-lg bg-[#FEF3C7] text-[#92400E] px-2.5 py-2"
              >
                <app-material-icon name="warning" [size]="16" className="shrink-0 mt-0.5" />
                <p class="m-0 font-caption text-caption">
                  El correo menciona otro radicado; revisa que esté en el proceso correcto.
                </p>
              </div>
            }
            <div class="pt-1">
              <button
                type="button"
                class="font-label-compact text-label-compact text-primary-container border-0 bg-transparent cursor-pointer p-0"
                (click)="reassign.emit()"
              >
                Mover a otro proceso
              </button>
            </div>
          </div>
        }

        @if (folder()!.children.length > 0) {
          <div class="flex flex-col gap-1">
            <span class="font-label-compact text-label-compact text-on-surface-variant uppercase text-[11px]"
              >Subcarpetas</span
            >
            @for (child of folder()!.children; track child.id) {
              <button
                type="button"
                class="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-container-low text-on-surface border-0 bg-transparent cursor-pointer text-left"
                (click)="openFolder.emit(child.id)"
              >
                <app-material-icon
                  [name]="child.origen === 'correo' ? 'mail' : 'folder'"
                  [size]="18"
                  className="text-on-surface-variant"
                />
                <span class="font-body-compact text-body-compact truncate">{{ child.name }}</span>
              </button>
            }
          </div>
        }

        @if (filteredItems().length === 0) {
          <div class="flex flex-col items-center gap-3 py-10">
            <p class="font-body-default text-on-surface-variant m-0">Esta carpeta está vacía.</p>
            <button
              type="button"
              class="bg-primary-container text-on-primary px-3 py-1.5 rounded-lg font-label-default text-label-default border-0 cursor-pointer flex items-center gap-1.5"
              (click)="uploadHere.emit()"
            >
              <app-material-icon name="cloud_upload" [size]="18" />
              Subir archivo
            </button>
          </div>
        } @else {
          <div class="w-full min-w-0 overflow-x-auto">
            <table class="w-full table-fixed text-left">
              <colgroup>
                <col class="w-[38%]" />
                <col class="w-[18%]" />
                <col class="w-[12%]" />
                <col class="w-[22%]" />
                <col class="w-[10%]" />
              </colgroup>
              <thead>
                <tr class="bg-surface-container-low text-on-surface-variant font-label-compact text-[12px]">
                  <th class="py-2.5 px-3 rounded-l-lg font-medium">Nombre</th>
                  <th class="py-2.5 px-2 font-medium">Tipo / Peso</th>
                  <th class="py-2.5 px-2 font-medium">Origen</th>
                  <th class="py-2.5 px-2 font-medium">Fecha</th>
                  <th class="py-2.5 px-2 rounded-r-lg text-right font-medium">
                    <span class="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-container-low">
                @for (item of filteredItems(); track item.id) {
                  <tr class="hover:bg-secondary-container/20 transition-colors group">
                    <td class="py-3 px-3 max-w-0">
                      <div class="flex items-center gap-2.5 min-w-0">
                        <app-material-icon
                          [name]="itemIcon(item)"
                          [size]="20"
                          className="text-primary-container shrink-0"
                        />
                        <div class="flex flex-col min-w-0 overflow-hidden">
                          <button
                            type="button"
                            class="font-body-medium text-body-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer border-0 bg-transparent p-0 text-left truncate max-w-full"
                            [title]="itemDisplayName(item)"
                            (click)="openItem.emit(item)"
                          >
                            {{ itemDisplayName(item) }}
                          </button>
                          @if (item.kind === 'subido') {
                            <span
                              class="font-caption text-caption text-on-surface-variant text-[11px] truncate"
                            >
                              Subido por:
                              {{
                                item.uploaded_by
                                  ? userEmail(item.uploaded_by)
                                  : 'Usuario eliminado'
                              }}
                            </span>
                          } @else {
                            <span class="font-caption text-caption text-on-surface-variant text-[11px]"
                              >Del correo</span
                            >
                          }
                        </div>
                      </div>
                    </td>
                    <td
                      class="py-3 px-2 font-body-compact text-body-compact text-on-surface-variant truncate"
                      [title]="formatTypeWeight(item)"
                    >
                      {{ formatTypeWeight(item) }}
                    </td>
                    <td class="py-3 px-2">
                      <span
                        class="font-caption text-caption px-2 py-0.5 rounded inline-block"
                        [class]="
                          item.kind === 'subido'
                            ? 'bg-secondary-container/50 text-secondary'
                            : 'bg-surface-container text-on-surface'
                        "
                        >{{ itemOrigenLabel(item.kind) }}</span
                      >
                    </td>
                    <td
                      class="py-3 px-2 font-body-compact text-body-compact text-on-surface truncate"
                      [title]="formatBogotaDateTime(item.created_at)"
                    >
                      {{ formatBogotaDateTime(item.created_at) }}
                    </td>
                    <td class="py-3 px-2 text-right">
                      <button
                        type="button"
                        class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors border-0 bg-transparent cursor-pointer inline-flex"
                        aria-label="Acciones"
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
          <p class="font-caption text-caption text-on-surface-variant m-0 flex items-center gap-1">
            <app-material-icon name="shield" [size]="14" className="text-primary-container" />
            Los archivos subidos no generan vencimientos ni aparecen en Documentos.
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
  readonly itemOrigenLabel = itemOrigenLabel;
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
