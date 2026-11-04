import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  caseStatusLabel,
  caseStatusTone,
} from '../../../../core/api/document-labels';
import type { CaseDetail } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatBytes,
  formatRadicado,
  remainingLabel,
} from '../../../../core/utils/date-format';

@Component({
  selector: 'app-case-summary-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <section class="grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div
        class="lg:col-span-8 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between gap-4"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1 flex-wrap">
              <button
                type="button"
                class="font-caption text-caption text-on-surface-variant hover:text-primary border-0 bg-transparent cursor-pointer p-0 inline-flex items-center gap-1"
                (click)="back.emit()"
              >
                <app-material-icon name="arrow_back" [size]="14" />
                Procesos
              </button>
              @if (juzgado()) {
                <span class="font-caption text-caption text-on-surface-variant">•</span>
                <span class="font-caption text-caption text-primary font-medium">{{ juzgado() }}</span>
              }
            </div>
            <h1 class="font-headline-md text-headline-md text-on-surface font-mono m-0 break-all">
              {{ formatRadicado(caso().radicado) }}
            </h1>
            <p class="font-body-default text-body-default text-on-surface-variant mt-1 m-0">
              {{ caso().providencias }} providencia{{ caso().providencias === 1 ? '' : 's' }}
              · {{ caso().mensajes_count }} correo{{ caso().mensajes_count === 1 ? '' : 's' }}
              @if (accionante()) {
                · Accionante: {{ accionante() }}
              }
              @if (caso().proximo_vencimiento) {
                · Próximo vencimiento {{ formatBogotaDateTime(caso().proximo_vencimiento) }}
                @if (remainingLabel(caso().proximo_vencimiento); as rem) {
                  ({{ rem }})
                }
              }
            </p>
          </div>
          <span
            class="px-2.5 py-1 rounded-lg font-label-compact text-label-compact shrink-0"
            [class]="caseStatusTone(caso().estado)"
          >
            {{ caseStatusLabel(caso().estado) }}
            @if (remainingLabel(caso().proximo_vencimiento); as rem) {
              ({{ rem }})
            }
          </span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div class="bg-surface-container-low p-2.5 rounded-lg">
            <span class="font-caption text-caption text-on-surface-variant block">Documentos</span>
            <span class="font-headline-sm text-headline-sm text-on-surface"
              >{{ itemCount() }} archivo{{ itemCount() === 1 ? '' : 's' }}</span
            >
          </div>
          <div class="bg-surface-container-low p-2.5 rounded-lg">
            <span class="font-caption text-caption text-on-surface-variant block">Estructura</span>
            <span class="font-headline-sm text-headline-sm text-on-surface"
              >{{ folderCount() }} carpeta{{ folderCount() === 1 ? '' : 's' }}</span
            >
          </div>
          <div class="bg-surface-container-low p-2.5 rounded-lg">
            <span class="font-caption text-caption text-on-surface-variant block">Último aporte</span>
            <span class="font-headline-sm text-headline-sm text-on-surface">{{
              lastAporteLabel()
            }}</span>
          </div>
          <div class="bg-surface-container-low p-2.5 rounded-lg">
            <span class="font-caption text-caption text-on-surface-variant block">Almacenamiento</span>
            <span class="font-headline-sm text-headline-sm text-on-surface">{{
              formatBytes(sizeBytes())
            }}</span>
          </div>
        </div>
      </div>

      <div
        class="lg:col-span-4 bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col justify-between"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <span class="font-label-default text-label-default text-on-surface"
              >Providencias respondidas</span
            >
            <span class="font-label-compact text-label-compact text-primary-container">{{
              respondedLabel()
            }}</span>
          </div>
          @if (respondedPct() != null) {
            <div class="w-full bg-surface-container-low h-2 rounded-full overflow-hidden mb-4">
              <div
                class="bg-primary-container h-full rounded-full"
                [style.width.%]="respondedPct()"
              ></div>
            </div>
          }
          <p class="font-caption text-caption text-on-surface-variant leading-relaxed m-0">
            @if (caso().proximo_vencimiento) {
              Próximo vencimiento:
              {{ formatBogotaDateTime(caso().proximo_vencimiento) }}
              @if (remainingLabel(caso().proximo_vencimiento); as rem) {
                ({{ rem }}).
              }
            } @else {
              Sin término de vencimiento registrado en este expediente.
            }
          </p>
        </div>
      </div>
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

  readonly formatRadicado = formatRadicado;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly formatBytes = formatBytes;
  readonly remainingLabel = remainingLabel;
  readonly caseStatusLabel = caseStatusLabel;
  readonly caseStatusTone = caseStatusTone;

  readonly lastAporteLabel = computed(() => {
    const iso = this.lastCreatedAt();
    if (!iso) return '—';
    return formatBogotaDateTime(iso);
  });

  readonly juzgado = computed(() => {
    const timeline = this.caso().timeline;
    for (let i = timeline.length - 1; i >= 0; i--) {
      const j = timeline[i]?.juzgado?.trim();
      if (j) return j;
    }
    return null;
  });

  readonly respondedPct = computed(() => {
    const t = this.caso().timeline;
    const withTerm = t.filter((e) => e.respuesta_estado !== 'no_requiere');
    if (withTerm.length === 0) return null;
    const ok = withTerm.filter((e) => e.respuesta_estado === 'respondido').length;
    return Math.round((ok / withTerm.length) * 100);
  });

  readonly respondedLabel = computed(() => {
    const pct = this.respondedPct();
    if (pct == null) return '—';
    const t = this.caso().timeline;
    const withTerm = t.filter((e) => e.respuesta_estado !== 'no_requiere').length;
    const ok = t.filter((e) => e.respuesta_estado === 'respondido').length;
    return `${ok}/${withTerm} · ${pct}%`;
  });
}
