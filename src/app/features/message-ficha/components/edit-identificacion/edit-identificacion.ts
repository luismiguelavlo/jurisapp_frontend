import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CALIDAD_AGENTE, UNIDAD_TERMINO } from '../../../../core/api/ficha-labels';
import type {
  Actuacion,
  CalidadAgente,
  IdentificacionProceso,
  MessageAnalysis,
  ParteFicha,
  TipoActuacion,
  TipoIdPersona,
  Unidad,
} from '../../../../core/api/types';
import { formatBogotaDateTime, formatRadicado, normalizeRadicadoInput } from '../../../../core/utils/date-format';
import { PROVIDENCIA_ACTUACION } from '../../../case-profile/models/case-overview.models';
import { ultimaActuacionIndex } from '../../ficha-overview';
import { FICHA_INPUT, type FichaPatch, inputValue, orNull, replaceAt } from '../../ficha-ui';
import { EditableStringList } from '../editable-string-list/editable-string-list';

const TIPOS_ID: TipoIdPersona[] = ['CC', 'TI', 'CE', 'PA', 'RC', 'PPT'];
const LABEL = 'block text-caption text-on-surface-variant mb-1';
const ROL = 'm-0 text-caption font-semibold text-on-surface-variant';

/** Edición de la identificación del proceso con la misma distribución que la vista de lectura. */
@Component({
  selector: 'app-edit-identificacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EditableStringList],
  host: { class: 'block min-w-0' },
  template: `
    @let f = ficha();
    @let id = f.identificacion;
    <section class="bg-surface-container-lowest rounded-xl shadow-sm min-w-0" aria-labelledby="e-ident-title">
      <header class="px-5 sm:px-6 pt-5 pb-4">
        <h2 id="e-ident-title" class="m-0 text-headline-sm text-on-surface">Identificación del proceso</h2>
      </header>

      <div
        class="grid grid-cols-1 lg:grid-cols-2 border-t border-outline-variant/60 lg:divide-x divide-outline-variant/60 max-lg:divide-y"
      >
        <!-- Despacho -->
        <div class="px-5 sm:px-6 py-5 flex flex-col gap-4 min-w-0">
          <div>
            <label [class]="label" for="e-radicado">Radicado (23 dígitos)</label>
            <input id="e-radicado" [class]="inputCls + ' font-mono'" [value]="radicado()" (change)="setRadicado($event)" />
          </div>
          <div>
            <label [class]="label" for="e-juzgado">Juzgado</label>
            <input id="e-juzgado" [class]="inputCls" [value]="id.despacho ?? ''" (change)="setId('despacho', $event)" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label [class]="label" for="e-municipio">Municipio</label>
              <input id="e-municipio" [class]="inputCls" [value]="id.municipio ?? ''" (change)="setId('municipio', $event)" />
            </div>
            <div>
              <label [class]="label" for="e-depto">Departamento</label>
              <input id="e-depto" [class]="inputCls" [value]="id.departamento ?? ''" (change)="setId('departamento', $event)" />
            </div>
          </div>
          <div>
            <label [class]="label" for="e-correo">Correo del juzgado</label>
            <input
              id="e-correo"
              type="email"
              [class]="inputCls"
              [value]="id.correo_despacho ?? ''"
              (change)="setId('correo_despacho', $event)"
            />
          </div>
        </div>

        <!-- Providencia -->
        <div class="px-5 sm:px-6 py-5 flex flex-col gap-4 min-w-0 bg-surface-container-low/60">
          @if (actuacion(); as a) {
            <div>
              <label [class]="label" for="e-tipo">Tipo de providencia</label>
              <select id="e-tipo" [class]="inputCls" (change)="setAct({ tipo: tipoAct($event) })">
                @for (k of tiposAct; track k) {
                  <option [value]="k" [selected]="a.tipo === k">{{ tipoActLabel[k] }}</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label [class]="label" for="e-fecha">Fecha del auto</label>
                <input
                  id="e-fecha"
                  type="date"
                  [class]="inputCls"
                  [value]="a.fecha_providencia ?? ''"
                  (change)="setAct({ fecha_providencia: orNull(value($event)) })"
                />
              </div>
              <div>
                <p [class]="label">Fecha de notificación</p>
                <p class="m-0 h-10 flex items-center text-body-default text-on-surface tabular-nums">
                  {{ formatDate(recibidoAt()) }}
                </p>
              </div>
            </div>
            <div>
              <span [class]="label">Término de respuesta</span>
              <div class="flex gap-2">
                <input
                  type="number"
                  min="1"
                  aria-label="Cantidad del término"
                  placeholder="Sin término"
                  [class]="inputCls + ' !w-[120px]'"
                  [value]="a.termino?.cantidad ?? ''"
                  (change)="setCantidad($event)"
                />
                <select aria-label="Unidad del término" [class]="inputCls" (change)="setUnidad($event)">
                  @for (u of unidades; track u) {
                    <option [value]="u" [selected]="(a.termino?.unidad ?? 'dias_habiles') === u">{{ unidadLabel[u] }}</option>
                  }
                </select>
              </div>
            </div>
          } @else {
            <p class="m-0 text-body-compact text-on-surface-variant">
              El correo no trae providencias notificadas.
            </p>
          }
        </div>
      </div>

      <!-- Partes -->
      <div class="border-t border-outline-variant/60 px-5 sm:px-6 py-6 flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-8 gap-y-3 items-start">
          <div class="flex flex-col gap-3 min-w-0">
            <p [class]="rol">Accionante</p>
            <input aria-label="Nombre del accionante" placeholder="Nombre" [class]="inputCls" [value]="nombre()" (change)="setNombre($event)" />
            <div class="flex gap-2">
              <select aria-label="Tipo de documento" [class]="inputCls + ' !w-[90px] shrink-0'" (change)="setTipoId($event)">
                @for (t of tiposId; track t) {
                  <option [value]="t" [selected]="(f.contacto.identificacion?.tipo ?? 'CC') === t">{{ t }}</option>
                }
              </select>
              <input
                aria-label="Número de documento"
                placeholder="Número de documento"
                [class]="inputCls + ' tabular-nums'"
                [value]="f.contacto.identificacion?.numero ?? ''"
                (change)="setNumeroId($event)"
              />
            </div>
            <span [class]="label + ' !mb-0'">Actúa por medio de</span>
            <input aria-label="Representante" placeholder="Nadie" [class]="inputCls" [value]="f.agente_oficioso?.nombre ?? ''" (change)="setAgente($event)" />
            @if (f.agente_oficioso; as ag) {
              <div class="flex gap-2">
                <select aria-label="Calidad" [class]="inputCls" (change)="setCalidad($event)">
                  @for (c of calidades; track c) {
                    <option [value]="c" [selected]="ag.calidad === c">{{ calidadLabel[c] }}</option>
                  }
                </select>
                <input
                  aria-label="Parentesco"
                  placeholder="Parentesco"
                  [class]="inputCls"
                  [value]="ag.parentesco ?? ''"
                  (change)="setParentesco($event)"
                />
              </div>
            }
          </div>
          <span class="font-display italic text-[17px] text-on-surface-variant md:pt-7 select-none" aria-hidden="true">contra</span>
          <div class="flex flex-col gap-3 min-w-0">
            <p [class]="rol">Accionados</p>
            <app-editable-string-list
              [items]="nombres('accionado')"
              [rows]="1"
              addLabel="Agregar accionado"
              itemLabel="Accionado"
              emptyText="Sin identificar."
              (itemsChange)="setPartes('accionado', $event)"
            />
          </div>
        </div>

        <div class="pt-5 border-t border-dashed border-outline-variant flex flex-col gap-3">
          <p [class]="rol">Vinculados</p>
          <app-editable-string-list
            [items]="nombres('vinculado')"
            [rows]="1"
            addLabel="Agregar vinculado"
            itemLabel="Vinculado"
            emptyText="Ninguno."
            (itemsChange)="setPartes('vinculado', $event)"
          />
        </div>
      </div>
    </section>
  `,
})
export class EditIdentificacion {
  readonly ficha = input.required<MessageAnalysis>();
  readonly recibidoAt = input<string | null>(null);
  readonly patched = output<FichaPatch>();

  readonly label = LABEL;
  readonly rol = ROL;
  readonly inputCls = FICHA_INPUT;
  readonly tiposId = TIPOS_ID;
  readonly calidades = Object.keys(CALIDAD_AGENTE) as CalidadAgente[];
  readonly calidadLabel = CALIDAD_AGENTE;
  readonly tiposAct = Object.keys(PROVIDENCIA_ACTUACION) as TipoActuacion[];
  readonly tipoActLabel = PROVIDENCIA_ACTUACION;
  readonly unidades = Object.keys(UNIDAD_TERMINO) as Unidad[];
  readonly unidadLabel = UNIDAD_TERMINO;
  readonly formatDate = formatBogotaDateTime;
  readonly orNull = orNull;
  readonly value = inputValue;

  readonly radicado = computed(() => {
    const r = this.ficha().identificacion.radicado;
    return r ? formatRadicado(r) : '';
  });

  private readonly tipoIdPendiente = signal<TipoIdPersona>('CC');

  readonly nombre = computed(() => {
    const f = this.ficha();
    return f.accionante?.nombre ?? f.contacto.nombre?.valor ?? '';
  });

  /** La providencia que se muestra: la más reciente del correo. */
  private readonly actIndex = computed(() => ultimaActuacionIndex(this.ficha()));
  readonly actuacion = computed(() => this.ficha().actuaciones[this.actIndex()] ?? null);

  nombres(rol: ParteFicha['rol']): string[] {
    return this.ficha().partes_mencionadas.filter((p) => p.rol === rol).map((p) => p.nombre);
  }

  setPartes(rol: ParteFicha['rol'], nombres: string[]): void {
    const otras = this.ficha().partes_mencionadas.filter((p) => p.rol !== rol);
    const nuevas = nombres.map((nombre) => ({ rol, nombre }));
    const accionados = rol === 'accionado' ? nuevas : otras;
    const vinculados = rol === 'vinculado' ? nuevas : otras;
    this.patched.emit({ partes_mencionadas: [...accionados, ...vinculados] });
  }

  setId(key: Exclude<keyof IdentificacionProceso, 'radicado'>, e: Event): void {
    const id = this.ficha().identificacion;
    this.patched.emit({ identificacion: { ...id, [key]: orNull(inputValue(e)) } });
  }

  setRadicado(e: Event): void {
    const digits = normalizeRadicadoInput(inputValue(e));
    this.patched.emit({ identificacion: { ...this.ficha().identificacion, radicado: digits || null } });
  }

  tipoAct(e: Event): TipoActuacion {
    return inputValue(e) as TipoActuacion;
  }

  setAct(change: Partial<Actuacion>): void {
    const i = this.actIndex();
    const list = this.ficha().actuaciones;
    if (i < 0) return;
    this.patched.emit({ actuaciones: replaceAt(list, i, { ...list[i]!, ...change }) });
  }

  setCantidad(e: Event): void {
    const cantidad = Math.round(Number(inputValue(e)));
    const prev = this.actuacion()?.termino;
    this.setAct({
      termino: cantidad > 0 ? { cantidad, unidad: prev?.unidad ?? 'dias_habiles', texto: null } : null,
    });
  }

  setUnidad(e: Event): void {
    const prev = this.actuacion()?.termino;
    if (prev) this.setAct({ termino: { ...prev, unidad: inputValue(e) as Unidad, texto: null } });
  }

  setNombre(e: Event): void {
    const f = this.ficha();
    const nombre = orNull(inputValue(e));
    const prev = f.contacto.nombre;
    this.patched.emit({
      accionante: { nombre, municipio: f.accionante?.municipio ?? null, edad: f.accionante?.edad ?? null },
      contacto: {
        ...f.contacto,
        nombre: nombre ? { valor: nombre, confianza: 'alta', pagina: prev?.pagina ?? 1 } : null,
      },
    });
  }

  setTipoId(e: Event): void {
    const c = this.ficha().contacto;
    const prev = c.identificacion;
    const tipo = inputValue(e) as TipoIdPersona;
    // Sin número no hay identificación que guardar: el tipo se aplica al escribir el número.
    this.tipoIdPendiente.set(tipo);
    if (prev) this.patched.emit({ contacto: { ...c, identificacion: { ...prev, tipo, confianza: 'alta' } } });
  }

  setNumeroId(e: Event): void {
    const c = this.ficha().contacto;
    const numero = inputValue(e).replace(/[^0-9A-Za-z]/g, '').toUpperCase();
    const prev = c.identificacion;
    this.patched.emit({
      contacto: {
        ...c,
        identificacion: numero
          ? { tipo: prev?.tipo ?? this.tipoIdPendiente(), numero, confianza: 'alta', pagina: prev?.pagina ?? 1 }
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

  setParentesco(e: Event): void {
    const prev = this.ficha().agente_oficioso;
    if (prev) this.patched.emit({ agente_oficioso: { ...prev, parentesco: orNull(inputValue(e)) } });
  }
}
