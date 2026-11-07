import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { radicadoSourceLabel } from '../../../../core/api/document-labels';
import type { EmailConnection, InboxMessage } from '../../../../core/api/types';
import { formatBogotaDateTime, relativeFromNow } from '../../../../core/utils/date-format';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { RadicadoMark } from '../../../../shared/components/radicado-mark/radicado-mark';

/** Cabecera del correo: origen, caso asignado (o acción para asignarlo) y aviso de conflicto. */
@Component({
  selector: 'app-message-detail-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon, RadicadoMark, AlertBanner],
  template: `
    @let m = message();
    <header class="bg-surface-container-lowest rounded-xl shadow-sm px-5 sm:px-6 py-5 flex flex-col gap-4">
      <button
        type="button"
        class="self-start inline-flex items-center gap-1 text-caption text-on-surface-variant border-0 bg-transparent cursor-pointer p-0 hover:text-on-surface"
        (click)="back.emit()"
      >
        <app-material-icon name="arrow_back" [size]="15" />
        Bandeja
      </button>

      <div class="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div class="flex flex-col gap-1 min-w-0">
          <h1 class="m-0 text-headline-md text-on-surface break-words">
            {{ m.correo.asunto || '(Sin asunto)' }}
          </h1>
          <p class="m-0 text-body-compact text-on-surface-variant flex flex-wrap gap-x-3 gap-y-1">
            <span class="inline-flex items-center gap-1 min-w-0">
              <app-material-icon name="person" [size]="14" />
              <span class="font-mono break-all">{{ m.correo.remitente || 'Remitente desconocido' }}</span>
            </span>
            @if (connection()?.mailbox_address; as box) {
              <span class="inline-flex items-center gap-1">
                <app-material-icon name="mail" [size]="14" />
                {{ box }}
              </span>
            }
            <span class="inline-flex items-center gap-1" [title]="formatBogotaDateTime(m.correo.recibido_at)">
              <app-material-icon name="schedule" [size]="14" />
              Fecha de notificación: {{ received() }}
            </span>
            <span class="inline-flex items-center gap-1">
              <app-material-icon name="attach_file" [size]="14" />
              {{ m.documentos_count }} {{ m.documentos_count === 1 ? 'documento' : 'documentos' }}
            </span>
          </p>
        </div>

        <div class="flex flex-col items-start lg:items-end gap-1 shrink-0">
          <span class="text-caption text-on-surface-variant">Proceso</span>
          @if (m.caso.case_id && m.caso.radicado) {
            <a
              class="no-underline text-inherit hover:opacity-80 inline-flex items-center gap-1"
              [routerLink]="['/cases', m.caso.case_id]"
              title="Abrir el proceso"
            >
              <app-radicado-mark [value]="m.caso.radicado" size="md" />
              <app-material-icon name="arrow_outward" [size]="14" className="text-primary" />
            </a>
            <span class="text-caption text-on-surface-variant">
              Por {{ radicadoSourceLabel(m.caso.radicado_source) }}
            </span>
          } @else {
            <span class="text-body-compact text-on-surface-variant">Sin clasificar</span>
          }
          @if (canAssign()) {
            <button
              type="button"
              class="mt-1 inline-flex items-center gap-1.5 h-8 px-3 rounded-[4px] border border-outline-variant bg-transparent text-label-compact text-on-surface cursor-pointer hover:bg-surface-container-low"
              (click)="assign.emit()"
            >
              <app-material-icon name="account_tree" [size]="15" />
              {{ m.caso.case_id ? 'Mover a otro proceso' : 'Asignar a caso' }}
            </button>
          }
        </div>
      </div>

      @if (m.caso.radicado_conflicto) {
        <app-alert-banner variant="warning" title="Radicados distintos: revisar">
          Algún documento de este correo trae un radicado diferente al del proceso asignado.
          Revisa la asignación del correo.
        </app-alert-banner>
      }
    </header>
  `,
})
export class MessageDetailHeader {
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly radicadoSourceLabel = radicadoSourceLabel;

  readonly message = input.required<InboxMessage>();
  readonly connection = input<EmailConnection | null>(null);
  readonly canAssign = input(true);
  readonly back = output<void>();
  readonly assign = output<void>();

  readonly received = computed(() => {
    const iso = this.message().correo.recibido_at;
    if (!iso) return '—';
    return `${formatBogotaDateTime(iso)} (${relativeFromNow(iso)})`;
  });
}
