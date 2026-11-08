import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { IdentificacionProceso, MessageAnalysisState } from '../../../../core/api/types';
import { formatRadicado, normalizeRadicadoInput } from '../../../../core/utils/date-format';
import {
  FICHA_HINT,
  FICHA_INPUT,
  FICHA_LABEL,
  FICHA_SECTION_TITLE,
  type FichaPatch,
  inputValue,
  orNull,
} from '../../ficha-ui';

const CALIDAD: Record<string, string> = {
  accionada: 'Accionada',
  vinculada: 'Vinculada',
  no_aparece: 'No aparece',
};

/** Proceso: radicado, despacho, municipio, departamento, correo del despacho y calidad de la entidad. */
@Component({
  selector: 'app-ficha-proceso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let id = identificacion();
    <section class="flex flex-col gap-3">
      <h3 [class]="title">Proceso</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        <div>
          <label [class]="label" for="f-radicado">Radicado (23 dígitos)</label>
          <input
            id="f-radicado"
            [class]="inputCls + ' font-mono'"
            [value]="radicadoDisplay()"
            (change)="setRadicado($event)"
          />
        </div>
        <div class="xl:col-span-2">
          <label [class]="label" for="f-despacho">Juzgado / despacho</label>
          <input id="f-despacho" [class]="inputCls" [value]="id.despacho ?? ''" (change)="set('despacho', $event)" />
        </div>
        <div>
          <label [class]="label" for="f-municipio">Municipio de la competencia</label>
          <input id="f-municipio" [class]="inputCls" [value]="id.municipio ?? ''" (change)="set('municipio', $event)" />
        </div>
        <div>
          <label [class]="label" for="f-departamento">Departamento</label>
          <input
            id="f-departamento"
            [class]="inputCls"
            [value]="id.departamento ?? ''"
            (change)="set('departamento', $event)"
          />
        </div>
        <div>
          <label [class]="label" for="f-calidad">La entidad es</label>
          <input id="f-calidad" [class]="inputCls" [value]="calidad()" disabled />
        </div>
        <div class="md:col-span-2 xl:col-span-3">
          <label [class]="label" for="f-correo-despacho">Correo del despacho</label>
          <input
            id="f-correo-despacho"
            type="email"
            [class]="inputCls"
            [value]="id.correo_despacho ?? ''"
            (change)="set('correo_despacho', $event)"
          />
        </div>
      </div>
      @if (dane(); as d) {
        <p [class]="hint">Código DANE {{ d.codigo }} · {{ d.departamento }}. Los dos últimos dígitos (instancia) no se usan para vincular.</p>
      }
    </section>
  `,
})
export class FichaProceso {
  readonly identificacion = input.required<IdentificacionProceso>();
  readonly calidadEntidad = input<MessageAnalysisState['calidad_entidad']>(null);
  readonly patched = output<FichaPatch>();

  readonly title = FICHA_SECTION_TITLE;
  readonly label = FICHA_LABEL;
  readonly inputCls = FICHA_INPUT;
  readonly hint = FICHA_HINT;

  readonly radicadoDisplay = computed(() => {
    const r = this.identificacion().radicado;
    return r ? formatRadicado(r) : '';
  });

  readonly calidad = computed(() => {
    const c = this.calidadEntidad();
    return c ? CALIDAD[c] : 'Sin configurar';
  });

  readonly dane = computed(() => {
    const r = this.identificacion().radicado;
    if (!r || r.length < 5) return null;
    return { codigo: r.slice(0, 5), departamento: this.identificacion().departamento ?? '' };
  });

  set(key: Exclude<keyof IdentificacionProceso, 'radicado'>, e: Event): void {
    this.patched.emit({ identificacion: { ...this.identificacion(), [key]: orNull(inputValue(e)) } });
  }

  setRadicado(e: Event): void {
    const digits = normalizeRadicadoInput(inputValue(e));
    this.patched.emit({ identificacion: { ...this.identificacion(), radicado: digits || null } });
  }
}
