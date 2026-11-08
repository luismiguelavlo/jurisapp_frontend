import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { REGIMEN, TIPO_TECNOLOGIA } from '../../../../core/api/ficha-labels';
import type {
  Diagnostico,
  MessageAnalysis,
  Regimen,
  Tecnologia,
  TipoTecnologia,
} from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  FICHA_INPUT,
  FICHA_LABEL,
  FICHA_LINK_BTN,
  FICHA_REMOVE_BTN,
  FICHA_SECTION_TITLE,
  type FichaPatch,
  inputValue,
  orNull,
  removeAt,
  replaceAt,
} from '../../ficha-ui';

/** Servicio reclamado: EPS, régimen, punto de dispensación, tecnologías y diagnósticos. */
@Component({
  selector: 'app-ficha-servicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @let f = ficha();
    <section class="flex flex-col gap-3">
      <h3 [class]="title">Servicio reclamado</h3>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label [class]="label" for="s-eps">EPS</label>
          <input id="s-eps" [class]="inputCls" [value]="f.aseguradora?.nombre ?? ''" (change)="setEps($event)" />
        </div>
        <div>
          <label [class]="label" for="s-regimen">Régimen</label>
          <select id="s-regimen" [class]="inputCls" (change)="setRegimen($event)">
            <option value="" [selected]="!f.aseguradora?.regimen">—</option>
            @for (r of regimenes; track r) {
              <option [value]="r" [selected]="f.aseguradora?.regimen === r">{{ regimenLabel[r] }}</option>
            }
          </select>
        </div>
        <div>
          <label [class]="label" for="s-lugar">Punto de dispensación / IPS</label>
          <input
            id="s-lugar"
            [class]="inputCls"
            [value]="f.lugar_atencion ?? ''"
            (change)="patched.emit({ lugar_atencion: orNull(value($event)) })"
          />
        </div>
      </div>

      <div class="flex flex-col gap-2">
        <span [class]="label + ' !mb-0'">Tecnologías</span>
        @for (t of f.tecnologias; track $index; let i = $index) {
          <div class="grid grid-cols-1 md:grid-cols-[1fr_200px_160px_auto] gap-2 items-end">
            <input
              [class]="inputCls"
              aria-label="Tecnología"
              placeholder="Medicamento, procedimiento…"
              [value]="t.nombre"
              (change)="setTec(i, { nombre: value($event) })"
            />
            <select [class]="inputCls" aria-label="Tipo" (change)="setTec(i, { tipo: tipoTec($event) })">
              @for (k of tiposTec; track k) {
                <option [value]="k" [selected]="t.tipo === k">{{ tecLabel[k] }}</option>
              }
            </select>
            <input
              [class]="inputCls"
              aria-label="Cantidad"
              placeholder="Cantidad"
              [value]="t.cantidad ?? ''"
              (change)="setTec(i, { cantidad: orNull(value($event)) })"
            />
            <button type="button" [class]="removeBtn" (click)="patched.emit({ tecnologias: removeAt(f.tecnologias, i) })">
              Quitar
            </button>
          </div>
        }
        <button type="button" class="self-start" [class]="linkBtn" (click)="addTec()">
          <app-material-icon name="add" [size]="16" /> Agregar tecnología
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <span [class]="label + ' !mb-0'">Diagnósticos (dato sensible)</span>
        @for (d of f.diagnosticos; track $index; let i = $index) {
          <div class="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-2 items-end">
            <input
              [class]="inputCls"
              aria-label="Diagnóstico"
              [value]="d.descripcion"
              (change)="setDx(i, { descripcion: value($event) })"
            />
            <input
              [class]="inputCls + ' font-mono uppercase'"
              aria-label="CIE-10"
              placeholder="CIE-10"
              [value]="d.cie10 ?? ''"
              (change)="setDx(i, { cie10: cie10($event) })"
            />
            <button type="button" [class]="removeBtn" (click)="patched.emit({ diagnosticos: removeAt(f.diagnosticos, i) })">
              Quitar
            </button>
          </div>
        }
        <button type="button" class="self-start" [class]="linkBtn" (click)="addDx()">
          <app-material-icon name="add" [size]="16" /> Agregar diagnóstico
        </button>
      </div>
    </section>
  `,
})
export class FichaServicio {
  readonly ficha = input.required<MessageAnalysis>();
  readonly patched = output<FichaPatch>();

  readonly title = FICHA_SECTION_TITLE;
  readonly label = FICHA_LABEL;
  readonly inputCls = FICHA_INPUT;
  readonly linkBtn = FICHA_LINK_BTN;
  readonly removeBtn = FICHA_REMOVE_BTN;
  readonly regimenes = Object.keys(REGIMEN) as Regimen[];
  readonly regimenLabel = REGIMEN;
  readonly tiposTec = Object.keys(TIPO_TECNOLOGIA) as TipoTecnologia[];
  readonly tecLabel = TIPO_TECNOLOGIA;
  readonly orNull = orNull;
  readonly removeAt = removeAt;
  readonly value = inputValue;

  tipoTec(e: Event): TipoTecnologia {
    return inputValue(e) as TipoTecnologia;
  }

  cie10(e: Event): string | null {
    return orNull(inputValue(e).toUpperCase().replace(/[^A-Z0-9]/g, ''));
  }

  setEps(e: Event): void {
    const nombre = orNull(inputValue(e));
    const prev = this.ficha().aseguradora;
    this.patched.emit({ aseguradora: nombre ? { nombre, regimen: prev?.regimen ?? null } : null });
  }

  setRegimen(e: Event): void {
    const prev = this.ficha().aseguradora;
    const regimen = (inputValue(e) || null) as Regimen | null;
    this.patched.emit({ aseguradora: prev ? { ...prev, regimen } : null });
  }

  setTec(i: number, change: Partial<Tecnologia>): void {
    const list = this.ficha().tecnologias;
    this.patched.emit({ tecnologias: replaceAt(list, i, { ...list[i], ...change }) });
  }

  addTec(): void {
    const t: Tecnologia = { nombre: '', tipo: 'medicamento', presentacion: null, cantidad: null, posologia: null };
    this.patched.emit({ tecnologias: [...this.ficha().tecnologias, t] });
  }

  setDx(i: number, change: Partial<Diagnostico>): void {
    const list = this.ficha().diagnosticos;
    this.patched.emit({ diagnosticos: replaceAt(list, i, { ...list[i], ...change }) });
  }

  addDx(): void {
    this.patched.emit({ diagnosticos: [...this.ficha().diagnosticos, { descripcion: '', cie10: null }] });
  }
}
