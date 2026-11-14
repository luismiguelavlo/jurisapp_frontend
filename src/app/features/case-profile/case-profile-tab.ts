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
import { ApiError } from '../../core/api/client';
import { casesApi, documentsApi, entityNamesApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type {
  Actuacion,
  CaseDetail,
  CaseProfile,
  DocumentItem,
  CaseProfileResponse,
  Fuente,
  ParteFicha,
} from '../../core/api/types';
import { formatBogotaDateTime, formatCalendarDate } from '../../core/utils/date-format';
import { normalizeEntityName } from '../../core/utils/entity-name';
import { ActuacionCard } from '../../shared/components/actuacion-card/actuacion-card';
import { AlertBanner } from '../../shared/components/alert-banner/alert-banner';
import { MaterialIcon } from '../../shared/components/material-icon/material-icon';
import { ProfileAiSummary } from './components/profile-ai-summary/profile-ai-summary';
import { ProfileAntecedentes } from './components/profile-antecedentes/profile-antecedentes';
import { ProfileIdentificacion } from './components/profile-identificacion/profile-identificacion';
import { ProfileObjeto } from './components/profile-objeto/profile-objeto';
import { buildIdentificacion } from './models/case-overview.models';
import { ProfileEntityBanner } from './components/profile-entity-banner/profile-entity-banner';
import { ProfileHeaderCard } from './components/profile-header-card/profile-header-card';
import { ProfileMedida } from './components/profile-medida/profile-medida';
import { ProfileParties } from './components/profile-parties/profile-parties';
import { ProfileSection } from './components/profile-section/profile-section';
import { ProfileStringList } from './components/profile-string-list/profile-string-list';
import { ProfileTable } from './components/profile-table/profile-table';
import { ProfileTextBlock } from './components/profile-text-block/profile-text-block';
import {
  ANTECEDENTE_COLUMNS,
  DIAGNOSTICO_COLUMNS,
  PARTE_COLUMNS,
  RECLAMO_COLUMNS,
  TECNOLOGIA_COLUMNS,
  cleanProfile,
  hasNewSinceReview,
  isEmptyProfile,
  newAntecedente,
  newDiagnostico,
  newParte,
  newReclamo,
  newTecnologia,
  type SeccionKey,
  type ValorOf,
} from './models/case-profile.models';

const BTN =
  'flex items-center gap-1 px-3 py-1.5 rounded-lg font-label-default text-label-default border-0 cursor-pointer disabled:opacity-50 disabled:cursor-default';

/**
 * Pestaña "Ficha" del proceso (SPEC 21 §3–4).
 * Privacidad (§9): la ficha vive solo en memoria; nunca se persiste ni se registra.
 */
@Component({
  selector: 'app-case-profile-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AlertBanner,
    MaterialIcon,
    ActuacionCard,
    ProfileAiSummary,
    ProfileAntecedentes,
    ProfileEntityBanner,
    ProfileIdentificacion,
    ProfileObjeto,
    ProfileHeaderCard,
    ProfileMedida,
    ProfileParties,
    ProfileSection,
    ProfileStringList,
    ProfileTable,
    ProfileTextBlock,
  ],
  template: `
    @if (loading()) {
      <p class="m-0 text-body-default text-on-surface-variant">Cargando ficha…</p>
    } @else if (error()) {
      <div class="p-4 rounded-xl bg-error-container text-on-error-container">
        {{ error() }}
        <button
          type="button"
          class="underline border-0 bg-transparent cursor-pointer text-inherit ml-2"
          (click)="load()"
        >
          Reintentar
        </button>
      </div>
    } @else if (view(); as f) {
      @if (empty()) {
        <div class="flex flex-col gap-4">
          <app-alert-banner variant="info" title="Todavía no hay ficha para este caso">
            Se arma sola cuando se analizan los documentos del expediente. Si acaban de llegar,
            vuelve en unos minutos.
          </app-alert-banner>
          @if (identificacion(); as idv) {
            <app-profile-identificacion [data]="idv" />
          }
        </div>
      } @else {
        <div class="flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0 flex-1 basis-[420px]">
              <app-profile-entity-banner [ficha]="f" />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              @if (!editing()) {
                <button
                  type="button"
                  [class]="btn + ' bg-transparent text-on-surface hover:bg-surface-container'"
                  [disabled]="saving()"
                  (click)="confirmUnchanged()"
                >
                  {{ saving() ? 'Guardando…' : 'Confirmar sin cambios' }}
                </button>
                <button
                  type="button"
                  [class]="btn + ' bg-primary text-on-primary hover:bg-brand-hover'"
                  (click)="startEdit()"
                >
                  <app-material-icon name="edit" [size]="16" />
                  Revisar ficha
                </button>
              } @else {
                <button
                  type="button"
                  [class]="btn + ' bg-transparent text-on-surface hover:bg-surface-container'"
                  [disabled]="saving()"
                  (click)="cancelEdit()"
                >
                  Descartar cambios
                </button>
                <button
                  type="button"
                  [class]="btn + ' bg-primary text-on-primary hover:bg-brand-hover'"
                  [disabled]="saving()"
                  (click)="save()"
                >
                  {{ saving() ? 'Guardando…' : 'Guardar revisión' }}
                </button>
              }
            </div>
          </div>

          @if (outdated()) {
            <app-alert-banner variant="warning" title="Llegaron documentos nuevos">
              Recarga la ficha para revisarla con todo. Los cambios sin guardar se perderán.
              <button
                type="button"
                class="underline border-0 bg-transparent cursor-pointer text-inherit ml-1 p-0"
                (click)="forceReload()"
              >
                Recargar ficha
              </button>
            </app-alert-banner>
          }
          @if (formError()) {
            <app-alert-banner variant="error">{{ formError() }}</app-alert-banner>
          }
          @if (hasNew() && data()?.reviewed_at) {
            <app-alert-banner variant="warning">
              Llegó información nueva después de la última revisión; está marcada como «Nuevo».
            </app-alert-banner>
          }

          @if (!editing()) {
            <app-profile-ai-summary
              [text]="f.hechos_resumen?.valor ?? null"
              [reviewed]="f.hechos_resumen?.origen === 'revision'"
            />
            @if (identificacion(); as idv) {
              <app-profile-identificacion [data]="idv" />
            }
            <app-profile-objeto
              [objeto]="f.objeto?.valor ?? null"
              [tecnologias]="f.tecnologias?.valor ?? null"
              [derechos]="f.derechos_invocados?.valor ?? null"
              [lugar]="f.lugar_atencion?.valor ?? null"
            />
            <p class="m-0 text-caption text-on-surface-variant">
              @if (data()?.reviewed_at; as r) {
                Ficha revisada por {{ reviewerLabel() }} el {{ formatBogotaDateTime(r) }}.
              } @else {
                Nadie ha revisado esta ficha todavía.
              }
            </p>
          } @else {
          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
            <!-- Hoja principal -->
            <article
              class="min-w-0 bg-surface-container-lowest rounded-xl shadow-sm px-5 sm:px-8 py-7 flex flex-col divide-y divide-outline-variant/60 [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0"
            >
              <div class="flex flex-col gap-2">
                <p class="m-0 text-caption text-on-surface-variant">Qué pide la tutela</p>
                @if (f.objeto; as s) {
                  <app-profile-text-block
                    variant="lead"
                    label="Objeto de la tutela"
                    [rows]="2"
                    [text]="s.valor"
                    [editing]="editing()"
                    (textChange)="setValor('objeto', $event)"
                  />
                } @else {
                  <p class="m-0 text-body-default text-on-surface-variant">
                    El objeto no aparece en los documentos.
                  </p>
                }
                <p class="m-0 text-caption text-on-surface-variant">
                  @if (data()?.reviewed_at; as r) {
                    Ficha revisada por {{ reviewerLabel() }} el {{ formatBogotaDateTime(r) }}
                  } @else {
                    Nadie ha revisado esta ficha todavía.
                  }
                </p>
              </div>

              <section class="flex flex-col gap-3">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 class="m-0 text-headline-sm text-on-surface">Actuaciones del despacho</h3>
                  @if (pendingCount(); as n) {
                    <span class="text-label-compact text-error"
                      >{{ n }} te toca{{ n === 1 ? '' : 'n' }} responder</span
                    >
                  }
                </div>
                <p class="m-0 text-caption text-on-surface-variant">
                  El término de cada actuación es informativo. El vencimiento que cuenta está en la
                  línea de tiempo.
                </p>
                @if (f.actuaciones.length === 0) {
                  <p class="m-0 text-body-compact text-on-surface-variant">
                    No hay actuaciones en los documentos.
                  </p>
                }
                <div class="flex flex-col gap-1">
                  @for (af of f.actuaciones; track $index; let i = $index) {
                    <app-actuacion-card
                      [actuacion]="af.actuacion"
                      [fuente]="af.fuente"
                      [derivados]="af"
                      [nuevo]="af.nuevo_desde_revision"
                      [entidadNoConfigurada]="f.entidad_no_configurada"
                      [editing]="editing()"
                      (actuacionChange)="setActuacion(i, $event)"
                      (openSource)="openSource.emit($event)"
                    />
                  }
                </div>
              </section>

              <app-profile-section
                title="Hechos"
                hint="Resumen generado a partir del escrito; contrástalo con la fuente."
                [seccion]="f.hechos_resumen"
                (openSource)="openSource.emit($event)"
              >
                @if (f.hechos_resumen; as s) {
                  <app-profile-text-block
                    label="Resumen de hechos"
                    [text]="s.valor"
                    [editing]="editing()"
                    (textChange)="setValor('hechos_resumen', $event)"
                  />
                }
              </app-profile-section>

              <app-profile-section
                title="Pretensiones"
                [seccion]="f.pretensiones"
                (openSource)="openSource.emit($event)"
              >
                @if (f.pretensiones; as s) {
                  <app-profile-string-list
                    variant="numbered"
                    [items]="s.valor"
                    [editing]="editing()"
                    (itemsChange)="setValor('pretensiones', $event)"
                  />
                }
              </app-profile-section>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <app-profile-section
                  title="Derechos invocados"
                  [seccion]="f.derechos_invocados"
                  (openSource)="openSource.emit($event)"
                >
                  @if (f.derechos_invocados; as s) {
                    <app-profile-string-list
                      variant="chips"
                      [items]="s.valor"
                      [editing]="editing()"
                      (itemsChange)="setValor('derechos_invocados', $event)"
                    />
                  }
                </app-profile-section>
                <app-profile-section
                  title="Medida provisional"
                  [seccion]="f.medida_provisional"
                  (openSource)="openSource.emit($event)"
                >
                  @if (f.medida_provisional; as s) {
                    <app-profile-medida
                      [medida]="s.valor"
                      [editing]="editing()"
                      (medidaChange)="setValor('medida_provisional', $event)"
                    />
                  }
                </app-profile-section>
                <app-profile-section
                  title="Tratamiento integral"
                  [seccion]="f.tratamiento_integral_solicitado"
                  (openSource)="openSource.emit($event)"
                >
                  @if (f.tratamiento_integral_solicitado; as s) {
                    @if (!editing()) {
                      <p class="m-0 text-body-default text-on-surface">
                        {{ s.valor ? 'Lo solicita' : 'No lo solicita' }}
                      </p>
                    } @else {
                      <label
                        class="flex items-center gap-1.5 text-body-compact text-on-surface cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          [checked]="s.valor"
                          (change)="
                            setValor('tratamiento_integral_solicitado', $any($event.target).checked)
                          "
                        />
                        Solicita tratamiento integral
                      </label>
                    }
                  }
                </app-profile-section>
              </div>

              <app-profile-section
                title="Tecnologías en salud"
                [seccion]="f.tecnologias"
                (openSource)="openSource.emit($event)"
              >
                @if (f.tecnologias; as s) {
                  <app-profile-table
                    [rows]="s.valor"
                    [columns]="tecnologiaColumns"
                    [newRow]="newTecnologia"
                    [editing]="editing()"
                    (rowsChange)="setValor('tecnologias', $event)"
                  />
                }
              </app-profile-section>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <app-profile-section
                  title="Antecedentes"
                  [seccion]="f.antecedentes"
                  (openSource)="openSource.emit($event)"
                >
                  @if (f.antecedentes; as s) {
                    @if (!editing()) {
                      <app-profile-antecedentes [items]="s.valor" />
                    } @else {
                      <app-profile-table
                        [rows]="s.valor"
                        [columns]="antecedenteColumns"
                        [newRow]="newAntecedente"
                        [editing]="true"
                        (rowsChange)="setValor('antecedentes', $event)"
                      />
                    }
                  }
                </app-profile-section>
                <app-profile-section
                  title="Reclamos previos"
                  [seccion]="f.reclamos_previos"
                  (openSource)="openSource.emit($event)"
                >
                  @if (f.reclamos_previos; as s) {
                    @if (!editing()) {
                      <ul class="m-0 p-0 list-none flex flex-col gap-2">
                        @for (r of s.valor; track $index) {
                          <li class="text-body-compact text-on-surface">
                            <span class="font-medium">{{ r.entidad }}</span>
                            @if (r.numero) {
                              <span class="text-on-surface-variant tabular-nums">, {{ r.numero }}</span>
                            }
                            @if (r.fecha) {
                              <span class="text-on-surface-variant">, {{ formatCalendarDate(r.fecha) }}</span>
                            }
                            @if (r.resumen) {
                              <span class="block text-on-surface-variant">{{ r.resumen }}</span>
                            }
                          </li>
                        }
                      </ul>
                    } @else {
                      <app-profile-table
                        [rows]="s.valor"
                        [columns]="reclamoColumns"
                        [newRow]="newReclamo"
                        [editing]="true"
                        (rowsChange)="setValor('reclamos_previos', $event)"
                      />
                    }
                  }
                </app-profile-section>
              </div>

              <app-profile-section
                title="Pruebas aportadas"
                [seccion]="f.pruebas_aportadas"
                (openSource)="openSource.emit($event)"
              >
                @if (f.pruebas_aportadas; as s) {
                  <app-profile-string-list
                    [items]="s.valor"
                    [editing]="editing()"
                    (itemsChange)="setValor('pruebas_aportadas', $event)"
                  />
                }
              </app-profile-section>
            </article>

            <!-- Margen de datos -->
            <aside class="min-w-0 flex flex-col gap-6 lg:sticky lg:top-[72px] lg:pt-2">
              <app-profile-header-card
                [ficha]="f"
                [editing]="editing()"
                (lugarChange)="setValor('lugar_atencion', $event)"
                (accionanteChange)="setValor('accionante', $event)"
                (agenteChange)="setValor('agente_oficioso', $event)"
                (aseguradoraChange)="setValor('aseguradora', $event)"
                (openSource)="openSource.emit($event)"
              />

              <app-profile-section variant="rail" title="Partes" [forceContent]="true">
                @if (!editing()) {
                  <app-profile-parties [partes]="f.partes" [entityNames]="entityNames()" />
                } @else {
                  <app-profile-table
                    [rows]="f.partes"
                    [columns]="parteColumns"
                    [newRow]="newParte"
                    [editing]="true"
                    (rowsChange)="setPartes($event)"
                  />
                }
              </app-profile-section>

              <app-profile-section
                variant="rail"
                title="Diagnósticos"
                [seccion]="f.diagnosticos"
                (openSource)="openSource.emit($event)"
              >
                @if (f.diagnosticos; as s) {
                  @if (!editing()) {
                    <ul class="m-0 p-0 list-none flex flex-col gap-1.5">
                      @for (d of s.valor; track $index) {
                        <li class="flex gap-2 text-body-compact text-on-surface">
                          <span class="w-9 shrink-0 font-semibold text-primary tabular-nums">{{
                            d.cie10 || '—'
                          }}</span>
                          <span>{{ d.descripcion }}</span>
                        </li>
                      }
                    </ul>
                  } @else {
                    <app-profile-table
                      [rows]="s.valor"
                      [columns]="diagnosticoColumns"
                      [newRow]="newDiagnostico"
                      [editing]="true"
                      (rowsChange)="setValor('diagnosticos', $event)"
                    />
                  }
                }
              </app-profile-section>
            </aside>
          </div>
          }
        </div>
      }
    }
  `,
})
export class CaseProfileTab {
  readonly caseId = input.required<string>();
  readonly userEmails = input<ReadonlyMap<string, string>>(new Map());
  /** Detalle del caso: radicado y línea de tiempo para la identificación del proceso. */
  readonly caso = input<CaseDetail | null>(null);

  readonly openSource = output<Fuente>();
  /** true mientras hay una revisión sin guardar (para avisar al salir de la pestaña). */
  readonly editingChange = output<boolean>();

  readonly btn = BTN;
  readonly diagnosticoColumns = DIAGNOSTICO_COLUMNS;
  readonly tecnologiaColumns = TECNOLOGIA_COLUMNS;
  readonly antecedenteColumns = ANTECEDENTE_COLUMNS;
  readonly reclamoColumns = RECLAMO_COLUMNS;
  readonly parteColumns = PARTE_COLUMNS;
  readonly newDiagnostico = newDiagnostico;
  readonly newTecnologia = newTecnologia;
  readonly newAntecedente = newAntecedente;
  readonly newReclamo = newReclamo;
  readonly newParte = newParte;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<CaseProfileResponse | null>(null);
  readonly draft = signal<CaseProfile | null>(null);
  readonly saving = signal(false);
  readonly outdated = signal(false);
  readonly formError = signal<string | null>(null);
  readonly entityNames = signal<readonly string[]>([]);
  /** Providencias extraídas del radicado: juzgado, correo y documentos de las partes. */
  readonly docs = signal<readonly DocumentItem[]>([]);

  readonly identificacion = computed(() => {
    const c = this.caso();
    return c ? buildIdentificacion(c, this.data()?.ficha ?? null, this.docs()) : null;
  });

  readonly editing = computed(() => this.draft() !== null);
  readonly view = computed(() => this.draft() ?? this.data()?.ficha ?? null);
  readonly empty = computed(() => {
    const f = this.data()?.ficha;
    return !!f && isEmptyProfile(f);
  });
  readonly hasNew = computed(() => {
    const f = this.data()?.ficha;
    return !!f && hasNewSinceReview(f);
  });
  /** Actuaciones que exigen respuesta de la entidad. */
  readonly pendingCount = computed(
    () => this.view()?.actuaciones.filter((a) => a.exige_respuesta_entidad === true).length ?? 0,
  );
  readonly reviewerLabel = computed(() => {
    const id = this.data()?.reviewed_by;
    if (!id) return 'un usuario';
    return this.userEmails().get(id) ?? 'un usuario';
  });
  readonly formatBogotaDateTime = formatBogotaDateTime;
  readonly formatCalendarDate = formatCalendarDate;

  private readonly dirty = computed(() => {
    const d = this.draft();
    const f = this.data()?.ficha;
    return !!d && !!f && JSON.stringify(d) !== JSON.stringify(f);
  });

  constructor() {
    effect(() => {
      this.caseId();
      untracked(() => void this.load());
    });
    effect(() => this.editingChange.emit(this.dirty()));
    effect(() => {
      const radicado = this.caso()?.radicado;
      untracked(() => void this.loadDocs(radicado));
    });
  }

  private async loadDocs(radicado: string | undefined): Promise<void> {
    if (!radicado) {
      this.docs.set([]);
      return;
    }
    try {
      const page = await documentsApi.list({ radicado, document_status: 'extracted' }, null, 50);
      this.docs.set(page.items);
    } catch {
      // opcional: sin extracción la identificación usa la ficha y la línea de tiempo
      this.docs.set([]);
    }
  }

  async load(): Promise<void> {
    const id = this.caseId();
    this.loading.set(true);
    this.error.set(null);
    this.outdated.set(false);
    this.formError.set(null);
    this.draft.set(null);
    try {
      this.data.set(await casesApi.profile(id));
    } catch (e) {
      this.data.set(null);
      this.error.set(
        e instanceof ApiError && e.status === 404 ? 'Proceso no encontrado' : this.mapError(e),
      );
    } finally {
      this.loading.set(false);
    }
    void this.loadEntityNames();
  }

  forceReload(): void {
    void this.load();
  }

  startEdit(): void {
    const f = this.data()?.ficha;
    if (!f) return;
    this.formError.set(null);
    this.draft.set(structuredClone(f));
  }

  cancelEdit(): void {
    if (this.dirty() && !confirm('Se descartarán los cambios de la revisión.')) return;
    this.draft.set(null);
    this.formError.set(null);
  }

  confirmUnchanged(): void {
    const f = this.data()?.ficha;
    if (f) void this.submit(f);
  }

  save(): void {
    const d = this.draft();
    if (d) void this.submit(cleanProfile(d));
  }

  setValor<K extends SeccionKey>(key: K, valor: ValorOf<K>): void {
    this.draft.update((d) => {
      const s = d?.[key];
      if (!d || !s) return d;
      return { ...d, [key]: { ...s, valor } } as CaseProfile;
    });
  }

  setActuacion(i: number, actuacion: Actuacion): void {
    this.draft.update((d) =>
      d
        ? { ...d, actuaciones: d.actuaciones.map((a, j) => (j === i ? { ...a, actuacion } : a)) }
        : d,
    );
  }

  setPartes(partes: ParteFicha[]): void {
    this.draft.update((d) => (d ? { ...d, partes } : d));
  }

  private async submit(ficha: CaseProfile): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    try {
      const res = await casesApi.reviewProfile(this.caseId(), ficha);
      this.data.set(res);
      this.draft.set(null);
      this.outdated.set(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.code === 'case_profile_outdated') {
        this.outdated.set(true);
      } else if (e instanceof ApiError && e.status === 422) {
        this.formError.set('Hay datos con un formato no válido.');
      } else if (e instanceof ApiError && e.status === 404) {
        this.error.set('Proceso no encontrado');
      } else {
        this.formError.set(this.mapError(e));
      }
    } finally {
      this.saving.set(false);
    }
  }

  private async loadEntityNames(): Promise<void> {
    try {
      const [list, det] = await Promise.all([
        entityNamesApi.list(),
        entityNamesApi.detection().catch(() => null),
      ]);
      const names = list.map((n) => n.nombre_normalizado || normalizeEntityName(n.nombre));
      if (!list.length && det?.detectada) {
        names.push(det.detectada.nombre_normalizado || normalizeEntityName(det.detectada.nombre));
      }
      // Comparación local: normalizar también lo que dice el backend.
      this.entityNames.set(names.map(normalizeEntityName));
    } catch {
      this.entityNames.set([]);
    }
  }

  private mapError(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.status === 429) return 'Demasiadas solicitudes, espera un momento';
      return errorText(e.code);
    }
    return errorText(null);
  }
}
