import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import type { MailProvider } from '../../models/connect-mailbox.models';

@Component({
  selector: 'app-oauth-consent-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="flex flex-col gap-space-sm">
      <div class="bg-surface-container-low p-3.5 rounded-[6px] flex items-start gap-space-sm">
        <app-material-icon
          name="verified_user"
          [size]="18"
          className="text-primary-container shrink-0 mt-0.5"
        />
        <div class="flex flex-col gap-0.5">
          <span class="text-label-compact text-on-surface font-medium"
            >Consentimiento de seguridad federada</span
          >
          <p class="text-caption text-on-surface-variant mb-0">
            Serás redirigido a la pantalla de consentimiento de
            <span class="font-medium text-on-surface">{{ providerLabel() }}</span>
            {{ explanationSuffix() }}
          </p>
        </div>
      </div>
      <div class="flex items-center justify-between px-space-xs">
        <span class="text-caption text-on-surface-variant">
          Alcance solicitado:
          <code class="text-on-surface bg-surface-container-high px-1 py-0.5 rounded-[4px]"
            >Mail.Read.Shared</code
          >
        </span>
        <span class="text-caption text-primary-container flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
          Auditoría HIPAA activa
        </span>
      </div>
    </div>
  `,
})
export class OauthConsentPanel {
  readonly provider = input.required<Exclude<MailProvider, 'imap'>>();

  readonly providerLabel = computed(() =>
    this.provider() === 'microsoft' ? 'Microsoft 365' : 'Google Workspace',
  );

  readonly explanationSuffix = computed(() =>
    this.provider() === 'microsoft'
      ? 'para autorizar la lectura de metadatos clínicos. Ninguna contraseña de usuario se almacena localmente.'
      : 'para conceder permisos seguros al conector clínico. Ninguna contraseña de usuario se almacena localmente.',
  );
}
