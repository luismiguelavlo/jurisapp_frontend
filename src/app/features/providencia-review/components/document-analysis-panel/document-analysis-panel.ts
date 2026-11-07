import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TIPO_DOCUMENTO } from '../../../../core/api/ficha-labels';
import type { DocumentAnalysis } from '../../../../core/api/types';
import { ActuacionCard } from '../../../../shared/components/actuacion-card/actuacion-card';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { ToneBadge } from '../../../../shared/components/tone-badge/tone-badge';

/**
 * Análisis de un solo documento (SPEC 21 §6). Sin indicadores de la entidad:
 * la vista consolidada es la ficha del caso.
 */
@Component({
  selector: 'app-document-analysis-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActuacionCard, AlertBanner, MaterialIcon, ToneBadge],
  template: `
    @let a = analysis();
    <section class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-3">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="m-0 font-headline-sm text-headline-sm text-on-surface flex items-center gap-1.5">
          <app-material-icon name="auto_awesome" [size]="18" />
          Análisis
        </h2>
        <app-tone-badge tone="info">{{ tipoDocumento(a) }}</app-tone-badge>
      </header>

      @if (a.observaciones) {
        <app-alert-banner variant="warning" title="Observaciones del análisis">
          {{ a.observaciones }}
        </app-alert-banner>
      }

      @if (a.objeto) {
        <div>
          <p class="m-0 text-caption text-on-surface-variant">Objeto</p>
          <p class="m-0 text-body-default text-on-surface">{{ a.objeto }}</p>
        </div>
      }
      @if (a.hechos_resumen) {
        <div>
          <p class="m-0 text-caption text-on-surface-variant">
            Hechos · resumen generado, verifícalo con el documento
          </p>
          <p class="m-0 text-body-compact text-on-surface whitespace-pre-line">
            {{ a.hechos_resumen }}
          </p>
        </div>
      }

      @if (a.actuaciones.length) {
        <div class="flex flex-col gap-2">
          <p class="m-0 text-caption text-on-surface-variant">Actuaciones del documento</p>
          @for (act of a.actuaciones; track $index) {
            <app-actuacion-card [actuacion]="act" />
          }
        </div>
      }

      @if (caseId(); as id) {
        <button
          type="button"
          class="self-start text-caption text-primary hover:underline border-0 bg-transparent cursor-pointer p-0"
          (click)="openCaseProfile.emit(id)"
        >
          Ver la ficha completa del caso
        </button>
      }
    </section>
  `,
})
export class DocumentAnalysisPanel {
  readonly analysis = input.required<DocumentAnalysis>();
  readonly caseId = input<string | null>(null);
  readonly openCaseProfile = output<string>();

  tipoDocumento(a: DocumentAnalysis): string {
    return TIPO_DOCUMENTO[a.tipo_documento] ?? 'Documento';
  }
}
