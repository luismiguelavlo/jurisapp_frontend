import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-mail-connections-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <header
      class="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-lg pb-space-md"
    >
      <div>
        <div class="flex items-center gap-space-xs mb-space-xs">
          <span class="text-caption uppercase tracking-wider text-on-surface-variant font-medium"
            >Infraestructura Clínica HL7/FHIR</span
          >
        </div>
        <h1 class="text-headline-lg text-on-surface font-semibold tracking-tight">
          Conexiones de correo
        </h1>
        <p class="text-body-default text-on-surface-variant mt-1 mb-0">
          Buzones corporativos sincronizados para extracción exclusiva de metadatos clínicos.
        </p>
      </div>

      @if (auth.canManage()) {
        <div class="flex items-center gap-space-xs">
          <button
            type="button"
            class="h-9 px-3.5 bg-primary-container text-on-primary hover:bg-primary text-label-default font-medium rounded-lg inline-flex items-center gap-space-xs transition-colors cursor-pointer"
            (click)="connectClick.emit()"
          >
            <app-material-icon name="add" [size]="16" />
            <span>Conectar buzón</span>
          </button>
        </div>
      }
    </header>
  `,
})
export class MailConnectionsHeader {
  readonly auth = inject(AuthService);
  readonly connectClick = output<void>();
}
