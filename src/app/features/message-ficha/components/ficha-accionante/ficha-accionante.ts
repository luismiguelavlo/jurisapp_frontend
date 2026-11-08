import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CALIDAD_AGENTE } from '../../../../core/api/ficha-labels';
import type {
  CalidadAgente,
  DatoContacto,
  MessageAnalysis,
  TipoIdPersona,
} from '../../../../core/api/types';
import {
  FICHA_INPUT,
  FICHA_LABEL,
  FICHA_SECTION_TITLE,
  type FichaPatch,
  inputValue,
  orNull,
} from '../../ficha-ui';

const TIPOS_ID: TipoIdPersona[] = ['CC', 'TI', 'CE', 'PA', 'RC', 'PPT'];

/** Accionante: nombre, identificación, teléfono, correo y agente oficioso o apoderado. */
@Component({
  selector: 'app-ficha-accionante',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let f = ficha();
    <section class="flex flex-col gap-3">
      <h3 [class]="title">Accionante</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <div class="md:col-span-2 xl:col-span-1">
          <label [class]="label" for="a-nombre">Nombre completo</label>
          <input id="a-nombre" [class]="inputCls" [value]="nombre()" (change)="setNombre($event)" />
        </div>
        <div>
          <label [class]="label" for="a-tipo">Tipo de documento</label>
          <select id="a-tipo" [class]="inputCls" (change)="setTipoId($event)">
            <option value="" [selected]="!f.contacto.identificacion">—</option>
            @for (t of tiposId; track t) {
              <option [value]="t" [selected]="f.contacto.identificacion?.tipo === t">{{ t }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="a-num">Número de documento</label>
          <input
            id="a-num"
            [class]="inputCls"
            [value]="f.contacto.identificacion?.numero ?? ''"
            (change)="setNumeroId($event)"
          />
        </div>
        <div>
          <label [class]="label" for="a-tel">Teléfono</label>
          <input id="a-tel" [class]="inputCls" [value]="f.contacto.telefonos[0]?.valor ?? ''" (change)="setTelefono($event)" />
        </div>
        <div class="md:col-span-2">
          <label [class]="label" for="a-correo">Correo electrónico</label>
          <input
            id="a-correo"
            type="email"
            [class]="inputCls"
            [value]="f.contacto.correo?.valor ?? ''"
            (change)="setContacto('correo', $event)"
          />
        </div>
        <div class="md:col-span-2">
          <label [class]="label" for="a-agente">Agente oficioso o apoderado (si lo hay)</label>
          <div class="flex gap-2">
            <input
              id="a-agente"
              [class]="inputCls"
              [value]="f.agente_oficioso?.nombre ?? ''"
              (change)="setAgente($event)"
            />
            @if (f.agente_oficioso; as ag) {
              <select [class]="inputCls + ' !w-44'" aria-label="Calidad" (change)="setCalidad($event)">
                @for (c of calidades; track c) {
                  <option [value]="c" [selected]="ag.calidad === c">{{ calidadLabel[c] }}</option>
                }
              </select>
            }
          </div>
        </div>
        <div class="md:col-span-2 xl:col-span-4">
          <label [class]="label" for="a-direccion">Dirección / municipio de residencia</label>
          <input
            id="a-direccion"
            [class]="inputCls"
            [value]="residencia()"
            (change)="setContacto('direccion', $event)"
          />
        </div>
      </div>
    </section>
  `,
})
export class FichaAccionante {
  readonly ficha = input.required<MessageAnalysis>();
  readonly patched = output<FichaPatch>();

  readonly title = FICHA_SECTION_TITLE;
  readonly label = FICHA_LABEL;
  readonly inputCls = FICHA_INPUT;
  readonly tiposId = TIPOS_ID;
  readonly calidades = Object.keys(CALIDAD_AGENTE) as CalidadAgente[];
  readonly calidadLabel = CALIDAD_AGENTE;

  readonly nombre = computed(() => {
    const f = this.ficha();
    return f.accionante?.nombre ?? f.contacto.nombre?.valor ?? '';
  });

  readonly residencia = computed(() => {
    const f = this.ficha();
    return f.contacto.direccion?.valor ?? f.accionante?.municipio ?? '';
  });

  /** Un dato editado a mano: confianza alta, conserva la página de donde salió. */
  private dato(valor: string | null, prev: DatoContacto | null | undefined): DatoContacto | null {
    return valor ? { valor, confianza: 'alta', pagina: prev?.pagina ?? 1 } : null;
  }

  setNombre(e: Event): void {
    const f = this.ficha();
    const nombre = orNull(inputValue(e));
    this.patched.emit({
      accionante: { nombre, municipio: f.accionante?.municipio ?? null, edad: f.accionante?.edad ?? null },
      contacto: { ...f.contacto, nombre: this.dato(nombre, f.contacto.nombre) },
    });
  }

  setContacto(key: 'correo' | 'direccion', e: Event): void {
    const c = this.ficha().contacto;
    this.patched.emit({ contacto: { ...c, [key]: this.dato(orNull(inputValue(e)), c[key]) } });
  }

  setTelefono(e: Event): void {
    const c = this.ficha().contacto;
    const tel = this.dato(orNull(inputValue(e)), c.telefonos[0]);
    this.patched.emit({ contacto: { ...c, telefonos: tel ? [tel, ...c.telefonos.slice(1)] : c.telefonos.slice(1) } });
  }

  setTipoId(e: Event): void {
    const c = this.ficha().contacto;
    const tipo = inputValue(e) as TipoIdPersona | '';
    const prev = c.identificacion;
    // Sin número no hay identificación que guardar: el tipo se aplica al escribir el número (CC por defecto).
    const identificacion = tipo && prev ? { ...prev, tipo, confianza: 'alta' as const } : null;
    this.patched.emit({ contacto: { ...c, identificacion } });
  }

  setNumeroId(e: Event): void {
    const c = this.ficha().contacto;
    const numero = inputValue(e).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    const prev = c.identificacion;
    this.patched.emit({
      contacto: {
        ...c,
        identificacion: numero
          ? { tipo: prev?.tipo ?? 'CC', numero, confianza: 'alta', pagina: prev?.pagina ?? 1 }
          : null,
      },
    });
  }

  setAgente(e: Event): void {
    const nombre = orNull(inputValue(e));
    const prev = this.ficha().agente_oficioso;
    this.patched.emit({
      agente_oficioso: nombre
        ? { nombre, calidad: prev?.calidad ?? 'agente_oficioso', parentesco: prev?.parentesco ?? null }
        : null,
    });
  }

  setCalidad(e: Event): void {
    const prev = this.ficha().agente_oficioso;
    if (prev) this.patched.emit({ agente_oficioso: { ...prev, calidad: inputValue(e) as CalidadAgente } });
  }
}
