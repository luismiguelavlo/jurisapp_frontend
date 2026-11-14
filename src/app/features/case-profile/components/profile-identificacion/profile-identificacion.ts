import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { caseStatusInk } from '../../../../core/api/document-labels';
import {
  formatBogotaDateTime,
  formatCalendarDate,
  remainingLabel,
} from '../../../../core/utils/date-format';
import { RadicadoMark } from '../../../../shared/components/radicado-mark/radicado-mark';
import type { IdentificacionView } from '../../models/case-overview.models';
import { ProfilePartyBlock } from '../profile-party-block/profile-party-block';

/**
 * Identificación del proceso: despacho, última providencia y la carátula de partes
 * (accionante contra accionados, más vinculados).
 */
@Component({
  selector: 'app-profile-identificacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RadicadoMark, ProfilePartyBlock],
  host: { class: 'block min-w-0' },
  template: `
    @let v = data();
    <section
      class="bg-surface-container-lowest rounded-xl shadow-sm min-w-0"
      aria-labelledby="ident-title"
    >
      <header class="px-5 sm:px-6 pt-5 pb-4">
        <h2 id="ident-title" class="m-0 text-headline-sm text-on-surface">
          Identificación del proceso
        </h2>
      </header>

      <div
        class="grid grid-cols-1 lg:grid-cols-2 border-t border-outline-variant/60 lg:divide-x divide-outline-variant/60 max-lg:divide-y"
      >
        <!-- Despacho -->
        <dl class="m-0 px-5 sm:px-6 py-5 flex flex-col gap-4 min-w-0">
          <div class="min-w-0">
            <dt class="text-caption text-on-surface-variant">Radicado</dt>
            <dd class="m-0 mt-1 text-on-surface">
              <app-radicado-mark [value]="v.radicado" size="md" />
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-caption text-on-surface-variant">Juzgado</dt>
            <dd class="m-0 mt-1 text-body-default text-on-surface">
              {{ v.juzgado || 'No aparece en los documentos' }}
            </dd>
          </div>
          <div class="min-w-0">
            <dt class="text-caption text-on-surface-variant">Correo del juzgado</dt>
            <dd class="m-0 mt-1 text-body-default break-all">
              @if (v.correoJuzgado; as mail) {
                <a class="text-primary hover:underline" [href]="'mailto:' + mail">{{ mail }}</a>
              } @else {
                <span class="text-on-surface-variant">No aparece en los documentos</span>
              }
            </dd>
          </div>
        </dl>

        <!-- Providencia -->
        <div class="px-5 sm:px-6 py-5 flex flex-col gap-4 min-w-0 bg-surface-container-low/60">
          @if (v.providencia; as p) {
            <div class="min-w-0">
              <p class="m-0 text-caption text-on-surface-variant">
                Tipo de providencia
                @if (v.providenciasCount > 1) {
                  <span>(la más reciente de {{ v.providenciasCount }})</span>
                }
              </p>
              <p class="m-0 mt-1 text-body-medium text-primary">{{ p.tipo }}</p>
            </div>
            <dl class="m-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div class="min-w-0">
                <dt class="text-caption text-on-surface-variant">Fecha del auto</dt>
                <dd class="m-0 mt-1 text-body-default text-on-surface tabular-nums">
                  {{ formatCalendarDate(p.fechaAuto) }}
                </dd>
              </div>
              <div class="min-w-0">
                <dt class="text-caption text-on-surface-variant">Fecha de notificación</dt>
                <dd class="m-0 mt-1 text-body-default text-on-surface tabular-nums">
                  {{ formatBogotaDateTime(p.notificadoAt) }}
                </dd>
              </div>
              <div class="min-w-0">
                <dt class="text-caption text-on-surface-variant">Término de respuesta</dt>
                <dd class="m-0 mt-1 text-body-default">
                  @if (p.termino) {
                    <span class="text-on-surface font-medium">{{ p.termino }}</span>
                    @if (p.venceAt) {
                      <span class="block text-caption tabular-nums text-on-surface-variant">
                        Vence {{ formatBogotaDateTime(p.venceAt) }}
                      </span>
                      @if (remainingLabel(p.venceAt); as rem) {
                        <span
                          class="block text-caption"
                          [class]="p.estado ? caseStatusInk(p.estado) : 'text-on-surface-variant'"
                          >{{ rem }}</span
                        >
                      }
                    }
                  } @else {
                    <span class="text-on-surface-variant">Sin término</span>
                  }
                </dd>
              </div>
            </dl>
          } @else {
            <p class="m-0 text-body-compact text-on-surface-variant">
              Todavía no hay providencias notificadas en este proceso.
            </p>
          }
        </div>
      </div>

      <!-- Partes: carátula -->
      <div class="border-t border-outline-variant/60 px-5 sm:px-6 py-6 flex flex-col gap-6">
        <div
          class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-8 gap-y-3 items-start"
        >
          <app-profile-party-block
            rol="Accionante"
            [personas]="v.accionante ? [v.accionante] : []"
            [representante]="v.accionante?.representante ?? null"
            empty="Sin identificar"
          />
          <span
            class="font-display italic text-[17px] text-on-surface-variant md:pt-7 select-none"
            aria-hidden="true"
            >contra</span
          >
          <app-profile-party-block
            [rol]="v.accionados.length > 1 ? 'Accionados' : 'Accionado'"
            [personas]="v.accionados"
            empty="Sin identificar"
          />
        </div>

        @if (v.vinculados.length) {
          <div class="pt-5 border-t border-dashed border-outline-variant">
            <app-profile-party-block
              [rol]="v.vinculados.length > 1 ? 'Vinculados' : 'Vinculado'"
              [personas]="v.vinculados"
              layout="grid"
            />
          </div>
        }
      </div>
    </section>
  `,
})
export class ProfileIdentificacion {
  readonly data = input.required<IdentificacionView>();

  readonly formatCalendarDate = formatCalendarDate;
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly remainingLabel = remainingLabel;
  readonly caseStatusInk = caseStatusInk;
}
