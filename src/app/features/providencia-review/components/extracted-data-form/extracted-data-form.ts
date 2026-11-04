import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
  AUTO_SUBTIPOS,
  SENTENCIA_SUBTIPOS,
  confianzaLabel,
  subtipoLabel,
} from '../../../../core/api/document-labels';
import type {
  Clase,
  Confianza,
  DocumentDetail,
  DocumentFields,
  Especialidad,
  Categoria,
  Parte,
  Subtipo,
  Unidad,
} from '../../../../core/api/types';
import { formatRadicado } from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';
import { PartiesTable } from '../parties-table/parties-table';

export type FormFields = {
  radicadoDisplay: string;
  clase: Clase | '';
  subtipo: Subtipo | '';
  fecha: string;
  juzgadoNombre: string;
  juzgadoNumero: string;
  especialidad: Especialidad | '';
  categoria: Categoria | '';
  ciudad: string;
  departamento: string;
  correoJuzgado: string;
  terminoCantidad: number | null;
  terminoUnidad: Unidad | '';
  terminoTexto: string | null;
  partes: Parte[];
};

@Component({
  selector: 'app-extracted-data-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon, PartiesTable],
  template: `
    <article class="bg-surface-container-lowest rounded-lg p-space-md shadow-sm">
      <div
        class="flex items-center justify-between mb-space-md pb-space-xs border-b border-surface-container-high"
      >
        <div>
          <h2 class="text-headline-sm text-on-surface flex items-center gap-space-xs m-0">
            <app-material-icon name="fact_check" [size]="18" className="text-primary" />
            <span>Datos identificados de la providencia</span>
          </h2>
          <p class="text-caption text-on-surface-variant mt-0.5 mb-0">
            Revise la precisión de la extracción automatizada frente al PDF original.
          </p>
        </div>
        <button
          type="button"
          class="px-space-xs py-1 text-xs rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors font-medium border-0 cursor-pointer"
          (click)="confirmAll.emit()"
        >
          Confirmar datos
        </button>
      </div>

      @if (form(); as f) {
        <div class="flex flex-col gap-space-md">
          <!-- Radicado -->
          <div
            class="p-3 rounded-lg flex flex-col gap-1.5"
            [class]="fieldTone('radicado')"
            id="field-radicado"
          >
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <label class="text-label-default font-semibold" [class]="labelTone('radicado')"
                  >1. Radicado judicial</label
                >
                @if (badge('radicado'); as b) {
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" [class]="b.cls">
                    {{ b.text }}
                  </span>
                }
                @if (isLlm('radicado')) {
                  <span class="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium"
                    >✦ Sugerido por IA</span
                  >
                }
              </div>
              @if (pageOf('radicado'); as pg) {
                <button
                  type="button"
                  class="text-caption text-primary hover:underline flex items-center gap-0.5 border-0 bg-transparent cursor-pointer"
                  (click)="goPage.emit(pg)"
                >
                  <app-material-icon name="visibility" [size]="13" />
                  <span>pág. {{ pg }}</span>
                </button>
              }
            </div>
            <input
              class="w-full h-9 px-3 rounded-[6px] bg-white font-mono text-body-default text-on-surface focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0"
              type="text"
              [value]="f.radicadoDisplay"
              (input)="patch({ radicadoDisplay: inputVal($event) })"
            />
            @if (originalRadicado()) {
              <div class="flex items-start gap-1 text-[12px] text-[#B91C1C]">
                <app-material-icon name="info" [size]="14" className="shrink-0 mt-0.5" />
                <span
                  >Texto OCR extraído:
                  <code class="font-mono bg-white/80 px-1 rounded">{{ originalRadicado() }}</code></span
                >
              </div>
            }
          </div>

          <!-- Tipo -->
          <div class="p-3 rounded-lg bg-surface-container-lowest shadow-sm flex flex-col gap-1.5" id="field-tipo">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <label class="text-label-default font-medium text-on-surface">2. Tipo de providencia</label>
                @if (badge('tipo_providencia'); as b) {
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" [class]="b.cls">{{ b.text }}</span>
                }
                @if (isLlm('tipo_providencia')) {
                  <span class="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">✦ Sugerido por IA</span>
                }
              </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
              <div>
                <span class="text-caption text-on-surface-variant block mb-1">Clase principal:</span>
                <select
                  class="w-full h-9 px-3 rounded-[6px] bg-surface-container-lowest text-body-default border-0"
                  [value]="f.clase"
                  (change)="onClase($event)"
                >
                  <option value="">—</option>
                  <option value="auto">Auto</option>
                  <option value="sentencia">Sentencia</option>
                  <option value="desconocido">Desconocido</option>
                </select>
              </div>
              <div>
                <span class="text-caption text-on-surface-variant block mb-1">Subtipo procesal:</span>
                <select
                  class="w-full h-9 px-3 rounded-[6px] bg-surface-container-lowest text-body-default border-0"
                  [value]="f.subtipo"
                  [disabled]="f.clase === 'desconocido' || !f.clase"
                  (change)="onSubtipo($event)"
                >
                  <option value="">—</option>
                  @for (s of subtipoOptions(); track s) {
                    <option [value]="s">{{ subtipoLabel(s) }}</option>
                  }
                </select>
              </div>
            </div>
          </div>

          <!-- Fecha -->
          <div class="p-3 rounded-lg bg-surface-container-lowest shadow-sm flex flex-col gap-1.5" id="field-fecha">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <label class="text-label-default font-medium text-on-surface">3. Fecha de la providencia</label>
                @if (badge('fecha_providencia'); as b) {
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" [class]="b.cls">{{ b.text }}</span>
                }
              </div>
              @if (pageOf('fecha_providencia'); as pg) {
                <button type="button" class="text-caption text-primary hover:underline flex items-center gap-0.5 border-0 bg-transparent cursor-pointer" (click)="goPage.emit(pg)">
                  <app-material-icon name="visibility" [size]="13" /><span>pág. {{ pg }}</span>
                </button>
              }
            </div>
            <input
              class="w-full h-9 px-3 rounded-[6px] bg-surface-container-lowest text-body-default border-0"
              type="date"
              [value]="f.fecha"
              (input)="patch({ fecha: inputVal($event) })"
            />
          </div>

          <!-- Juzgado -->
          <div class="p-3 rounded-lg bg-surface-container-lowest shadow-sm flex flex-col gap-2" id="field-juzgado">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <label class="text-label-default font-medium text-on-surface">4. Despacho judicial emisor</label>
                @if (badge('juzgado'); as b) {
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" [class]="b.cls">{{ b.text }}</span>
                }
              </div>
              @if (pageOf('juzgado'); as pg) {
                <button type="button" class="text-caption text-primary hover:underline flex items-center gap-0.5 border-0 bg-transparent cursor-pointer" (click)="goPage.emit(pg)">
                  <app-material-icon name="visibility" [size]="13" /><span>pág. {{ pg }}</span>
                </button>
              }
            </div>
            <input class="w-full h-9 px-3 rounded-[6px] bg-surface-container-lowest text-body-default font-medium border-0" type="text" [value]="f.juzgadoNombre" (input)="patch({ juzgadoNombre: inputVal($event) })" />
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2 text-caption">
              <div>
                <span class="text-on-surface-variant block">No.</span>
                <input class="w-full h-8 px-2 rounded-[6px] bg-surface-container-lowest text-center border-0" type="text" [value]="f.juzgadoNumero" (input)="patch({ juzgadoNumero: inputVal($event) })" />
              </div>
              <div>
                <span class="text-on-surface-variant block">Especialidad</span>
                <select class="w-full h-8 px-2 rounded-[6px] bg-surface-container-lowest border-0" [value]="f.especialidad" (change)="onEspecialidad($event)">
                  <option value="">—</option>
                  @for (e of especialidades; track e) {
                    <option [value]="e">{{ e }}</option>
                  }
                </select>
              </div>
              <div>
                <span class="text-on-surface-variant block">Categoría</span>
                <select class="w-full h-8 px-2 rounded-[6px] bg-surface-container-lowest border-0" [value]="f.categoria" (change)="onCategoria($event)">
                  <option value="">—</option>
                  <option value="municipal">municipal</option>
                  <option value="circuito">circuito</option>
                  <option value="tribunal">tribunal</option>
                </select>
              </div>
              <div>
                <span class="text-on-surface-variant block">Ciudad</span>
                <input class="w-full h-8 px-2 rounded-[6px] bg-surface-container-lowest border-0" type="text" [value]="f.ciudad" (input)="patch({ ciudad: inputVal($event) })" />
              </div>
              <div>
                <span class="text-on-surface-variant block">Depto</span>
                <input class="w-full h-8 px-2 rounded-[6px] bg-surface-container-lowest border-0" type="text" [value]="f.departamento" (input)="patch({ departamento: inputVal($event) })" />
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-caption text-on-surface-variant">Correo institucional del juzgado:</span>
                @if (badge('correo_juzgado'); as b) {
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" [class]="b.cls">{{ b.text }}</span>
                }
              </div>
              <input class="w-full h-8 px-3 rounded-[6px] bg-surface-container-lowest font-mono text-caption border-0" type="email" [value]="f.correoJuzgado" (input)="patch({ correoJuzgado: inputVal($event) })" />
            </div>
          </div>

          <!-- Término -->
          <div class="p-3 rounded-lg flex flex-col gap-2 shadow-sm" [class]="fieldTone('termino_contestar')" id="field-termino">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="flex items-center gap-2 flex-wrap">
                <label class="text-label-default font-semibold" [class]="labelTone('termino_contestar')">5. Término para contestar</label>
                @if (badge('termino_contestar'); as b) {
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium" [class]="b.cls">{{ b.text }}</span>
                }
                @if (isLlm('termino_contestar')) {
                  <span class="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">✦ Sugerido por IA</span>
                }
              </div>
              @if (pageOf('termino_contestar'); as pg) {
                <button type="button" class="text-caption text-primary hover:underline flex items-center gap-0.5 border-0 bg-transparent cursor-pointer" (click)="goPage.emit(pg)">
                  <app-material-icon name="visibility" [size]="13" /><span>pág. {{ pg }}</span>
                </button>
              }
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-space-xs">
              <div>
                <span class="text-caption text-on-surface-variant block mb-0.5">Cantidad:</span>
                <input class="w-full h-9 px-3 rounded-[6px] bg-white font-semibold border-0 shadow-sm" type="number" [value]="f.terminoCantidad ?? ''" (input)="patch({ terminoCantidad: numVal($event) })" />
              </div>
              <div>
                <span class="text-caption text-on-surface-variant block mb-0.5">Unidad:</span>
                <select class="w-full h-9 px-2 rounded-[6px] bg-white border-0 shadow-sm" [value]="f.terminoUnidad" (change)="onUnidad($event)">
                  <option value="">—</option>
                  <option value="horas">Horas</option>
                  <option value="dias">Días</option>
                  <option value="dias_habiles">Días hábiles</option>
                </select>
              </div>
              <div class="col-span-2">
                <span class="text-caption text-on-surface-variant block mb-0.5">Fecha límite estimada:</span>
                <div class="h-9 px-3 rounded-[6px] bg-surface-container flex items-center text-xs font-semibold text-error">
                  {{ deadlineLabel() || 'Se recalculará al guardar' }}
                </div>
              </div>
            </div>
            @if (f.terminoTexto) {
              <div class="p-2 bg-white rounded text-[12px] text-zinc-700 italic border-l-2 border-amber-500">
                <span class="font-normal font-sans text-on-surface-variant not-italic">Cita textual:</span>
                {{ f.terminoTexto }}
              </div>
            }
          </div>

          <!-- Partes -->
          <div class="p-3 rounded-lg bg-surface-container-lowest shadow-sm flex flex-col gap-2" id="field-partes">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <label class="text-label-default font-medium text-on-surface">6. Partes procesales identificadas</label>
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#DCFCE7] text-[#15803D] text-[11px] font-medium">
                  {{ f.partes.length }} partes
                </span>
                @if (isLlm('partes')) {
                  <span class="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">✦ Sugerido por IA</span>
                }
              </div>
            </div>
            <app-parties-table
              [parties]="f.partes"
              (addParty)="addParty.emit()"
              (remove)="removeParty.emit($event)"
            />
          </div>
        </div>
      }
    </article>
  `,
})
export class ExtractedDataForm {
  readonly subtipoLabel = subtipoLabel;
  readonly especialidades: Especialidad[] = [
    'penal',
    'civil',
    'laboral',
    'familia',
    'administrativo',
    'promiscuo',
    'pequenas_causas',
  ];

  readonly doc = input.required<DocumentDetail>();
  readonly form = input.required<FormFields>();
  readonly deadlineLabel = input<string | null>(null);

  readonly formChange = output<Partial<FormFields>>();
  readonly confirmAll = output<void>();
  readonly goPage = output<number>();
  readonly addParty = output<void>();
  readonly removeParty = output<number>();

  readonly originalRadicado = computed(
    () => this.doc().fields?.radicado?.valor?.original ?? null,
  );

  readonly subtipoOptions = computed(() => {
    const c = this.form().clase;
    if (c === 'sentencia') return SENTENCIA_SUBTIPOS;
    if (c === 'auto') return AUTO_SUBTIPOS;
    return [];
  });

  patch(partial: Partial<FormFields>): void {
    this.formChange.emit(partial);
  }

  onClase(event: Event): void {
    const clase = this.selectVal(event) as Clase | '';
    this.patch({ clase, subtipo: '' });
  }

  onSubtipo(event: Event): void {
    this.patch({ subtipo: this.selectVal(event) as Subtipo | '' });
  }

  onEspecialidad(event: Event): void {
    this.patch({ especialidad: this.selectVal(event) as Especialidad | '' });
  }

  onCategoria(event: Event): void {
    this.patch({ categoria: this.selectVal(event) as Categoria | '' });
  }

  onUnidad(event: Event): void {
    this.patch({ terminoUnidad: this.selectVal(event) as Unidad | '' });
  }

  inputVal(event: Event): string {
    return event.target instanceof HTMLInputElement ? event.target.value : '';
  }

  selectVal(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }

  numVal(event: Event): number | null {
    if (!(event.target instanceof HTMLInputElement)) return null;
    const n = Number(event.target.value);
    return Number.isFinite(n) ? n : null;
  }

  isLlm(field: string): boolean {
    const d = this.doc();
    return d.review_status === 'unreviewed' && d.llm_fields.includes(field as never);
  }

  pageOf(key: keyof DocumentFields): number | null {
    const fields = this.doc().fields;
    if (!fields || key === 'partes') return null;
    const c = fields[key];
    if (c && typeof c === 'object' && 'pagina' in c) return c.pagina;
    return null;
  }

  confOf(key: keyof DocumentFields): Confianza | null {
    const fields = this.doc().fields;
    if (!fields || key === 'partes') return null;
    const c = fields[key];
    if (c && typeof c === 'object' && 'confianza' in c) return c.confianza;
    return null;
  }

  badge(key: keyof DocumentFields): { text: string; cls: string } | null {
    if (key === 'partes') return null;
    const conf = this.confOf(key);
    const fields = this.doc().fields;
    const campo = fields?.[key];
    const valor =
      campo && typeof campo === 'object' && 'valor' in campo
        ? (campo as { valor: unknown }).valor
        : null;
    if (valor == null && !conf) {
      return { text: 'No encontrado', cls: 'bg-surface-container text-on-surface-variant' };
    }
    const text = confianzaLabel(conf);
    if (conf === 'baja') return { text, cls: 'bg-[#FEE2E2] text-[#991B1B]' };
    if (conf === 'media') return { text, cls: 'bg-[#FEF3C7] text-[#92400E]' };
    if (conf === 'alta') return { text, cls: 'bg-[#DCFCE7] text-[#15803D]' };
    return { text, cls: 'bg-surface-container text-on-surface-variant' };
  }

  fieldTone(key: keyof DocumentFields): string {
    const conf = this.confOf(key);
    if (conf === 'baja') return 'bg-[#FEF2F2]/60';
    if (conf === 'media') return 'bg-[#FFFBEB]/70';
    return 'bg-surface-container-lowest shadow-sm';
  }

  labelTone(key: keyof DocumentFields): string {
    const conf = this.confOf(key);
    if (conf === 'baja') return 'text-[#991B1B]';
    if (conf === 'media') return 'text-[#92400E]';
    return 'text-on-surface';
  }
}

export function fieldsToForm(fields: DocumentFields | null): FormFields {
  const r = fields?.radicado?.valor?.normalizado;
  const tipo = fields?.tipo_providencia?.valor;
  const juz = fields?.juzgado?.valor;
  const term = fields?.termino_contestar?.valor;
  return {
    radicadoDisplay: r ? formatRadicado(r) : '',
    clase: tipo?.clase ?? '',
    subtipo: tipo?.subtipo ?? '',
    fecha: fields?.fecha_providencia?.valor ?? '',
    juzgadoNombre: juz?.nombre ?? '',
    juzgadoNumero: juz?.numero != null ? String(juz.numero) : '',
    especialidad: juz?.especialidad ?? '',
    categoria: juz?.categoria ?? '',
    ciudad: juz?.ciudad ?? '',
    departamento: juz?.departamento ?? '',
    correoJuzgado: fields?.correo_juzgado?.valor ?? '',
    terminoCantidad: term?.cantidad ?? null,
    terminoUnidad: term?.unidad ?? '',
    terminoTexto: term?.texto ?? null,
    partes: fields?.partes ? structuredClone(fields.partes) : [],
  };
}
