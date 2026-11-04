import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { UnassignedMessage } from '../../../../core/api/types';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

const COURT_DOMAINS = ['ramajudicial.gov.co', 'notificacionesjudiciales.gov.co'];

@Component({
  selector: 'app-unassigned-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="relative flex-1 sm:max-w-xs">
          <app-material-icon
            name="search"
            [size]="18"
            className="absolute left-2.5 top-2 text-on-surface-variant pointer-events-none"
          />
          <input
            type="search"
            class="w-full bg-surface-container-low text-on-surface placeholder:text-on-surface-variant font-body-compact text-body-compact pl-8 pr-3 py-1.5 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary-container"
            placeholder="Filtrar por remitente o asunto"
            [value]="query()"
            (input)="queryChange.emit(($any($event.target)).value)"
          />
        </div>
        <span class="font-caption text-caption text-on-surface-variant">
          Mostrando {{ filtered().length }} de {{ total() }}
          @if (hasMore() && query()) {
            · Filtra solo los correos cargados
          }
        </span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr
              class="bg-surface-container-low text-on-surface-variant font-label-compact text-[12px]"
            >
              <th class="py-2.5 px-4 font-medium">Remitente</th>
              <th class="py-2.5 px-4 font-medium">Asunto</th>
              <th class="py-2.5 px-4 font-medium">Recibido (Bogotá)</th>
              <th class="py-2.5 px-4 font-medium">Adjuntos</th>
              <th class="py-2.5 px-4 text-right font-medium">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-container-low">
            @for (item of filtered(); track item.message_id) {
              <tr
                class="hover:bg-secondary-container/20 cursor-pointer transition-colors"
                (click)="open.emit(item)"
              >
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2 min-w-0">
                    <app-material-icon
                      [name]="isCourt(item.sender) ? 'gavel' : 'person'"
                      [size]="18"
                      className="text-on-surface-variant shrink-0"
                    />
                    <span class="font-body-compact text-body-compact text-on-surface truncate">{{
                      item.sender || '—'
                    }}</span>
                  </div>
                </td>
                <td class="py-3 px-4 font-body-compact text-body-compact text-on-surface max-w-[280px] truncate">
                  {{ item.subject || '(sin asunto)' }}
                </td>
                <td class="py-3 px-4 font-body-compact text-body-compact text-on-surface-variant whitespace-nowrap">
                  {{ formatBogotaDateTime(item.received_at) }}
                </td>
                <td class="py-3 px-4 font-body-compact text-body-compact text-on-surface-variant">
                  @if (item.attachments > 0) {
                    <span class="inline-flex items-center gap-1">
                      <app-material-icon name="attach_file" [size]="14" />
                      {{ item.attachments }} PDF{{ item.attachments === 1 ? '' : 's' }}
                    </span>
                  } @else {
                    —
                  }
                </td>
                <td class="py-3 px-4 text-right">
                  <button
                    type="button"
                    class="font-label-compact text-label-compact text-primary-container border-0 bg-transparent cursor-pointer"
                    (click)="assign.emit(item); $event.stopPropagation()"
                  >
                    Asignar a proceso
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (hasMore()) {
        <div class="p-4 flex justify-center">
          <button
            type="button"
            class="h-9 px-5 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-label-compact font-medium border-0 cursor-pointer disabled:opacity-50"
            [disabled]="loadingMore()"
            (click)="loadMore.emit()"
          >
            {{ loadingMore() ? 'Cargando…' : 'Cargar más' }}
          </button>
        </div>
      }
    </div>
  `,
})
export class UnassignedTable {
  readonly items = input.required<ReadonlyArray<UnassignedMessage>>();
  readonly total = input(0);
  readonly query = input('');
  readonly hasMore = input(false);
  readonly loadingMore = input(false);
  readonly queryChange = output<string>();
  readonly open = output<UnassignedMessage>();
  readonly assign = output<UnassignedMessage>();
  readonly loadMore = output<void>();

  readonly formatBogotaDateTime = formatBogotaDateTime;

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [...this.items()];
    return this.items().filter(
      (i) =>
        (i.sender ?? '').toLowerCase().includes(q) ||
        (i.subject ?? '').toLowerCase().includes(q),
    );
  });

  isCourt(sender: string | null): boolean {
    if (!sender) return false;
    const domain = sender.split('@')[1]?.toLowerCase() ?? '';
    return COURT_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
  }
}
