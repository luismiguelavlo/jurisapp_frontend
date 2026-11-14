import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TIPO_TECNOLOGIA } from '../../../../core/api/ficha-labels';
import type { Tecnologia } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

/** Objeto de la tutela: qué se reclama, qué derechos se invocan y dónde se presta el servicio. */
@Component({
  selector: 'app-profile-objeto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  host: { class: 'block min-w-0' },
  template: `
    <section
      class="bg-surface-container-lowest rounded-xl shadow-sm min-w-0"
      aria-labelledby="objeto-title"
    >
      <header class="px-5 sm:px-6 pt-5 pb-4 flex flex-col gap-1.5">
        <h2 id="objeto-title" class="m-0 text-headline-sm text-on-surface">Objeto de la tutela</h2>
        @if (objeto(); as o) {
          <p class="m-0 max-w-[72ch] text-body-default text-on-surface">{{ o }}</p>
        }
      </header>

      <div
        class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] border-t border-outline-variant/60 lg:divide-x divide-outline-variant/60 max-lg:divide-y"
      >
        <div class="px-5 sm:px-6 py-5 flex flex-col gap-3 min-w-0">
          <h3 class="m-0 text-caption font-semibold text-on-surface-variant">
            Tecnologías, medicamentos o servicios reclamados
          </h3>
          @if (tecnologias()?.length) {
            <ul class="m-0 p-0 list-none flex flex-col divide-y divide-outline-variant/50">
              @for (t of tecnologias(); track $index) {
                <li class="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3 min-w-0">
                  <span
                    class="shrink-0 mt-0.5 min-w-[92px] px-2 py-0.5 rounded text-[11px] leading-4 font-medium bg-secondary-container text-on-secondary-container text-center"
                    >{{ tipoLabel[t.tipo] }}</span
                  >
                  <span class="min-w-0">
                    <span class="block text-body-medium text-on-surface break-words">{{ t.nombre }}</span>
                    @if (detalle(t); as d) {
                      <span class="block text-body-compact text-on-surface-variant">{{ d }}</span>
                    }
                  </span>
                </li>
              }
            </ul>
          } @else {
            <p class="m-0 text-body-compact text-on-surface-variant">No aparecen en los documentos.</p>
          }
        </div>

        <div class="px-5 sm:px-6 py-5 flex flex-col gap-6 min-w-0">
          <div class="flex flex-col gap-2.5">
            <h3 class="m-0 text-caption font-semibold text-on-surface-variant">
              Derechos presuntamente vulnerados
            </h3>
            @if (derechos()?.length) {
              <ul class="m-0 p-0 list-none flex flex-wrap gap-1.5">
                @for (d of derechos(); track $index) {
                  <li
                    class="px-2.5 py-1 rounded-full border border-primary/25 text-label-compact text-primary bg-primary-fixed/40"
                  >
                    {{ d }}
                  </li>
                }
              </ul>
            } @else {
              <p class="m-0 text-body-compact text-on-surface-variant">No aparecen en los documentos.</p>
            }
          </div>

          <div class="flex flex-col gap-2">
            <h3 class="m-0 text-caption font-semibold text-on-surface-variant">
              Punto de dispensación o IPS
            </h3>
            @if (lugar(); as l) {
              <p class="m-0 flex items-start gap-2 text-body-default text-on-surface">
                <app-material-icon name="local_hospital" [size]="18" className="text-primary mt-0.5" />
                <span class="min-w-0 break-words">{{ l }}</span>
              </p>
            } @else {
              <p class="m-0 text-body-compact text-on-surface-variant">No aparece en los documentos.</p>
            }
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ProfileObjeto {
  readonly objeto = input<string | null>(null);
  readonly tecnologias = input<readonly Tecnologia[] | null>(null);
  readonly derechos = input<readonly string[] | null>(null);
  readonly lugar = input<string | null>(null);

  readonly tipoLabel = TIPO_TECNOLOGIA;

  detalle(t: Tecnologia): string {
    return [t.presentacion, t.cantidad, t.posologia]
      .map((s) => s?.trim())
      .filter(Boolean)
      .join(', ');
  }
}
