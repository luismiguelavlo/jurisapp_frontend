import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { MessageAnalysis, MessageAnalysisState } from '../../../../core/api/types';
import { ProfileAiSummary } from '../../../case-profile/components/profile-ai-summary/profile-ai-summary';
import { ProfileIdentificacion } from '../../../case-profile/components/profile-identificacion/profile-identificacion';
import { ProfileObjeto } from '../../../case-profile/components/profile-objeto/profile-objeto';
import { buildMessageIdentificacion } from '../../ficha-overview';

/** Ficha del correo en modo lectura: resumen con IA, identificación del proceso y objeto. */
@Component({
  selector: 'app-ficha-resumen',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProfileAiSummary, ProfileIdentificacion, ProfileObjeto],
  host: { class: 'flex flex-col gap-4 min-w-0' },
  template: `
    @let f = ficha();
    <app-profile-ai-summary [text]="resumen()" [reviewed]="state().origen === 'revision'" />
    <app-profile-identificacion [data]="identificacion()" />
    <app-profile-objeto
      [objeto]="f.objeto"
      [tecnologias]="f.tecnologias"
      [derechos]="f.derechos_invocados"
      [lugar]="f.lugar_atencion"
    />
  `,
})
export class FichaResumen {
  readonly ficha = input.required<MessageAnalysis>();
  readonly state = input.required<MessageAnalysisState>();
  readonly recibidoAt = input<string | null>(null);

  readonly resumen = computed(() => {
    const f = this.ficha();
    return f.hechos_resumen?.trim() || f.resumen_lectura?.trim() || null;
  });

  readonly identificacion = computed(() =>
    buildMessageIdentificacion(this.ficha(), this.state(), this.recibidoAt()),
  );
}
