import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ESTADO_ANTECEDENTE } from '../../../../core/api/ficha-labels';
import type {
  Antecedente,
  EstadoAntecedente,
  MessageAnalysis,
  ReclamoPrevio,
} from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  FICHA_HINT,
  FICHA_INPUT,
  FICHA_LABEL,
  FICHA_LINK_BTN,
  FICHA_REMOVE_BTN,
  FICHA_SECTION_TITLE,
  FICHA_TEXTAREA,
  type FichaPatch,
  inputValue,
  orNull,
  removeAt,
  replaceAt,
} from '../../ficha-ui';

/** Antecedentes (pendientes, agotados, recibos) y reclamos previos (Supersalud, PQRS, secretaría). */
@Component({
  selector: 'app-ficha-antecedentes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    @let f = ficha();
    <section class="flex flex-col gap-3">
      <h3 [class]="title">Antecedentes</h3>
      <p [class]="hint">Pendientes o agotados previos a la tutela, según fórmulas y recibos.</p>

      @for (a of f.antecedentes; track $index; let i = $index) {
        <div class="grid grid-cols-1 md:grid-cols-[150px_1fr_160px_150px_auto] gap-2 items-end">
          <div>
            <label [class]="label" [for]="'ant-f-' + i">Fecha</label>
            <input
              [id]="'ant-f-' + i"
              type="date"
              [class]="inputCls"
              [value]="a.fecha ?? ''"
              (change)="setAnt(i, { fecha: orNull(value($event)) })"
            />
          </div>
          <div>
            <label [class]="label" [for]="'ant-d-' + i">Nota (agotado, pendiente, recibo…)</label>
            <input
              [id]="'ant-d-' + i"
              [class]="inputCls"
              [value]="a.descripcion"
              (change)="setAnt(i, { descripcion: value($event) })"
            />
          </div>
          <div>
            <label [class]="label" [for]="'ant-r-' + i">Fórmula / recibo</label>
            <input
              [id]="'ant-r-' + i"
              [class]="inputCls"
              [value]="a.referencia ?? ''"
              (change)="setAnt(i, { referencia: orNull(value($event)) })"
            />
          </div>
          <div>
            <label [class]="label" [for]="'ant-e-' + i">Estado</label>
            <select [id]="'ant-e-' + i" [class]="inputCls" (change)="setAnt(i, { estado: estado($event) })">
              <option value="" [selected]="!a.estado">—</option>
              @for (k of estados; track k) {
                <option [value]="k" [selected]="a.estado === k">{{ estadoLabel[k] }}</option>
              }
            </select>
          </div>
          <button type="button" [class]="removeBtn" (click)="patched.emit({ antecedentes: removeAt(f.antecedentes, i) })">
            Quitar
          </button>
        </div>
      }
      <button type="button" class="self-start" [class]="linkBtn" (click)="addAnt()">
        <app-material-icon name="add" [size]="16" /> Agregar antecedente
      </button>

      <div class="flex flex-col gap-2 mt-2">
        <span [class]="label + ' !mb-0'">Reclamos previos (Supersalud, PQRS, Secretaría de Salud)</span>
        @for (r of f.reclamos_previos; track $index; let i = $index) {
          <div class="rounded-md border border-outline-variant p-3 flex flex-col gap-2">
            <div class="grid grid-cols-1 md:grid-cols-[1fr_150px_200px_auto] gap-2 items-end">
              <input
                [class]="inputCls"
                aria-label="Entidad"
                placeholder="Entidad"
                [value]="r.entidad"
                (change)="setRec(i, { entidad: value($event) })"
              />
              <input
                type="date"
                [class]="inputCls"
                aria-label="Fecha"
                [value]="r.fecha ?? ''"
                (change)="setRec(i, { fecha: orNull(value($event)) })"
              />
              <input
                [class]="inputCls"
                aria-label="Número"
                placeholder="Número"
                [value]="r.numero ?? ''"
                (change)="setRec(i, { numero: orNull(value($event)) })"
              />
              <button
                type="button"
                [class]="removeBtn"
                (click)="patched.emit({ reclamos_previos: removeAt(f.reclamos_previos, i) })"
              >
                Quitar
              </button>
            </div>
            <textarea
              [class]="textarea"
              rows="2"
              aria-label="Resumen del reclamo"
              placeholder="Resumen"
              [value]="r.resumen ?? ''"
              (change)="setRec(i, { resumen: orNull(value($event)) })"
            ></textarea>
          </div>
        }
        <button type="button" class="self-start" [class]="linkBtn" (click)="addRec()">
          <app-material-icon name="add" [size]="16" /> Agregar reclamo
        </button>
      </div>
    </section>
  `,
})
export class FichaAntecedentes {
  readonly ficha = input.required<MessageAnalysis>();
  readonly patched = output<FichaPatch>();

  readonly title = FICHA_SECTION_TITLE;
  readonly label = FICHA_LABEL;
  readonly hint = FICHA_HINT;
  readonly inputCls = FICHA_INPUT;
  readonly textarea = FICHA_TEXTAREA;
  readonly linkBtn = FICHA_LINK_BTN;
  readonly removeBtn = FICHA_REMOVE_BTN;
  readonly estados = Object.keys(ESTADO_ANTECEDENTE) as EstadoAntecedente[];
  readonly estadoLabel = ESTADO_ANTECEDENTE;
  readonly orNull = orNull;
  readonly removeAt = removeAt;
  readonly value = inputValue;

  estado(e: Event): EstadoAntecedente | null {
    return (inputValue(e) || null) as EstadoAntecedente | null;
  }

  setAnt(i: number, change: Partial<Antecedente>): void {
    const list = this.ficha().antecedentes;
    this.patched.emit({ antecedentes: replaceAt(list, i, { ...list[i], ...change }) });
  }

  addAnt(): void {
    const a: Antecedente = { fecha: null, descripcion: '', referencia: null, estado: 'pendiente' };
    this.patched.emit({ antecedentes: [...this.ficha().antecedentes, a] });
  }

  setRec(i: number, change: Partial<ReclamoPrevio>): void {
    const list = this.ficha().reclamos_previos;
    this.patched.emit({ reclamos_previos: replaceAt(list, i, { ...list[i], ...change }) });
  }

  addRec(): void {
    const r: ReclamoPrevio = { entidad: '', fecha: null, numero: null, resumen: null };
    this.patched.emit({ reclamos_previos: [...this.ficha().reclamos_previos, r] });
  }
}
