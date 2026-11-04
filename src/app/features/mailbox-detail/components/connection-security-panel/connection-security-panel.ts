import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { errorText } from '../../../../core/api/errors';
import type { EmailConnection } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { MailboxDetail } from '../../models/mailbox-detail.models';

@Component({
  selector: 'app-connection-security-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section class="bg-surface-container-lowest rounded-[6px] overflow-hidden">
      <div class="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between">
        <div class="flex items-center gap-space-xs">
          <app-material-icon name="security" [size]="16" className="text-on-surface-variant" />
          <h2 class="text-headline-sm text-on-surface font-semibold m-0">
            Parámetros de conexión y seguridad FHIR/HL7
          </h2>
        </div>
        <span class="text-caption text-outline font-mono">TLS 1.3 / OAuth 2.0 PKCE</span>
      </div>

      <dl class="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-surface-container-low m-0">
        <div class="p-space-md flex flex-col gap-space-md">
          <div class="flex flex-col gap-0.5">
            <dt class="text-caption text-on-surface-variant font-medium">Proveedor de correo</dt>
            <dd class="text-body-default text-on-surface m-0">{{ mailbox().providerLabel }}</dd>
          </div>
          @if (connection()?.imap_host) {
            <div class="flex flex-col gap-0.5">
              <dt class="text-caption text-on-surface-variant font-medium">Servidor IMAP</dt>
              <dd class="text-body-default text-on-surface font-mono text-[13px] m-0">
                {{ connection()?.imap_host }}:{{ connection()?.imap_port ?? 993 }}
              </dd>
            </div>
          }
          <div class="flex flex-col gap-1">
            <dt class="text-caption text-on-surface-variant font-medium">Alcances otorgados</dt>
            <dd class="flex items-center gap-1.5 flex-wrap m-0">
              @for (scope of connection()?.granted_scopes ?? []; track scope) {
                <span
                  class="font-mono text-[11px] px-1.5 py-0.5 rounded-[4px] bg-surface-container text-on-surface"
                  >{{ scope }}</span
                >
              } @empty {
                <span class="text-caption text-on-surface-variant">Sin alcances registrados</span>
              }
            </dd>
          </div>
        </div>

        <div class="p-space-md flex flex-col gap-space-md">
          <div class="flex flex-col gap-0.5">
            <dt class="text-caption text-on-surface-variant font-medium">Último error</dt>
            <dd class="text-body-default text-on-surface m-0">{{ lastError() }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-caption text-on-surface-variant font-medium">Conectada el</dt>
            <dd class="text-body-default text-on-surface m-0">{{ mailbox().linkedAt }}</dd>
          </div>
          <div class="flex flex-col gap-0.5">
            <dt class="text-caption text-on-surface-variant font-medium">Privacidad</dt>
            <dd class="text-body-compact text-on-surface-variant m-0">
              Modo Metadata-Only: cuerpos y adjuntos no se persisten en disco.
            </dd>
          </div>
        </div>
      </dl>
    </section>
  `,
})
export class ConnectionSecurityPanel {
  readonly mailbox = input.required<MailboxDetail>();
  readonly connection = input<EmailConnection | null>(null);

  readonly lastError = computed(() => {
    const code = this.connection()?.last_error_code;
    return code ? errorText(code) : 'Ninguno reportado';
  });
}
