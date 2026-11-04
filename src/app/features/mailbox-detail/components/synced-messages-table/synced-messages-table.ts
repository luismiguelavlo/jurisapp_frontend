import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { EmailMessage } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-synced-messages-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section class="bg-surface-container-lowest rounded-[6px] overflow-hidden flex flex-col">
      <div
        class="p-space-md flex flex-col md:flex-row md:items-center justify-between gap-space-sm"
      >
        <div>
          <h2 class="text-headline-sm text-on-surface font-semibold m-0">
            Registro de Mensajes Sincronizados
          </h2>
          <p class="text-caption text-on-surface-variant mt-0.5 mb-0">
            Metadatos extraídos exclusivamente. Sin almacenamiento de cuerpo ni adjuntos.
          </p>
        </div>
        <span class="text-caption text-on-surface-variant"
          >Mostrando {{ shownCount() }} mensaje(s)</span
        >
      </div>

      @if (empty()) {
        <div class="p-space-xl flex flex-col items-center justify-center text-center gap-space-xs">
          <app-material-icon name="inbox" [size]="32" className="text-outline-variant" />
          <span class="text-headline-sm text-on-surface font-medium"
            >Sin mensajes sincronizados</span
          >
          <p class="text-caption text-on-surface-variant max-w-sm mb-0">
            Este buzón aún no tiene mensajes indexados o no se ha ejecutado la sincronización.
          </p>
        </div>
      } @else {
        <div class="w-full overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="h-9 bg-surface-container-low text-on-surface-variant text-caption">
                <th class="px-space-md font-medium w-[280px]">Remitente</th>
                <th class="px-space-md font-medium">Asunto</th>
                <th class="px-space-md font-medium w-[180px]">Recibido</th>
                <th class="px-space-md font-medium w-[90px] text-center">Adjuntos</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-surface-container-low text-body-default">
              @for (message of messages(); track message.id) {
                <tr class="h-11 hover:bg-secondary-container/20 transition-colors">
                  <td class="px-space-md text-on-surface font-medium truncate max-w-[280px]">
                    {{ message.sender || '(sin remitente)' }}
                  </td>
                  <td class="px-space-md text-on-surface truncate max-w-[420px]">
                    {{ message.subject || '(sin asunto)' }}
                  </td>
                  <td
                    class="px-space-md text-on-surface-variant font-mono text-[13px] whitespace-nowrap"
                  >
                    {{ formatDate(message.received_at ?? message.first_seen_at) }}
                  </td>
                  <td class="px-space-md text-center">
                    @if (message.has_attachments) {
                      <app-material-icon name="attach_file" [size]="16" className="text-primary" />
                    } @else {
                      <span class="text-caption text-outline-variant">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        @if (hasMore()) {
          <div class="p-space-sm bg-surface-container-low/50 flex items-center justify-center">
            <button
              type="button"
              class="h-8 px-space-md rounded-[6px] bg-surface-container-lowest hover:bg-surface-container text-on-surface text-label-compact flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              [disabled]="loadingMore()"
              (click)="loadMore.emit()"
            >
              <app-material-icon
                [name]="loadingMore() ? 'refresh' : 'expand_more'"
                [size]="14"
                [className]="loadingMore() ? 'animate-spin' : ''"
              />
              <span>{{ loadingMore() ? 'Cargando…' : 'Cargar más mensajes' }}</span>
            </button>
          </div>
        }
      }
    </section>
  `,
})
export class SyncedMessagesTable {
  readonly messages = input.required<ReadonlyArray<EmailMessage>>();
  readonly empty = input(false);
  readonly shownCount = input(0);
  readonly totalCount = input(0);
  readonly loadingMore = input(false);
  readonly hasMore = input(false);
  readonly loadMore = output<void>();

  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return iso;
    }
    return date.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
  }
}
