import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  DECISION_DESACATO,
  SENTIDO_FALLO,
  TIPO_ACTUACION,
  UNIDAD_TERMINO,
  fuenteLabel,
} from '../../../core/api/ficha-labels';
import type {
  Actuacion,
  ActuacionFicha,
  DecisionDesacato,
  Fuente,
  Sancionado,
  SentidoFallo,
  TipoActuacion,
  Unidad,
} from '../../../core/api/types';
import { formatCalendarDate } from '../../../core/utils/date-format';
import { MaterialIcon } from '../material-icon/material-icon';
import { ToneBadge } from '../tone-badge/tone-badge';

/** Indicadores derivados con la entidad del tenant (solo en la ficha). */
export type ActuacionDerivados = Pick<
  ActuacionFicha,
  'exige_respuesta_entidad' | 'sentido_frente_entidad' | 'sancion_entidad'
>;

const FIELD =
  'w-full h-8 px-2 rounded-[6px] bg-surface-container-low text-body-compact text-on-surface border-0 focus:outline-none focus:ring-1 focus:ring-primary';

/**
 * Tarjeta de una actuación del despacho (SPEC 21 §3.5).
 * Con `derivados` muestra los indicadores frente a la entidad; sin ellos (análisis por
 * documento) solo los datos de la actuación.
 */
@Component({
  selector: 'app-actuacion-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, ToneBadge],
  template: `
    @let a = actuacion();
    <article [class]="articleClass()">
      @if (!editing()) {
        <div class="flex flex-col gap-0.5 min-w-0">
          <time class="text-body-default font-semibold text-on-surface tabular-nums">{{
            a.fecha_providencia ? formatCalendarDate(a.fecha_providencia) : 'Sin fecha'
          }}</time>
          <span class="text-caption text-on-surface-variant">{{ plazo(a) }}</span>
        </div>

        <div class="flex flex-col gap-1.5 min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-label-compact text-primary">{{ tipoLabel(a.tipo) }}</span>
            @if (nuevo()) {
              <app-tone-badge tone="warn">Nueva</app-tone-badge>
            }
          </div>

          @if (a.orden || a.descripcion) {
            <p class="m-0 text-body-default text-on-surface font-medium max-w-[65ch]">
              {{ a.orden || a.descripcion }}
            </p>
          }
          @if (a.orden && a.descripcion) {
            <p class="m-0 text-body-compact text-on-surface-variant max-w-[65ch]">{{ a.descripcion }}</p>
          }
          @if (a.destinatarios.length) {
            <p class="m-0 text-body-compact text-on-surface-variant">
              Dirigida a {{ a.destinatarios.join(', ') }}
            </p>
          }
          @if (a.termino?.texto) {
            <p class="m-0 text-body-compact text-on-surface-variant">
              El auto dice: «{{ a.termino!.texto }}»
            </p>
          }
          @if (a.sentido) {
            <p class="m-0 text-body-compact text-on-surface">
              Sentido del fallo: <strong>{{ sentidoLabel(a.sentido) }}</strong>
            </p>
          }
          @if (a.decision_desacato) {
            <p class="m-0 text-body-compact text-on-surface">
              Decisión: <strong>{{ decisionLabel(a.decision_desacato) }}</strong>
            </p>
          }
          @if (a.sancionados.length) {
            <ul class="m-0 pl-5 list-disc text-body-compact text-on-surface">
              @for (s of a.sancionados; track $index) {
                <li>{{ sancionLabel(s) }}</li>
              }
            </ul>
          }
          @if (!a.verificada) {
            <p class="m-0 flex items-center gap-1 text-caption text-tertiary">
              <app-material-icon name="warning" [size]="14" />
              No se pudo verificar en el documento; revísala en la fuente.
            </p>
          }

          <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
            @if (derivados(); as d) {
              @switch (d.exige_respuesta_entidad) {
                @case (true) {
                  <app-tone-badge tone="danger" [strong]="true">Te toca responder</app-tone-badge>
                }
                @case (false) {
                  <span class="text-caption text-on-surface-variant">Dirigida a otra entidad</span>
                }
                @default {
                  <span class="text-caption text-on-surface-variant" [title]="nullHint()"
                    >Sin determinar si te toca: {{ nullHint().toLowerCase() }}</span
                  >
                }
              }
              @if (d.sentido_frente_entidad === 'favorable') {
                <app-tone-badge tone="success">Favorable a tu entidad</app-tone-badge>
              } @else if (d.sentido_frente_entidad === 'desfavorable') {
                <app-tone-badge tone="danger">Desfavorable: hay órdenes para tu entidad</app-tone-badge>
              }
              @if (d.sancion_entidad === true) {
                <app-tone-badge tone="danger" [strong]="true">La sanción alcanza a tu entidad</app-tone-badge>
              }
            }
            @if (fuente(); as f) {
              <button
                type="button"
                class="ml-auto text-caption text-primary hover:underline border-0 bg-transparent cursor-pointer p-0"
                (click)="openSource.emit(f)"
              >
                {{ citaLabel(f) }}
              </button>
            } @else {
              <span class="ml-auto text-caption text-on-surface-variant">Pág. {{ a.pagina }}</span>
            }
          </div>
        </div>
      } @else {
        <div class="col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2">
          <label class="flex flex-col gap-1 text-caption text-on-surface-variant">
            Tipo
            <select [class]="field" [value]="a.tipo" (change)="setTipo($event)">
              @for (t of tipos; track t) {
                <option [value]="t">{{ tipoLabel(t) }}</option>
              }
            </select>
          </label>
          <label class="flex flex-col gap-1 text-caption text-on-surface-variant">
            Fecha de la providencia
            <input
              type="date"
              [class]="field"
              [value]="a.fecha_providencia ?? ''"
              (input)="patch({ fecha_providencia: val($event) || null })"
            />
          </label>
          <div class="flex flex-col gap-1 text-caption text-on-surface-variant">
            Término
            <div class="flex gap-1">
              <input
                type="number"
                min="0"
                aria-label="Cantidad del término"
                [class]="field + ' w-20'"
                [value]="a.termino?.cantidad ?? ''"
                (input)="setTermino({ cantidad: val($event) })"
              />
              <select
                aria-label="Unidad del término"
                [class]="field"
                [value]="a.termino?.unidad ?? ''"
                (change)="setTermino({ unidad: val($event) })"
              >
                <option value="">Sin término</option>
                @for (u of unidades; track u) {
                  <option [value]="u">{{ unidadLabel(u) }}</option>
                }
              </select>
            </div>
          </div>
          <label class="md:col-span-3 flex flex-col gap-1 text-caption text-on-surface-variant">
            Texto del término
            <input
              type="text"
              [class]="field"
              [disabled]="!a.termino"
              [value]="a.termino?.texto ?? ''"
              (input)="setTermino({ texto: val($event) })"
            />
          </label>
          <label class="md:col-span-3 flex flex-col gap-1 text-caption text-on-surface-variant">
            Descripción
            <input
              type="text"
              [class]="field"
              [value]="a.descripcion ?? ''"
              (input)="patch({ descripcion: val($event) || null })"
            />
          </label>
          <label class="md:col-span-3 flex flex-col gap-1 text-caption text-on-surface-variant">
            Destinatarios (uno por línea)
            <textarea
              rows="2"
              class="w-full px-2 py-1.5 rounded-[6px] bg-surface-container-low text-body-compact text-on-surface border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              [value]="a.destinatarios.join('\\n')"
              (input)="patch({ destinatarios: lines($event) })"
            ></textarea>
          </label>
          <label class="md:col-span-3 flex flex-col gap-1 text-caption text-on-surface-variant">
            Orden
            <textarea
              rows="2"
              class="w-full px-2 py-1.5 rounded-[6px] bg-surface-container-low text-body-compact text-on-surface border-0 focus:outline-none focus:ring-1 focus:ring-primary"
              [value]="a.orden ?? ''"
              (input)="patch({ orden: val($event) || null })"
            ></textarea>
          </label>
          @if (isFallo()) {
            <label class="flex flex-col gap-1 text-caption text-on-surface-variant">
              Sentido del fallo
              <select
                [class]="field"
                [value]="a.sentido ?? ''"
                (change)="setSentido($event)"
              >
                <option value="">—</option>
                @for (s of sentidos; track s) {
                  <option [value]="s">{{ sentidoLabel(s) }}</option>
                }
              </select>
            </label>
          }
          @if (isDesacato()) {
            <label class="flex flex-col gap-1 text-caption text-on-surface-variant">
              Decisión de desacato
              <select
                [class]="field"
                [value]="a.decision_desacato ?? ''"
                (change)="setDecision($event)"
              >
                <option value="">—</option>
                @for (d of decisiones; track d) {
                  <option [value]="d">{{ decisionLabel(d) }}</option>
                }
              </select>
            </label>
          }
        </div>
      }
    </article>
  `,
})
export class ActuacionCard {
  readonly actuacion = input.required<Actuacion>();
  readonly fuente = input<Fuente | null>(null);
  /** null = no mostrar indicadores de la entidad. */
  readonly derivados = input<ActuacionDerivados | null>(null);
  readonly nuevo = input(false);
  readonly entidadNoConfigurada = input(false);
  readonly editing = input(false);

  readonly openSource = output<Fuente>();
  readonly actuacionChange = output<Actuacion>();

  readonly field = FIELD;
  readonly tipos = Object.keys(TIPO_ACTUACION) as TipoActuacion[];
  readonly unidades = Object.keys(UNIDAD_TERMINO) as Unidad[];
  readonly sentidos = Object.keys(SENTIDO_FALLO) as SentidoFallo[];
  readonly decisiones = Object.keys(DECISION_DESACATO) as DecisionDesacato[];
  readonly formatCalendarDate = formatCalendarDate;

  readonly isFallo = computed(() => {
    const t = this.actuacion().tipo;
    return t === 'fallo_primera' || t === 'fallo_segunda' || this.actuacion().sentido !== null;
  });
  readonly isDesacato = computed(() => {
    const a = this.actuacion();
    return a.tipo.includes('desacato') || a.decision_desacato !== null;
  });
  readonly nullHint = computed(() =>
    this.entidadNoConfigurada()
      ? 'Configura tu entidad'
      : !this.actuacion().verificada
        ? 'Actuación sin verificar'
        : 'No se puede determinar',
  );

  readonly articleClass = computed(() => {
    const rule =
      this.derivados()?.exige_respuesta_entidad === true
        ? 'border-error'
        : this.derivados() && this.derivados()!.exige_respuesta_entidad === null
          ? 'border-outline-variant border-dashed'
          : 'border-outline-variant';
    return `grid grid-cols-[92px_minmax(0,1fr)] gap-x-4 gap-y-2 py-3.5 pl-4 border-l-[3px] ${rule}`;
  });

  plazo(a: Actuacion): string {
    if (!a.termino) return 'Sin término';
    return `Término ${a.termino.cantidad} ${UNIDAD_TERMINO[a.termino.unidad]}`;
  }

  readonly citaLabel = fuenteLabel;

  sancionLabel(s: Sancionado): string {
    const partes = [s.nombre || 'Sin nombre', s.cargo, s.entidad].filter(Boolean).join(', ');
    const pena = [
      s.multa_smlmv != null ? `multa de ${s.multa_smlmv} SMLMV` : null,
      s.arresto_dias != null ? `arresto de ${s.arresto_dias} días` : null,
    ]
      .filter(Boolean)
      .join(' y ');
    return pena ? `${partes}: ${pena}` : partes;
  }

  tipoLabel = (t: TipoActuacion) => TIPO_ACTUACION[t] ?? t;
  sentidoLabel = (s: SentidoFallo) => SENTIDO_FALLO[s] ?? s;
  decisionLabel = (d: DecisionDesacato) => DECISION_DESACATO[d] ?? d;
  unidadLabel = (u: Unidad) => UNIDAD_TERMINO[u];

  val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  lines(e: Event): string[] {
    return this.val(e)
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  setTipo(e: Event): void {
    this.patch({ tipo: this.val(e) as TipoActuacion });
  }

  setSentido(e: Event): void {
    this.patch({ sentido: (this.val(e) || null) as SentidoFallo | null });
  }

  setDecision(e: Event): void {
    this.patch({ decision_desacato: (this.val(e) || null) as DecisionDesacato | null });
  }

  patch(p: Partial<Actuacion>): void {
    this.actuacionChange.emit({ ...this.actuacion(), ...p });
  }

  setTermino(p: { cantidad?: string; unidad?: string; texto?: string }): void {
    const cur = this.actuacion().termino;
    const unidad = (p.unidad ?? cur?.unidad ?? '') as Unidad | '';
    if (!unidad) {
      this.patch({ termino: null });
      return;
    }
    const cantidadRaw = p.cantidad ?? String(cur?.cantidad ?? '');
    const cantidad = Number(cantidadRaw);
    this.patch({
      termino: {
        cantidad: Number.isFinite(cantidad) && cantidadRaw !== '' ? cantidad : 0,
        unidad,
        texto: p.texto !== undefined ? p.texto || null : (cur?.texto ?? null),
      },
    });
  }
}
