import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-mailbox-meta-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <footer
      class="mt-space-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-md text-on-surface-variant text-caption"
    >
      <div class="flex items-center gap-space-xs">
        <app-material-icon name="verified_user" [size]="16" className="text-primary" />
        <span>{{ summary() }}</span>
      </div>
      <div class="flex items-center gap-space-md">
        <span>Cifrado TLS 1.3 de extremo a extremo</span>
        <span class="w-1 h-1 rounded-full bg-outline-variant"></span>
        <span class="text-on-surface font-medium">Cumplimiento HIPAA / SOC2 Tipo II</span>
      </div>
    </footer>
  `,
})
export class MailboxMetaFooter {
  readonly summary = input(
    '6 buzones configurados (4 activos, 1 con advertencia, 1 desconectado). Cuota de metadatos: 142,390 eventos procesados.',
  );
}
