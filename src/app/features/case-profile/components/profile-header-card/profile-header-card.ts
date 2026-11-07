import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CALIDAD_AGENTE, REGIMEN, fuenteLabel, mergeFuentes } from '../../../../core/api/ficha-labels';
import type {
  AccionanteFicha,
  AgenteOficioso,
  Aseguradora,
  CalidadAgente,
  CaseProfile,
  Confianza,
  Fuente,
  Regimen,
} from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

const FIELD =
  'w-full h-8 px-2 rounded-[4px] bg-surface-container-lowest border border-outline-variant text-body-compact text-on-surface focus:outline-none focus:ring-1 focus:ring-primary';

/** Margen de la ficha: quién demanda, cómo contactarlo, EPS y lugar (§3.3). */
@Component({
  selector: 'app-profile-header-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MaterialIcon],
  host: { class: 'block' },
  template: `
    @let f = ficha();
    <dl class="m-0 flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <dt class="text-caption font-semibold text-on-surface-variant">Accionante</dt>
        <dd class="m-0">
          @if (f.accionante; as s) {
            @if (!editing()) {
              <span class="block text-headline-sm text-on-surface">{{
                s.valor.nombre || 'Sin nombre'
              }}</span>
              <span class="block text-body-compact text-on-surface-variant">{{
                accionanteDetalle(s.valor)
              }}</span>
            } @else {
              <div class="flex flex-col gap-1">
                <input
                  [class]="field"
                  placeholder="Nombre"
                  aria-label="Nombre del accionante"
                  [value]="s.valor.nombre ?? ''"
                  (input)="patchAccionante({ nombre: val($event) || null })"
                />
                <div class="flex gap-1">
                  <input
                    [class]="field + ' w-20'"
                    type="number"
                    min="0"
                    placeholder="Edad"
                    aria-label="Edad del accionante"
                    [value]="s.valor.edad ?? ''"
                    (input)="patchAccionante({ edad: num($event) })"
                  />
                  <input
                    [class]="field"
                    placeholder="Municipio"
                    aria-label="Municipio del accionante"
                    [value]="s.valor.municipio ?? ''"
                    (input)="patchAccionante({ municipio: val($event) || null })"
                  />
                </div>
              </div>
            }
          } @else {
            <span class="text-body-compact text-on-surface-variant">No aparece en los documentos</span>
          }
        </dd>
      </div>

      @if (f.accionante?.valor; as a) {
        @if (a.identificacion || a.telefonos.length || a.correo || a.direccion) {
          <div class="flex flex-col gap-1">
            <dt class="text-caption font-semibold text-on-surface-variant">Documento y contacto</dt>
            <dd class="m-0 flex flex-col gap-1 text-body-compact text-on-surface">
              @if (a.identificacion; as id) {
                <span class="flex items-center gap-1.5 tabular-nums">
                  {{ id.tipo }} {{ id.numero }}
                  @if (needsCheck(id.confianza)) {
                    <ng-container *ngTemplateOutlet="verify" />
                  }
                </span>
              }
              @for (t of a.telefonos; track $index) {
                <span class="flex items-center gap-1.5 tabular-nums">
                  {{ t.valor }}
                  @if (needsCheck(t.confianza)) {
                    <ng-container *ngTemplateOutlet="verify" />
                  }
                </span>
              }
              @if (a.correo; as c) {
                <span class="flex items-center gap-1.5 break-all">
                  {{ c.valor }}
                  @if (needsCheck(c.confianza)) {
                    <ng-container *ngTemplateOutlet="verify" />
                  }
                </span>
              }
              @if (a.direccion; as d) {
                <span class="flex items-center gap-1.5">
                  {{ d.valor }}
                  @if (needsCheck(d.confianza)) {
                    <ng-container *ngTemplateOutlet="verify" />
                  }
                </span>
              }
            </dd>
          </div>
        }
      }

      @if (f.agente_oficioso; as s) {
        <div class="flex flex-col gap-1">
          <dt class="text-caption font-semibold text-on-surface-variant">Actúa en su nombre</dt>
          <dd class="m-0 text-body-compact text-on-surface">
            @if (!editing()) {
              {{ s.valor.nombre }}
              <span class="block text-on-surface-variant">{{ agenteDetalle(s.valor) }}</span>
            } @else {
              <div class="flex flex-col gap-1">
                <input
                  [class]="field"
                  placeholder="Nombre"
                  aria-label="Nombre del agente"
                  [value]="s.valor.nombre"
                  (input)="patchAgente({ nombre: val($event) })"
                />
                <select
                  [class]="field"
                  aria-label="Calidad del agente"
                  [value]="s.valor.calidad"
                  (change)="setCalidad($event)"
                >
                  @for (c of calidades; track c) {
                    <option [value]="c">{{ calidadLabel(c) }}</option>
                  }
                </select>
                <input
                  [class]="field"
                  placeholder="Parentesco"
                  aria-label="Parentesco"
                  [value]="s.valor.parentesco ?? ''"
                  (input)="patchAgente({ parentesco: val($event) || null })"
                />
              </div>
            }
          </dd>
        </div>
      }

      @if (f.aseguradora; as s) {
        <div class="flex flex-col gap-1">
          <dt class="text-caption font-semibold text-on-surface-variant">EPS</dt>
          <dd class="m-0 text-body-compact text-on-surface">
            @if (!editing()) {
              {{ s.valor.nombre }}
              @if (s.valor.regimen) {
                <span class="block text-on-surface-variant"
                  >Régimen {{ regimenLabel(s.valor.regimen).toLowerCase() }}</span
                >
              }
            } @else {
              <div class="flex flex-col gap-1">
                <input
                  [class]="field"
                  placeholder="EPS"
                  aria-label="EPS"
                  [value]="s.valor.nombre"
                  (input)="patchAseguradora({ nombre: val($event) })"
                />
                <select
                  [class]="field"
                  aria-label="Régimen"
                  [value]="s.valor.regimen ?? ''"
                  (change)="setRegimen($event)"
                >
                  <option value="">Régimen sin dato</option>
                  @for (r of regimenes; track r) {
                    <option [value]="r">{{ regimenLabel(r) }}</option>
                  }
                </select>
              </div>
            }
          </dd>
        </div>
      }

      @if (f.lugar_atencion; as s) {
        <div class="flex flex-col gap-1">
          <dt class="text-caption font-semibold text-on-surface-variant">Lugar de atención</dt>
          <dd class="m-0 text-body-compact text-on-surface">
            @if (!editing()) {
              {{ s.valor }}
            } @else {
              <input
                [class]="field"
                aria-label="Lugar de atención"
                [value]="s.valor"
                (input)="lugarChange.emit(val($event))"
              />
            }
          </dd>
        </div>
      }
    </dl>

    @if (fuentes().length) {
      <p class="m-0 mt-3 flex flex-wrap items-baseline gap-x-2 text-caption text-on-surface-variant">
        <span>Fuente:</span>
        @for (fu of fuentes(); track $index; let last = $last) {
          <button
            type="button"
            class="text-caption text-primary hover:underline border-0 bg-transparent cursor-pointer p-0"
            (click)="openSource.emit(fu)"
          >
            {{ fuenteLabel(fu) }}{{ last ? '' : ';' }}
          </button>
        }
      </p>
    }

    <ng-template #verify>
      <span class="inline-flex" title="Dato leído con confianza media o baja: verifícalo">
        <app-material-icon
          name="help"
          [size]="14"
          className="text-tertiary"
          ariaLabel="Verificar este dato"
        />
      </span>
    </ng-template>
  `,
})
export class ProfileHeaderCard {
  readonly ficha = input.required<CaseProfile>();
  readonly editing = input(false);

  readonly lugarChange = output<string>();
  readonly accionanteChange = output<AccionanteFicha>();
  readonly agenteChange = output<AgenteOficioso>();
  readonly aseguradoraChange = output<Aseguradora>();
  readonly openSource = output<Fuente>();

  readonly field = FIELD;
  readonly calidades = Object.keys(CALIDAD_AGENTE) as CalidadAgente[];
  readonly regimenes = Object.keys(REGIMEN) as Regimen[];
  readonly fuenteLabel = fuenteLabel;

  /** Fuentes del margen, agrupadas por documento. */
  readonly fuentes = computed(() => {
    const f = this.ficha();
    return mergeFuentes(
      [f.accionante, f.agente_oficioso, f.aseguradora, f.lugar_atencion].flatMap((s) => s?.fuentes ?? []),
    );
  });

  needsCheck = (c: Confianza) => c !== 'alta';
  calidadLabel = (c: CalidadAgente) => CALIDAD_AGENTE[c];
  regimenLabel = (r: Regimen) => REGIMEN[r];

  accionanteDetalle(a: AccionanteFicha): string {
    const edad = a.edad != null ? `${a.edad} años` : null;
    return [edad, a.municipio].filter(Boolean).join(', ') || 'Sin edad ni municipio';
  }

  agenteDetalle(a: AgenteOficioso): string {
    const calidad = CALIDAD_AGENTE[a.calidad];
    const base = calidad.charAt(0).toUpperCase() + calidad.slice(1);
    return a.parentesco ? `${base}, ${a.parentesco}` : base;
  }

  val(e: Event): string {
    return (e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
  }

  num(e: Event): number | null {
    const v = this.val(e);
    const n = Number(v);
    return v === '' || !Number.isFinite(n) ? null : n;
  }

  patchAccionante(p: Partial<AccionanteFicha>): void {
    const s = this.ficha().accionante;
    if (s) this.accionanteChange.emit({ ...s.valor, ...p });
  }

  patchAgente(p: Partial<AgenteOficioso>): void {
    const s = this.ficha().agente_oficioso;
    if (s) this.agenteChange.emit({ ...s.valor, ...p });
  }

  setCalidad(e: Event): void {
    this.patchAgente({ calidad: this.val(e) as CalidadAgente });
  }

  patchAseguradora(p: Partial<Aseguradora>): void {
    const s = this.ficha().aseguradora;
    if (s) this.aseguradoraChange.emit({ ...s.valor, ...p });
  }

  setRegimen(e: Event): void {
    this.patchAseguradora({ regimen: (this.val(e) || null) as Regimen | null });
  }
}
