import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-oauth-success-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MaterialIcon],
  template: `
    <div class="flex flex-col">
      <div class="flex items-center justify-between mb-space-lg">
        <div
          class="w-10 h-10 rounded-xl bg-secondary-container/40 flex items-center justify-center text-primary"
        >
          <app-material-icon name="check_circle" [size]="20" />
        </div>
        <div
          class="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary-container/30 text-primary text-label-compact font-medium"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
          Conexión activa
        </div>
      </div>

      <div class="flex flex-col gap-space-xs mb-space-lg">
        <h1 class="text-headline-md text-on-surface tracking-tight m-0">Buzón conectado</h1>
        <p class="text-body-default text-on-surface-variant mb-0">
          Se verificó la autorización con
          <span class="font-medium text-on-surface">{{ provider() }}</span> para
          <span class="font-medium text-on-surface">{{ email() }}</span
          >. La sincronización de metadatos clínicos comenzará en segundo plano.
        </p>
      </div>

      <div class="bg-surface-container-low rounded-xl p-space-md mb-space-xl flex flex-col gap-2.5">
        <div class="flex items-center justify-between text-label-compact">
          <span class="text-outline">Proveedor</span>
          <span class="text-on-surface font-medium flex items-center gap-1">
            <app-material-icon name="verified_user" [size]="15" className="text-outline" />
            Microsoft Entra ID (OIDC)
          </span>
        </div>
        <div class="flex items-center justify-between text-label-compact">
          <span class="text-outline">Permisos concedidos</span>
          <span
            class="text-on-surface font-medium bg-surface-container-lowest px-2 py-0.5 rounded-lg"
          >
            Mail.ReadWrite, offline_access
          </span>
        </div>
        <div class="flex items-center justify-between text-label-compact">
          <span class="text-outline">Tipo de autenticación</span>
          <span class="text-on-surface font-medium">OAuth 2.0 con PKCE (FIPS 140-3)</span>
        </div>
        <div class="flex items-center justify-between text-label-compact">
          <span class="text-outline">Registro de auditoría</span>
          <span class="font-mono text-outline text-[11px]">{{ auditId() }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-space-sm">
        <a
          [routerLink]="mailboxId() ? ['/conexiones', mailboxId()] : ['/conexiones']"
          class="w-full h-10 bg-primary hover:bg-primary-container text-on-primary text-label-default font-medium rounded-lg flex items-center justify-center gap-2 shadow-sm transition-colors"
        >
          <span>Ver conexión</span>
          <app-material-icon name="arrow_forward" [size]="16" />
        </a>
        <a
          routerLink="/conexiones"
          class="w-full h-9 flex items-center justify-center text-center text-label-compact text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Volver a Conexiones de correo
        </a>
      </div>
    </div>
  `,
})
export class OauthSuccessView {
  readonly provider = input('Microsoft 365');
  readonly email = input('urgencias@clinicasanrafael.com');
  readonly mailboxId = input('1');
  readonly auditId = input('AUT-9821-X9B');
}
