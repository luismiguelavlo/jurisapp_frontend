import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MaterialIcon } from '../../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-security-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="w-full max-w-[360px] text-center mt-5 space-y-2">
      <p class="text-caption text-zinc-400 dark:text-zinc-500">
        Conexión encriptada TLS 1.3 • Cumplimiento HIPAA / RGPD
      </p>
      <div
        class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500 dark:text-zinc-400 text-caption"
      >
        <app-material-icon name="shield" [size]="14" className="text-brand shrink-0" />
        <span class="text-left leading-tight text-[12px]">
          Solo metadatos: los cuerpos y adjuntos nunca se almacenan
        </span>
      </div>
    </div>
  `,
})
export class SecurityNotice {}
