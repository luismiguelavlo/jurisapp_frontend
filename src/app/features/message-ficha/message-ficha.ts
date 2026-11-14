import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { Actuacion, MessageAnalysis, MessageAnalysisState } from '../../core/api/types';
import { errorText } from '../../core/api/errors';
import { formatBogotaDateTime } from '../../core/utils/date-format';
import { AlertBanner } from '../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../shared/components/material-icon/material-icon';
import { FichaAccionante } from './components/ficha-accionante/ficha-accionante';
import { FichaActuaciones } from './components/ficha-actuaciones/ficha-actuaciones';
import { FichaAntecedentes } from './components/ficha-antecedentes/ficha-antecedentes';
import { FichaCaso } from './components/ficha-caso/ficha-caso';
import { FichaProceso } from './components/ficha-proceso/ficha-proceso';
import { FichaResumen } from './components/ficha-resumen/ficha-resumen';
import { FichaServicio } from './components/ficha-servicio/ficha-servicio';
import type { DocumentPageRef, FichaPatch } from './ficha-ui';

/**
 * Ficha UNIFICADA del correo: una sola, con lo que dicen el cuerpo y todos sus documentos.
 * Mantiene el borrador y emite la ficha completa al confirmar.
 */
@Component({
  selector: 'app-message-ficha',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBanner,
    MaterialIcon,
    FichaProceso,
    FichaAccionante,
    FichaServicio,
    FichaCaso,
    FichaAntecedentes,
    FichaActuaciones,
    FichaResumen,
  ],
  template: `
    @let st = state();
    <article class="bg-surface-container-lowest rounded-xl shadow-sm flex flex-col">
      <header
        class="px-5 sm:px-6 py-4 border-b border-surface-container-high flex flex-wrap items-start justify-between gap-3"
      >
        <div class="min-w-0">
          <h2 class="m-0 text-headline-md text-on-surface">
            {{ editing() ? 'Verifique los datos antes de guardar' : 'Ficha del proceso' }}
          </h2>
          <p class="m-0 mt-1 text-body-compact text-on-surface-variant">
            {{ documentosLabel() }} · Datos propuestos a partir del correo y de todos sus documentos, leídos juntos.
            @if (st.origen === 'revision' && st.revisado_at) {
              Confirmado el {{ formatDate(st.revisado_at) }}.
            }
          </p>
        </div>
        @if (draft()) {
          <div class="flex items-center gap-2">
            @if (editing()) {
              <button
                type="button"
                class="h-9 px-3 rounded-md border border-outline-variant bg-transparent text-label-compact text-on-surface cursor-pointer hover:bg-surface-container-low"
                (click)="cancelEdit()"
              >
                {{ dirty() ? 'Descartar cambios' : 'Cancelar' }}
              </button>
            } @else {
              <button
                type="button"
                class="h-9 px-3 rounded-md border border-outline-variant bg-transparent text-label-compact text-on-surface cursor-pointer hover:bg-surface-container-low inline-flex items-center gap-1.5"
                (click)="editing.set(true)"
              >
                <app-material-icon name="edit" [size]="16" /> Editar datos
              </button>
            }
            <button
              type="button"
              class="h-9 px-4 rounded-md border-0 bg-primary text-on-primary text-label-compact font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
              [disabled]="saving()"
              (click)="submit()"
            >
              <app-material-icon name="check_circle" [size]="16" />
              {{ saving() ? 'Guardando…' : st.origen === 'revision' && !dirty() ? 'Confirmado' : 'Confirmar datos' }}
            </button>
          </div>
        }
      </header>

      <div class="px-5 sm:px-6 py-5 flex flex-col gap-6">
        @switch (st.estado) {
          @case ('pendiente') {
            @if (!draft()) {
              <app-alert-banner variant="info" title="Analizando el correo">
                Se leerán juntos el cuerpo del correo y todos sus documentos. Esta pantalla se actualiza sola.
              </app-alert-banner>
            }
          }
          @case ('analizando') {
            @if (!draft()) {
              <app-alert-banner variant="info" title="Analizando el correo">
                Leyendo el cuerpo y todos los documentos juntos…
              </app-alert-banner>
            }
          }
          @case ('fallido') {
            <app-alert-banner variant="warning" title="No se pudo analizar el correo">
              {{ errorLabel() }}
              <button type="button" class="ml-2 underline border-0 bg-transparent cursor-pointer text-inherit" (click)="reanalyze.emit()">
                Reanalizar
              </button>
            </app-alert-banner>
          }
          @case ('omitido') {
            <app-alert-banner variant="warning" title="El correo no se analizó">
              {{ errorLabel() }}
              <button type="button" class="ml-2 underline border-0 bg-transparent cursor-pointer text-inherit" (click)="reanalyze.emit()">
                Reanalizar
              </button>
            </app-alert-banner>
          }
        }
        @if (st.desactualizado && st.estado !== 'fallido') {
          <app-alert-banner variant="info" title="Llegó o cambió un documento">
            La ficha se está rehaciendo con el material nuevo.
          </app-alert-banner>
        }
        @if (st.analisis_posterior) {
          <app-alert-banner variant="info" title="Hay un análisis más reciente">
            Se muestra la ficha confirmada. Reanalice si quiere partir del análisis nuevo.
          </app-alert-banner>
        }

        @if (draft(); as f) {
          @if (editing() && (f.resumen_lectura || f.observaciones)) {
            <div class="rounded-lg bg-[#FEF7E6] text-[#5B4300] px-4 py-3 text-body-default leading-relaxed">
              @if (f.resumen_lectura) {
                <p class="m-0"><strong>Observaciones de la lectura:</strong> {{ f.resumen_lectura }}</p>
              }
              @if (f.observaciones) {
                <p class="m-0" [class.mt-2]="!!f.resumen_lectura">
                  <strong>Para revisar:</strong> {{ f.observaciones }}
                </p>
              }
            </div>
          }

          @if (!editing()) {
            <app-ficha-resumen [ficha]="f" [state]="st" [recibidoAt]="recibidoAt()" />
            <div class="flex justify-end">
              <button
                type="button"
                class="h-10 px-4 rounded-md border border-primary bg-transparent text-label-default font-semibold text-primary cursor-pointer hover:bg-primary-fixed/40 inline-flex items-center gap-1.5"
                (click)="editing.set(true)"
              >
                <app-material-icon name="edit" [size]="16" /> Editar datos
              </button>
            </div>
          } @else {
          <app-ficha-proceso
            [identificacion]="f.identificacion"
            [calidadEntidad]="st.calidad_entidad"
            (patched)="patch($event)"
          />
          <app-ficha-accionante [ficha]="f" (patched)="patch($event)" />
          <app-ficha-servicio [ficha]="f" (patched)="patch($event)" />
          <app-ficha-caso [ficha]="f" (patched)="patch($event)" />
          <app-ficha-antecedentes [ficha]="f" (patched)="patch($event)" />
          <app-ficha-actuaciones
            [actuaciones]="f.actuaciones"
            [derivadas]="dirty() ? [] : st.actuaciones"
            [recibidoAt]="recibidoAt()"
            (changed)="patch({ actuaciones: $event })"
            (openPage)="openPage.emit($event)"
          />

          <footer class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-surface-container-high">
            <button
              type="button"
              class="h-9 px-3 rounded-md border border-outline-variant bg-transparent text-label-compact text-on-surface-variant cursor-pointer hover:bg-surface-container-low inline-flex items-center gap-1.5"
              (click)="reanalyze.emit()"
            >
              <app-material-icon name="refresh" [size]="16" /> Reanalizar el correo
            </button>
            <button
              type="button"
              class="h-10 px-5 rounded-md border-0 bg-primary text-on-primary text-label-default font-semibold cursor-pointer disabled:opacity-60"
              [disabled]="saving()"
              (click)="submit()"
            >
              {{ saving() ? 'Guardando…' : 'Confirmar datos' }}
            </button>
          </footer>
          }
        }
      </div>
    </article>
  `,
})
export class MessageFicha {
  readonly state = input.required<MessageAnalysisState>();
  readonly documentosCount = input(0);
  readonly recibidoAt = input<string | null>(null);
  /** Remitente del correo: es el correo del juzgado. */
  readonly remitente = input<string | null>(null);
  readonly saving = input(false);

  readonly save = output<MessageAnalysis>();
  readonly reanalyze = output<void>();
  readonly openPage = output<DocumentPageRef>();

  readonly draft = signal<MessageAnalysis | null>(null);
  /** false = vista de lectura; true = formulario de revisión. */
  readonly editing = signal(false);
  private readonly baseline = signal<string>('');
  readonly formatDate = formatBogotaDateTime;

  constructor() {
    // Una ficha nueva del servidor reemplaza el borrador solo si no hay cambios sin guardar.
    effect(() => {
      const st = this.state();
      untracked(() => {
        if (this.dirty() && this.draft()) return;
        const ficha = st.ficha ? withCorreoJuzgado(structuredClone(st.ficha), st, this.remitente()) : null;
        this.draft.set(ficha);
        this.baseline.set(ficha ? JSON.stringify(ficha) : '');
      });
    });
  }

  readonly dirty = computed(() => {
    const d = this.draft();
    return !!d && JSON.stringify(d) !== this.baseline();
  });

  readonly documentosLabel = computed(() => {
    const n = this.documentosCount();
    return `${n} ${n === 1 ? 'documento adjunto' : 'documentos adjuntos'}`;
  });

  readonly errorLabel = computed(() => {
    const code = this.state().error_code;
    switch (code) {
      case 'llm_daily_limit':
        return 'Se alcanzó el tope diario de análisis; se reintentará mañana.';
      case 'masking_failed':
        return 'No se pudieron proteger todos los datos personales antes de enviarlo al modelo.';
      case 'no_text':
        return 'Ni el correo ni sus documentos tienen texto legible.';
      default:
        return errorText(code);
    }
  });

  patch(change: FichaPatch): void {
    this.draft.update((d) => (d ? { ...d, ...change } : d));
  }

  cancelEdit(): void {
    this.discard();
    this.editing.set(false);
  }

  discard(): void {
    const b = this.baseline();
    this.draft.set(b ? (JSON.parse(b) as MessageAnalysis) : null);
  }

  submit(): void {
    const d = this.draft();
    if (!d || this.saving()) return;
    this.save.emit(clean(d));
  }

  /** Lo que el usuario dejó vacío no se guarda; los hechos alimentan también el resumen del caso. */
  markSaved(ficha: MessageAnalysis | null): void {
    this.editing.set(false);
    this.draft.set(ficha ? structuredClone(ficha) : null);
    this.baseline.set(ficha ? JSON.stringify(ficha) : '');
  }
}

/** Sin revisión humana, el correo del despacho es el remitente del correo (de ahí llega todo). */
function withCorreoJuzgado(
  f: MessageAnalysis,
  st: MessageAnalysisState,
  remitente: string | null,
): MessageAnalysis {
  const email = remitente?.match(/[^\s<>"']+@[^\s<>"']+/)?.[0]?.toLowerCase() ?? null;
  if (!email || (st.origen === 'revision' && f.identificacion.correo_despacho)) return f;
  return { ...f, identificacion: { ...f.identificacion, correo_despacho: email } };
}

function clean(f: MessageAnalysis): MessageAnalysis {
  const texts = (xs: string[]) => xs.map((x) => x.trim()).filter(Boolean);
  const hechos = texts(f.hechos);
  const actuaciones: Actuacion[] = f.actuaciones.map((a) => ({ ...a, destinatarios: texts(a.destinatarios) }));
  return {
    ...f,
    hechos,
    hechos_resumen: hechos.length ? hechos.map((h) => `• ${h}`).join('\n').slice(0, 2000) : f.hechos_resumen,
    pretensiones: texts(f.pretensiones),
    derechos_invocados: texts(f.derechos_invocados),
    pruebas_aportadas: texts(f.pruebas_aportadas),
    tecnologias: f.tecnologias.filter((t) => t.nombre.trim()),
    diagnosticos: f.diagnosticos.filter((d) => d.descripcion.trim()),
    antecedentes: f.antecedentes.filter((a) => a.descripcion.trim()),
    reclamos_previos: f.reclamos_previos.filter((r) => r.entidad.trim()),
    actuaciones,
  };
}
