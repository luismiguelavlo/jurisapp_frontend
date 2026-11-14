import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TIPO_TECNOLOGIA } from '../../../../core/api/ficha-labels';
import type { MessageAnalysis, Tecnologia, TipoTecnologia } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import {
  FICHA_INPUT,
  FICHA_LINK_BTN,
  FICHA_REMOVE_BTN,
  FICHA_TEXTAREA,
  type FichaPatch,
  inputValue,
  orNull,
  removeAt,
  replaceAt,
} from '../../ficha-ui';
import { EditableStringList } from '../editable-string-list/editable-string-list';

const H3 = 'm-0 text-caption font-semibold text-on-surface-variant';

/** Edición del objeto de la tutela con la misma distribución que la vista de lectura. */
@Component({
  selector: 'app-edit-objeto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, EditableStringList],
  host: { class: 'block min-w-0' },
  template: `
    @let f = ficha();
    <section class="bg-surface-container-lowest rounded-xl shadow-sm min-w-0" aria-labelledby="e-objeto-title">
      <header class="px-5 sm:px-6 pt-5 pb-4 flex flex-col gap-1.5">
        <h2 id="e-objeto-title" class="m-0 text-headline-sm text-on-surface">Objeto de la tutela</h2>
        <textarea
          rows="3"
          aria-label="Objeto de la tutela"
          [class]="textarea"
          [value]="f.objeto ?? ''"
          (change)="patched.emit({ objeto: orNull(value($event)) })"
        ></textarea>
      </header>

      <div
        class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] border-t border-outline-variant/60 lg:divide-x divide-outline-variant/60 max-lg:divide-y"
      >
        <div class="px-5 sm:px-6 py-5 flex flex-col gap-3 min-w-0">
          <h3 [class]="h3">Tecnologías, medicamentos o servicios reclamados</h3>
          <ul class="m-0 p-0 list-none flex flex-col divide-y divide-outline-variant/50">
            @for (t of f.tecnologias; track $index; let i = $index) {
              <li class="py-3 first:pt-0 flex flex-col gap-2 min-w-0">
                <div class="flex items-start gap-2">
                  <select
                    [class]="inputCls + ' !w-[150px] shrink-0'"
                    aria-label="Tipo"
                    (change)="setTec(i, { tipo: tipo($event) })"
                  >
                    @for (k of tipos; track k) {
                      <option [value]="k" [selected]="t.tipo === k">{{ tipoLabel[k] }}</option>
                    }
                  </select>
                  <input
                    [class]="inputCls"
                    aria-label="Nombre"
                    placeholder="Medicamento, procedimiento…"
                    [value]="t.nombre"
                    (change)="setTec(i, { nombre: value($event) })"
                  />
                  <button type="button" [class]="removeBtn" title="Quitar" (click)="patched.emit({ tecnologias: removeAt(f.tecnologias, i) })">
                    <app-material-icon name="close" [size]="16" />
                  </button>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    [class]="inputCls"
                    aria-label="Presentación"
                    placeholder="Presentación"
                    [value]="t.presentacion ?? ''"
                    (change)="setTec(i, { presentacion: orNull(value($event)) })"
                  />
                  <input
                    [class]="inputCls"
                    aria-label="Cantidad"
                    placeholder="Cantidad"
                    [value]="t.cantidad ?? ''"
                    (change)="setTec(i, { cantidad: orNull(value($event)) })"
                  />
                  <input
                    [class]="inputCls"
                    aria-label="Posología"
                    placeholder="Posología"
                    [value]="t.posologia ?? ''"
                    (change)="setTec(i, { posologia: orNull(value($event)) })"
                  />
                </div>
              </li>
            }
          </ul>
          <button type="button" class="self-start" [class]="linkBtn" (click)="addTec()">
            <app-material-icon name="add" [size]="16" /> Agregar tecnología
          </button>
        </div>

        <div class="px-5 sm:px-6 py-5 flex flex-col gap-6 min-w-0">
          <div class="flex flex-col gap-2.5">
            <h3 [class]="h3">Derechos presuntamente vulnerados</h3>
            <app-editable-string-list
              [items]="f.derechos_invocados"
              [rows]="1"
              addLabel="Agregar derecho"
              itemLabel="Derecho"
              emptyText="No aparecen en los documentos."
              (itemsChange)="patched.emit({ derechos_invocados: $event })"
            />
          </div>

          <div class="flex flex-col gap-2">
            <label for="e-lugar" [class]="h3">Punto de dispensación o IPS</label>
            <input
              id="e-lugar"
              [class]="inputCls"
              [value]="f.lugar_atencion ?? ''"
              (change)="patched.emit({ lugar_atencion: orNull(value($event)) })"
            />
          </div>
        </div>
      </div>
    </section>
  `,
})
export class EditObjeto {
  readonly ficha = input.required<MessageAnalysis>();
  readonly patched = output<FichaPatch>();

  readonly h3 = H3;
  readonly inputCls = FICHA_INPUT;
  readonly textarea = FICHA_TEXTAREA;
  readonly linkBtn = FICHA_LINK_BTN;
  readonly removeBtn = FICHA_REMOVE_BTN;
  readonly tipos = Object.keys(TIPO_TECNOLOGIA) as TipoTecnologia[];
  readonly tipoLabel = TIPO_TECNOLOGIA;
  readonly orNull = orNull;
  readonly removeAt = removeAt;
  readonly value = inputValue;

  tipo(e: Event): TipoTecnologia {
    return inputValue(e) as TipoTecnologia;
  }

  setTec(i: number, change: Partial<Tecnologia>): void {
    const list = this.ficha().tecnologias;
    this.patched.emit({ tecnologias: replaceAt(list, i, { ...list[i]!, ...change }) });
  }

  addTec(): void {
    const t: Tecnologia = { nombre: '', tipo: 'medicamento', presentacion: null, cantidad: null, posologia: null };
    this.patched.emit({ tecnologias: [...this.ficha().tecnologias, t] });
  }
}
