import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { caseStatusLabel, caseStatusTone } from '../../../../core/api/document-labels';
import type { CaseDetail } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatBytes,
  remainingLabel,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { RadicadoMark } from '../../../../shared/components/radicado-mark/radicado-mark';

/**
 * Carátula del expediente: radicado, despacho, estado y los cuatro datos
 * que se miran a diario (accionante, vencimiento, respuestas, contenido).
 */
@Component({
  selector: 'app-case-summary-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, RadicadoMark],
  template: `
    @let c = caso();
    <section class="bg-surface-container-lowest rounded-xl shadow-sm">
      <div class="px-5 pt-4 pb-5 flex flex-col gap-3">
        <button
          type="button"
          class="self-start text-caption text-on-surface-variant hover:text-primary border-0 bg-transparent cursor-pointer p-0 inline-flex items-center gap-1"
          (click)="back.emit()"
        >
          <app-material-icon name="arrow_back" [size]="14" />
          Procesos
        </button>

        <div class="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          <div class="min-w-0 flex flex-col gap-1.5">
            <h1 class="m-0 font-sans">
              <app-radicado-mark [value]="c.radicado" size="xl" />
            </h1>
            @if (juzgado()) {
              <p class="m-0 text-body-default text-on-surface">{{ juzgado() }}</p>
            }
          </div>
          <span
            class="px-2.5 py-1 rounded-full text-label-compact shrink-0"
            [class]="caseStatusTone(c.estado)"
          >
            {{ caseStatusLabel(c.estado) }}
          </span>
        </div>
      </div>

      <dl
        class="m-0 grid grid-cols-2 lg:grid-cols-4 border-t border-outline-variant/60 divide-outline-variant/60 lg:divide-x [&>div]:px-5 [&>div]:py-3.5"
      >
        <div class="min-w-0">
          <dt class="text-caption text-on-surface-variant">Accionante</dt>
          <dd class="m-0 mt-1 text-body-default text-on-surface font-medium truncate">
            {{ accionante() || 'Sin identificar' }}
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-caption text-on-surface-variant">Próximo vencimiento</dt>
          <dd class="m-0 mt-1 text-body-default">
            @if (c.proximo_vencimiento) {
              <time class="text-on-surface font-medium">{{
                formatBogotaDateTime(c.proximo_vencimiento)
              }}</time>
              @if (remainingLabel(c.proximo_vencimiento); as rem) {
                <span class="block text-caption" [class]="remainingTone()">{{ rem }}</span>
              }
            } @else {
              <span class="text-on-surface-variant">Sin término</span>
            }
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-caption text-on-surface-variant">Respuestas</dt>
          <dd class="m-0 mt-1 text-body-default text-on-surface">
            @if (responded(); as r) {
              <span class="font-medium tabular-nums">{{ r.ok }} de {{ r.total }}</span>
              <span class="text-on-surface-variant"> con término</span>
              <span class="mt-1.5 block h-1 rounded-full bg-surface-container overflow-hidden">
                <span class="block h-full bg-primary" [style.width.%]="r.pct"></span>
              </span>
            } @else {
              <span class="text-on-surface-variant">Ninguna providencia exige respuesta</span>
            }
          </dd>
        </div>
        <div class="min-w-0">
          <dt class="text-caption text-on-surface-variant">Expediente</dt>
          <dd class="m-0 mt-1 text-body-default text-on-surface" [attr.title]="formatBytes(sizeBytes())">
            <span class="tabular-nums">{{ itemCount() }}</span>
            archivo{{ itemCount() === 1 ? '' : 's' }} en
            <span class="tabular-nums">{{ folderCount() }}</span>
            carpeta{{ folderCount() === 1 ? '' : 's' }}
            <span class="block text-caption text-on-surface-variant"
              >{{ c.mensajes_count }} correo{{ c.mensajes_count === 1 ? '' : 's' }}, último aporte
              {{ lastAporteLabel() }}</span
            >
          </dd>
        </div>
      </dl>
    </section>
  `,
})
export class CaseSummaryHeader {
  readonly caso = input.required<CaseDetail>();
  readonly folderCount = input(0);
  readonly itemCount = input(0);
  readonly sizeBytes = input(0);
  readonly lastCreatedAt = input<string | null>(null);
  readonly accionante = input<string | null>(null);
  readonly back = output<void>();

  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly formatBytes = formatBytes;
  readonly remainingLabel = remainingLabel;
  readonly caseStatusLabel = caseStatusLabel;
  readonly caseStatusTone = caseStatusTone;

  readonly lastAporteLabel = computed(() => {
    const iso = this.lastCreatedAt();
    return iso ? formatBogotaDateTime(iso) : 'sin fecha';
  });

  readonly remainingTone = computed(() => {
    switch (this.caso().estado) {
      case 'vencido':
        return 'text-error font-medium';
      case 'por_vencer':
        return 'text-tertiary font-medium';
      default:
        return 'text-on-surface-variant';
    }
  });

  readonly juzgado = computed(() => {
    const timeline = this.caso().timeline;
    for (let i = timeline.length - 1; i >= 0; i--) {
      const j = timeline[i]?.juzgado?.trim();
      if (j) return j;
    }
    return null;
  });

  readonly responded = computed(() => {
    const withTerm = this.caso().timeline.filter((e) => e.respuesta_estado !== 'no_requiere');
    if (withTerm.length === 0) return null;
    const ok = withTerm.filter((e) => e.respuesta_estado === 'respondido').length;
    return { ok, total: withTerm.length, pct: Math.round((ok / withTerm.length) * 100) };
  });
}
