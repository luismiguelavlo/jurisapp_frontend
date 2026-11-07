import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MaterialIcon } from '../../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-security-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <p class="m-0 flex items-start gap-2 px-1 text-caption text-on-surface-variant leading-5">
      <app-material-icon name="shield" [size]="16" className="text-primary shrink-0 mt-0.5" />
      <span>
        La conexión va cifrada. Antes de analizar un documento, JurisApp oculta los nombres,
        cédulas y contactos del paciente.
      </span>
    </p>
  `,
})
export class SecurityNotice {}
