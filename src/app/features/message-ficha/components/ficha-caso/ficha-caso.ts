import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { MessageAnalysis } from '../../../../core/api/types';
import { EditableStringList } from '../editable-string-list/editable-string-list';
import {
  FICHA_INPUT,
  FICHA_LABEL,
  FICHA_SECTION_TITLE,
  FICHA_TEXTAREA,
  type FichaPatch,
  inputValue,
  orNull,
} from '../../ficha-ui';

/** El caso: objeto, hechos (lista cronológica), pretensiones, derechos, tratamiento integral y medida. */
@Component({
  selector: 'app-ficha-caso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditableStringList],
  template: `
    @let f = ficha();
    <section class="flex flex-col gap-4">
      <h3 [class]="title">El caso</h3>

      <div>
        <label [class]="label" for="c-objeto">Objeto de la tutela</label>
        <textarea
          id="c-objeto"
          [class]="textarea"
          rows="2"
          [value]="f.objeto ?? ''"
          (change)="patched.emit({ objeto: orNull(value($event)) })"
        ></textarea>
      </div>

      <div>
        <span [class]="label">Hechos</span>
        <app-editable-string-list
          [items]="f.hechos"
          itemLabel="Hecho"
          addLabel="Agregar hecho"
          emptyText="El análisis no encontró hechos."
          [rows]="2"
          (itemsChange)="patched.emit({ hechos: $event })"
        />
      </div>

      <div>
        <span [class]="label">Pretensiones</span>
        <app-editable-string-list
          [items]="f.pretensiones"
          itemLabel="Pretensión"
          addLabel="Agregar pretensión"
          emptyText="Sin pretensiones."
          [rows]="1"
          (itemsChange)="patched.emit({ pretensiones: $event })"
        />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <span [class]="label">Derechos invocados</span>
          <app-editable-string-list
            [items]="f.derechos_invocados"
            itemLabel="Derecho"
            addLabel="Agregar derecho"
            emptyText="Sin derechos invocados."
            [rows]="1"
            (itemsChange)="patched.emit({ derechos_invocados: $event })"
          />
        </div>
        <div class="flex flex-col gap-3">
          <div>
            <label [class]="label" for="c-integral">Tratamiento integral</label>
            <select id="c-integral" [class]="inputCls" (change)="setIntegral($event)">
              <option value="" [selected]="f.tratamiento_integral_solicitado === null">No se menciona</option>
              <option value="si" [selected]="f.tratamiento_integral_solicitado === true">Solicitado</option>
              <option value="no" [selected]="f.tratamiento_integral_solicitado === false">No solicitado</option>
            </select>
          </div>
          <div>
            <label [class]="label" for="c-medida">Medida provisional</label>
            <select id="c-medida" [class]="inputCls" (change)="setMedida($event)">
              <option value="" [selected]="!f.medida_provisional">No se pide</option>
              <option value="solicitada" [selected]="medida() === 'solicitada'">Solicitada</option>
              <option value="concedida" [selected]="medida() === 'concedida'">Concedida</option>
              <option value="negada" [selected]="medida() === 'negada'">Negada</option>
            </select>
          </div>
          @if (f.medida_provisional; as m) {
            <textarea
              [class]="textarea"
              rows="2"
              aria-label="Descripción de la medida"
              placeholder="Qué se pide u ordena"
              [value]="m.descripcion ?? ''"
              (change)="patched.emit({ medida_provisional: { ...m, descripcion: orNull(value($event)) } })"
            ></textarea>
          }
        </div>
      </div>

      <div>
        <span [class]="label">Pruebas aportadas</span>
        <app-editable-string-list
          [items]="f.pruebas_aportadas"
          itemLabel="Prueba"
          addLabel="Agregar prueba"
          emptyText="Sin pruebas listadas."
          [rows]="1"
          (itemsChange)="patched.emit({ pruebas_aportadas: $event })"
        />
      </div>
    </section>
  `,
})
export class FichaCaso {
  readonly ficha = input.required<MessageAnalysis>();
  readonly patched = output<FichaPatch>();

  readonly title = FICHA_SECTION_TITLE;
  readonly label = FICHA_LABEL;
  readonly inputCls = FICHA_INPUT;
  readonly textarea = FICHA_TEXTAREA;
  readonly orNull = orNull;
  readonly value = inputValue;

  medida(): 'solicitada' | 'concedida' | 'negada' | '' {
    const m = this.ficha().medida_provisional;
    if (!m) return '';
    if (m.concedida === true) return 'concedida';
    if (m.concedida === false) return 'negada';
    return 'solicitada';
  }

  setIntegral(e: Event): void {
    const v = inputValue(e);
    this.patched.emit({ tratamiento_integral_solicitado: v === 'si' ? true : v === 'no' ? false : null });
  }

  setMedida(e: Event): void {
    const v = inputValue(e);
    const prev = this.ficha().medida_provisional;
    this.patched.emit({
      medida_provisional: v
        ? {
            solicitada: true,
            concedida: v === 'concedida' ? true : v === 'negada' ? false : null,
            descripcion: prev?.descripcion ?? null,
          }
        : null,
    });
  }
}
