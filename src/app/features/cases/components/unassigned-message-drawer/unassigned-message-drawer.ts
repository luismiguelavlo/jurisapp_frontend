import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MessageDetail, UnassignedMessage } from '../../../../core/api/types';
import { formatBogotaDateTime, formatBytes } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-unassigned-message-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="fixed inset-0 z-[110] flex justify-end bg-black/40" (click)="close.emit()">
      <aside
        class="w-full max-w-lg h-full bg-surface-container-lowest shadow-xl flex flex-col"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <header
          class="h-14 px-4 border-b border-outline-variant/30 flex items-center justify-between shrink-0"
        >
          <h2 class="font-headline-sm text-headline-sm text-on-surface m-0">Correo</h2>
          <button
            type="button"
            class="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            (click)="close.emit()"
            aria-label="Cerrar"
          >
            <app-material-icon name="close" [size]="18" />
          </button>
        </header>

        <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div
            class="rounded-lg bg-[#FEF3C7] text-[#92400E] px-3 py-2 font-caption text-caption flex items-center gap-2"
          >
            <app-material-icon name="warning" [size]="16" />
            Sin radicado detectado
          </div>

          @if (loading()) {
            <p class="font-body-default text-on-surface-variant m-0">Cargando correo…</p>
          } @else if (error()) {
            <div class="rounded-lg bg-[#FEF2F2] text-[#991B1B] px-3 py-2 font-caption text-caption">
              {{ error() }}
            </div>
          } @else if (message(); as msg) {
            <div class="flex flex-col gap-1">
              <h3 class="font-headline-sm text-headline-sm text-on-surface m-0">
                {{ msg.subject || '(sin asunto)' }}
              </h3>
              <p class="font-caption text-caption text-on-surface-variant m-0">
                {{ formatBogotaDateTime(msg.received_at) }} · {{ msg.sender || '—' }}
              </p>
            </div>

            <section class="flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="font-label-compact text-label-compact text-on-surface"
                  >Contenido del mensaje</span
                >
                @if (msg.body_text) {
                  <button
                    type="button"
                    class="font-caption text-caption text-primary-container border-0 bg-transparent cursor-pointer"
                    (click)="copyText(msg.body_text)"
                  >
                    Copiar texto
                  </button>
                }
              </div>
              @if (msg.body_text) {
                <pre
                  class="m-0 p-3 rounded-lg bg-surface-container-low text-body-compact text-on-surface whitespace-pre-wrap break-words font-sans max-h-64 overflow-y-auto"
                  >{{ msg.body_text }}</pre
                >
                @if (msg.body_truncated) {
                  <p class="font-caption text-caption text-on-surface-variant m-0">
                    Contenido recortado
                  </p>
                }
              } @else {
                <p class="font-caption text-caption text-on-surface-variant m-0">
                  El correo no tiene texto plano.
                </p>
              }
            </section>

            <section class="flex flex-col gap-2">
              <span class="font-label-compact text-label-compact text-on-surface"
                >Archivos adjuntos ({{ msg.attachments.length }})</span
              >
              @if (msg.attachments_skipped > 0) {
                <p class="font-caption text-caption text-on-surface-variant m-0">
                  {{ msg.attachments_skipped }} adjunto{{
                    msg.attachments_skipped === 1 ? '' : 's'
                  }}
                  no PDF no se guardaron
                </p>
              }
              @for (a of msg.attachments; track a.id) {
                <div
                  class="flex items-center justify-between gap-2 bg-surface-container-low rounded-lg px-3 py-2"
                >
                  <div class="min-w-0">
                    <p class="font-body-compact text-body-compact text-on-surface m-0 truncate">
                      {{ a.filename }}
                    </p>
                    <p class="font-caption text-caption text-on-surface-variant m-0">
                      {{ formatBytes(a.size_bytes) }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                    @if (a.document_status === 'extracted') {
                      <a
                        class="font-caption text-caption text-primary-container no-underline"
                        [href]="'/documents/' + a.id"
                        (click)="$event.stopPropagation()"
                        >Ver identificación</a
                      >
                    }
                    <button
                      type="button"
                      class="font-caption text-caption text-on-surface-variant border-0 bg-transparent cursor-pointer"
                      (click)="download.emit(a.id)"
                    >
                      Descargar
                    </button>
                  </div>
                </div>
              }
            </section>
          }
        </div>

        <footer class="p-4 border-t border-outline-variant/30 shrink-0">
          <p class="font-caption text-caption text-on-surface-variant m-0 mb-2">
            Asignar a un proceso
          </p>
          <button
            type="button"
            class="w-full bg-primary-container text-on-primary px-3 py-2 rounded-lg font-label-default text-label-default border-0 cursor-pointer"
            (click)="assign.emit()"
          >
            Asignar a proceso
          </button>
        </footer>
      </aside>
    </div>
  `,
})
export class UnassignedMessageDrawer {
  readonly row = input.required<UnassignedMessage>();
  readonly message = input<MessageDetail | null>(null);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly close = output<void>();
  readonly assign = output<void>();
  readonly download = output<string>();

  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly formatBytes = formatBytes;

  async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }
}
