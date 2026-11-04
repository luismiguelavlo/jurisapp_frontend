import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  caseStatusLabel,
  caseStatusTone,
  providenciaTitle,
  responseStatusLabel,
} from '../../../../core/api/document-labels';
import type { CaseDetail, DocumentDetail } from '../../../../core/api/types';
import {
  formatBogotaDateTime,
  formatRadicado,
  remainingLabel,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-process-association-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, RouterLink],
  template: `
    <article class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
      <div
        class="flex items-center justify-between mb-space-sm pb-space-xs border-b border-surface-container-high"
      >
        <h2 class="text-headline-sm text-on-surface flex items-center gap-space-xs m-0">
          <app-material-icon name="account_tree" [size]="18" className="text-primary" />
          <span>Proceso identificado</span>
        </h2>
      </div>

      @if (mode() === 'asociado' && caso(); as c) {
        <div class="flex flex-col gap-space-sm">
          <div class="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1.5">
            <div class="flex flex-wrap items-center justify-between gap-1">
              <div class="flex items-center gap-2">
                <span class="font-mono text-body-medium font-semibold text-on-surface"
                  >Expediente No. {{ formatRadicado(c.radicado) }}</span
                >
                <span
                  class="px-2 py-0.5 rounded-[6px] text-caption font-semibold"
                  [class]="caseStatusTone(c.estado)"
                  >{{ caseStatusLabel(c.estado) }}</span
                >
              </div>
              <a
                class="text-caption text-primary hover:underline flex items-center gap-0.5 no-underline"
                [routerLink]="['/cases', c.id]"
              >
                <span>Abrir expediente</span>
                <app-material-icon name="arrow_outward" [size]="13" />
              </a>
            </div>
            <p class="text-caption text-on-surface-variant m-0">
              {{ c.providencias }} providencia(s)
            </p>
          </div>

          <div class="mt-1">
            <span
              class="text-caption font-semibold uppercase tracking-wider text-on-surface-variant block mb-2"
            >
              Historial de providencias ({{ timeline().length }})
            </span>
            <div
              class="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-high"
            >
              @for (item of timeline(); track item.attachment_id) {
                <a
                  class="relative block no-underline text-inherit"
                  [routerLink]="['/documents', item.attachment_id]"
                >
                  <div
                    class="absolute -left-[27px] top-1 w-3 h-3 rounded-full"
                    [class]="
                      item.attachment_id === doc().attachment_id
                        ? 'bg-primary ring-4 ring-primary/20'
                        : 'bg-outline-variant'
                    "
                  ></div>
                  <div class="flex items-baseline justify-between gap-2">
                    <span
                      class="text-xs"
                      [class]="
                        item.attachment_id === doc().attachment_id
                          ? 'font-semibold text-primary'
                          : 'font-medium text-on-surface-variant'
                      "
                    >
                      {{ formatBogotaDateTime(item.notified_at) }}
                      @if (item.attachment_id === doc().attachment_id) {
                        (ACTUAL)
                      }
                    </span>
                    <span class="px-1.5 py-0.5 rounded text-[11px] font-medium bg-surface-container text-on-surface-variant">
                      {{ responseStatusLabel(item.respuesta_estado, item.a_tiempo) }}
                    </span>
                  </div>
                  <p class="text-body-compact text-on-surface m-0 font-medium">
                    {{ providenciaTitle(item.clase, item.subtipo) }}
                  </p>
                  <p class="text-caption text-on-surface-variant m-0">
                    @if (item.termino) {
                      Término: {{ item.termino.cantidad }}
                      {{ item.termino.unidad.replace('_', ' ') }}
                    }
                    @if (item.vence_at) {
                      · Vence {{ formatBogotaDateTime(item.vence_at) }}
                      @if (remainingLabel(item.vence_at); as rem) {
                        ({{ rem }})
                      }
                    }
                  </p>
                </a>
              }
            </div>
          </div>
        </div>
      }

      @if (mode() === 'nuevo' && caso(); as c) {
        <div class="p-3 rounded-lg bg-[#F0FDF4] flex items-start gap-3">
          <app-material-icon name="add_circle" [size]="20" className="text-[#15803D] shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1">
            <span class="text-label-default font-semibold text-[#166534]"
              >Primera providencia de este radicado</span
            >
            <p class="text-caption text-[#14532D] m-0">
              El caso se creó al identificar el radicado
              <strong>{{ formatRadicado(c.radicado) }}</strong
              >. Esta providencia es la actuación inicial del expediente.
            </p>
            <a
              class="text-caption text-primary hover:underline mt-1"
              [routerLink]="['/cases', c.id]"
              >Abrir expediente</a
            >
          </div>
        </div>
      }

      @if (mode() === 'sin_radicado') {
        <div class="p-3 rounded-lg bg-[#FEF2F2] flex items-start gap-3">
          <app-material-icon name="link_off" [size]="20" className="text-error shrink-0 mt-0.5" />
          <div class="flex flex-col gap-1 w-full">
            <span class="text-label-default font-semibold text-[#991B1B]"
              >Sin radicado: no se puede asociar automáticamente</span
            >
            <p class="text-caption text-[#7F1D1D] m-0">
              Ingrese el radicado judicial en el formulario y confirme los datos. Al guardar, el
              sistema creará o asociará el caso.
            </p>
            <div class="mt-2 flex flex-col sm:flex-row gap-2">
              <input
                class="flex-1 h-8 px-2 rounded bg-white text-body-compact text-on-surface focus:outline-none focus:ring-1 focus:ring-primary shadow-xs border-0 font-mono"
                placeholder="Radicado (21 o 23 dígitos)"
                [value]="draftRadicado()"
                (input)="onRadicadoInput($event)"
              />
              <button
                type="button"
                class="px-3 h-8 rounded bg-on-surface text-surface text-caption font-medium hover:bg-zinc-800 transition-colors border-0 cursor-pointer"
                (click)="saveRadicado.emit()"
              >
                Guardar radicado
              </button>
            </div>
          </div>
        </div>
      }
    </article>
  `,
})
export class ProcessAssociationCard {
  readonly formatRadicado = formatRadicado;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly remainingLabel = remainingLabel;
  readonly caseStatusLabel = caseStatusLabel;
  readonly caseStatusTone = caseStatusTone;
  readonly providenciaTitle = providenciaTitle;
  readonly responseStatusLabel = responseStatusLabel;

  readonly doc = input.required<DocumentDetail>();
  readonly caso = input<CaseDetail | null>(null);
  readonly draftRadicado = input('');
  readonly draftRadicadoChange = output<string>();
  readonly saveRadicado = output<void>();

  readonly mode = computed<'asociado' | 'nuevo' | 'sin_radicado'>(() => {
    const d = this.doc();
    const c = this.caso();
    if (d.case_id && c) {
      return c.providencias > 1 ? 'asociado' : 'nuevo';
    }
    if (d.document_status === 'extracted' && !d.case_id) return 'sin_radicado';
    return 'sin_radicado';
  });

  readonly timeline = computed(() => {
    const items = [...(this.caso()?.timeline ?? [])];
    return items.reverse();
  });

  onRadicadoInput(event: Event): void {
    const t = event.target;
    if (t instanceof HTMLInputElement) this.draftRadicadoChange.emit(t.value);
  }
}
