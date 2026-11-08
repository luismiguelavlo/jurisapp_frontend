import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TIPO_ACTUACION, UNIDAD_TERMINO } from '../../../../core/api/ficha-labels';
import type {
  Actuacion,
  MessageActuacionDerivada,
  TipoActuacion,
  Unidad,
} from '../../../../core/api/types';
import { formatBogotaDateTime } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { ToneBadge } from '../../../../shared/components/tone-badge/tone-badge';
import {
  type DocumentPageRef,
  FICHA_HINT,
  FICHA_INPUT,
  FICHA_LABEL,
  FICHA_LINK_BTN,
  FICHA_SECTION_TITLE,
  FICHA_TEXTAREA,
  inputValue,
  orNull,
  removeAt,
  replaceAt,
} from '../../ficha-ui';

/**
 * Actuaciones del juzgado notificadas en este correo, vengan del documento que vengan: tipo, fecha de
 * notificación (la del correo), término, vencimiento, a quién se dirige y resumen de lo ordenado.
 */
@Component({
  selector: 'app-ficha-actuaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, ToneBadge],
  template: `
    <section class="flex flex-col gap-3">
      <h3 [class]="title">Actuaciones del juzgado en esta notificación</h3>
      @if (actuaciones().length === 0) {
        <p [class]="hint">El análisis no encontró actuaciones del despacho en este correo.</p>
      }
      @for (a of actuaciones(); track $index; let i = $index) {
        @let d = derivadas()[i];
        <article class="rounded-lg border border-outline-variant p-4 flex flex-col gap-3 bg-surface-container-lowest">
          <header class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-label-default font-semibold text-on-surface">{{ i + 1 }}. {{ tipoLabel[a.tipo] }}</span>
              @if (d?.exige_respuesta_entidad === true) {
                <app-tone-badge tone="warn">Exige trámite de la entidad</app-tone-badge>
              } @else if (d?.exige_respuesta_entidad === false) {
                <app-tone-badge tone="neutral">La orden es para otra entidad</app-tone-badge>
              }
              @if (!a.verificada) {
                <app-tone-badge tone="neutral">Cita sin verificar</app-tone-badge>
              }
            </div>
            <div class="flex items-center gap-2">
              @if (d?.attachment_id && d?.pagina) {
                <button
                  type="button"
                  class="text-caption text-primary hover:underline inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0"
                  (click)="openPage.emit({ attachment_id: d!.attachment_id!, pagina: d!.pagina! })"
                >
                  <app-material-icon name="visibility" [size]="14" /> Ver en el documento (pág. {{ d!.pagina }})
                </button>
              }
              <button
                type="button"
                class="text-caption text-on-surface-variant hover:text-error border-0 bg-transparent cursor-pointer p-0 underline"
                (click)="changed.emit(removeAt(actuaciones(), i))"
              >
                Quitar
              </button>
            </div>
          </header>

          <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_110px_150px] gap-3">
            <div>
              <label [class]="label" [for]="'act-t-' + i">Tipo de actuación</label>
              <select [id]="'act-t-' + i" [class]="inputCls" (change)="set(i, { tipo: tipo($event) })">
                @for (k of tipos; track k) {
                  <option [value]="k" [selected]="a.tipo === k">{{ tipoLabel[k] }}</option>
                }
              </select>
            </div>
            <div>
              <label [class]="label" [for]="'act-n-' + i">Fecha y hora de notificación</label>
              <input [id]="'act-n-' + i" [class]="inputCls" [value]="notificado()" disabled />
            </div>
            <div>
              <label [class]="label" [for]="'act-c-' + i">Término</label>
              <input
                [id]="'act-c-' + i"
                type="number"
                min="1"
                [class]="inputCls"
                [value]="a.termino?.cantidad ?? ''"
                (change)="setCantidad(i, $event)"
              />
            </div>
            <div>
              <label [class]="label" [for]="'act-u-' + i">Unidad</label>
              <select [id]="'act-u-' + i" [class]="inputCls" (change)="setUnidad(i, $event)">
                @for (u of unidades; track u) {
                  <option [value]="u" [selected]="(a.termino?.unidad ?? 'horas') === u">{{ unidadLabel[u] }}</option>
                }
              </select>
            </div>
          </div>
          <p class="m-0 text-body-compact text-on-surface">
            @if (d?.vence_at) {
              Vence: <strong>{{ formatDate(d!.vence_at) }}</strong>
            } @else if (a.termino) {
              <span class="text-on-surface-variant">El vencimiento se calcula al guardar.</span>
            } @else {
              <span class="text-on-surface-variant">Sin término.</span>
            }
            @if (a.fecha_providencia) {
              <span class="text-on-surface-variant"> · Providencia del {{ a.fecha_providencia }}</span>
            }
          </p>

          <div>
            <label [class]="label" [for]="'act-d-' + i">A quién se dirige la orden</label>
            <input
              [id]="'act-d-' + i"
              [class]="inputCls"
              [value]="a.destinatarios.join('; ')"
              (change)="setDestinatarios(i, $event)"
            />
          </div>
          <div>
            <label [class]="label" [for]="'act-o-' + i">Resumen de lo ordenado</label>
            <textarea
              [id]="'act-o-' + i"
              [class]="textarea"
              rows="2"
              [value]="a.orden ?? a.descripcion ?? ''"
              (change)="set(i, { orden: orNull(value($event)) })"
            ></textarea>
          </div>
        </article>
      }
      <button type="button" class="self-start" [class]="linkBtn" (click)="add()">
        <app-material-icon name="add" [size]="16" /> Agregar otra actuación
      </button>
    </section>
  `,
})
export class FichaActuaciones {
  readonly actuaciones = input.required<Actuacion[]>();
  readonly derivadas = input<MessageActuacionDerivada[]>([]);
  /** Recepción del correo: fecha de notificación de todas sus actuaciones. */
  readonly recibidoAt = input<string | null>(null);
  readonly changed = output<Actuacion[]>();
  readonly openPage = output<DocumentPageRef>();

  readonly title = FICHA_SECTION_TITLE;
  readonly label = FICHA_LABEL;
  readonly hint = FICHA_HINT;
  readonly inputCls = FICHA_INPUT;
  readonly textarea = FICHA_TEXTAREA;
  readonly linkBtn = FICHA_LINK_BTN;
  readonly tipos = Object.keys(TIPO_ACTUACION) as TipoActuacion[];
  readonly tipoLabel = TIPO_ACTUACION;
  readonly unidades = Object.keys(UNIDAD_TERMINO) as Unidad[];
  readonly unidadLabel = UNIDAD_TERMINO;
  readonly orNull = orNull;
  readonly removeAt = removeAt;
  readonly value = inputValue;
  readonly formatDate = formatBogotaDateTime;

  notificado(): string {
    return formatBogotaDateTime(this.recibidoAt());
  }

  tipo(e: Event): TipoActuacion {
    return inputValue(e) as TipoActuacion;
  }

  set(i: number, change: Partial<Actuacion>): void {
    const list = this.actuaciones();
    this.changed.emit(replaceAt(list, i, { ...list[i], ...change }));
  }

  setCantidad(i: number, e: Event): void {
    const n = Number.parseInt(inputValue(e), 10);
    const prev = this.actuaciones()[i].termino;
    this.set(i, {
      termino: n > 0 ? { cantidad: n, unidad: prev?.unidad ?? 'horas', texto: null } : null,
    });
  }

  setUnidad(i: number, e: Event): void {
    const prev = this.actuaciones()[i].termino;
    if (prev) this.set(i, { termino: { ...prev, unidad: inputValue(e) as Unidad, texto: null } });
  }

  setDestinatarios(i: number, e: Event): void {
    const list = inputValue(e)
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean);
    this.set(i, { destinatarios: list });
  }

  add(): void {
    const a: Actuacion = {
      tipo: 'admisorio',
      descripcion: null,
      fecha_providencia: null,
      termino: null,
      destinatarios: [],
      orden: null,
      sentido: null,
      decision_desacato: null,
      sancionados: [],
      pagina: 1,
      verificada: false,
    };
    this.changed.emit([...this.actuaciones(), a]);
  }
}
