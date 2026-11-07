import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { deteccionEvidencia } from '../../../../core/api/ficha-labels';
import type { CaseProfile } from '../../../../core/api/types';
import { AlertBanner } from '../../../../shared/components/alert-banner/alert-banner';

/** Calidad de la entidad del tenant en el caso y de dónde sale (SPEC 21 §3.2). */
@Component({
  selector: 'app-profile-entity-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AlertBanner],
  template: `
    @let f = ficha();
    @if (f.entidad_no_configurada) {
      <app-alert-banner variant="warning">
        No sabemos cuál es tu entidad en este caso, así que no podemos decirte a quién le toca
        responder.
        <a routerLink="/configuracion/entidad" class="underline text-inherit ml-1"
          >Configurar tu entidad</a
        >
      </app-alert-banner>
    } @else {
      <p class="m-0 text-body-compact text-on-surface-variant">
        @switch (f.calidad_entidad) {
          @case ('accionada') {
            Tu entidad es <strong class="text-error font-semibold">accionada</strong> en este caso.
          }
          @case ('vinculada') {
            Tu entidad está <strong class="text-tertiary font-semibold">vinculada</strong> a este
            caso.
          }
          @case ('no_aparece') {
            Tu entidad <strong class="text-on-surface font-semibold">no aparece</strong> en este
            caso.
          }
        }
        @if (f.entidad_detectada; as d) {
          La reconocimos como {{ d.nombre }} porque {{ evidencia() }}.
          <a routerLink="/configuracion/entidad" class="text-primary hover:underline"
            >¿No es correcta?</a
          >
        }
      </p>
    }
  `,
})
export class ProfileEntityBanner {
  readonly ficha = input.required<CaseProfile>();

  readonly evidencia = computed(() => {
    const d = this.ficha().entidad_detectada;
    return d ? deteccionEvidencia(d).replace(/; /g, ' y ') : '';
  });
}
