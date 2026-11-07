import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ApiError } from '../../core/api/client';
import { entityNamesApi } from '../../core/api/endpoints';
import { errorText } from '../../core/api/errors';
import type { EntityDetection, EntityName } from '../../core/api/types';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AlertBanner } from '../../shared/components/alert-banner/alert-banner';
import { EntityDetectionCard } from './components/entity-detection-card/entity-detection-card';
import { EntityNameForm } from './components/entity-name-form/entity-name-form';
import { EntityNamesTable } from './components/entity-names-table/entity-names-table';

/** Mensajes del formulario (§7.2), más explícitos que los de `errorText`. */
const FORM_ERRORS: Record<string, string> = {
  invalid_entity_name:
    "Ese nombre es demasiado genérico (por ejemplo 'S.A.' o 'EPS') o el NIT no es válido.",
  entity_name_already_exists: 'Ese nombre ya está registrado (o uno equivalente).',
  entity_name_limit_reached: 'Llegaste al máximo de 20 nombres.',
};

/** Configuración → Entidad (SPEC 21 §7). owner/admin gestionan; member solo ve. */
@Component({
  selector: 'app-entity-settings-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AlertBanner, EntityDetectionCard, EntityNameForm, EntityNamesTable],
  template: `
    <div class="w-full max-w-[880px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col gap-5">
      <header>
        <p class="m-0 text-caption text-on-surface-variant">Configuración</p>
        <h1 class="m-0 text-headline-lg text-on-surface font-semibold tracking-tight">Entidad</h1>
        <p class="m-0 mt-1 text-body-default text-on-surface-variant">
          Con qué nombres aparece tu entidad en los autos y fallos.
        </p>
      </header>

      @if (loading()) {
        <p class="m-0 text-body-default text-on-surface-variant">Cargando…</p>
      } @else if (loadError()) {
        <div class="p-4 rounded-xl bg-[#FEF2F2] text-[#991B1B]">
          {{ loadError() }}
          <button
            type="button"
            class="underline border-0 bg-transparent cursor-pointer text-inherit ml-2"
            (click)="load()"
          >
            Reintentar
          </button>
        </div>
      } @else {
        <section class="bg-surface-container-lowest rounded-xl p-5 shadow-sm flex flex-col gap-4">
          @if (names().length > 0) {
            <p class="m-0 text-body-compact text-on-surface-variant">
              La ficha usa estos nombres para saber cuándo una orden va dirigida a tu entidad.
            </p>
            <app-entity-names-table
              [names]="names()"
              [canManage]="canManage()"
              [busyId]="removingId()"
              (remove)="remove($event)"
            />
          } @else if (detectada(); as d) {
            @if (!showForm()) {
              <app-entity-detection-card
                [detectada]="d"
                [canManage]="canManage()"
                [busy]="submitting()"
                (confirm)="create({ nombre: d.nombre })"
                (reject)="formOpen.set(true)"
              />
            }
          } @else {
            <app-alert-banner variant="warning">
              Aún no podemos saber cuál es tu entidad. Agrega el nombre con que aparece en los autos
              y fallos.
            </app-alert-banner>
          }

          @if (canManage() && showForm()) {
            <div class="pt-2 border-t border-outline-variant/20 flex flex-col gap-2">
              <h2 class="m-0 font-label-default text-label-default text-on-surface font-semibold">
                Agregar nombre
              </h2>
              <app-entity-name-form
                [submitting]="submitting()"
                [error]="formError()"
                [cancelable]="!!detectada() && names().length === 0"
                (create)="create($event)"
                (cancel)="formOpen.set(false); formError.set(null)"
              />
            </div>
          } @else if (!canManage()) {
            <p class="m-0 text-caption text-on-surface-variant">
              Solo un administrador puede modificar los nombres de la entidad.
            </p>
          }
        </section>
      }
    </div>
  `,
})
export class EntitySettingsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly form = viewChild(EntityNameForm);

  readonly canManage = this.auth.canManage;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly names = signal<EntityName[]>([]);
  readonly detection = signal<EntityDetection | null>(null);
  readonly formOpen = signal(false);
  readonly submitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly removingId = signal<string | null>(null);

  readonly detectada = computed(() => this.detection()?.detectada ?? null);
  /** Con nombres o sin detección: el formulario siempre visible; con detección, a pedido. */
  readonly showForm = computed(
    () => this.names().length > 0 || !this.detectada() || this.formOpen(),
  );

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const [nombres, deteccion] = await Promise.all([
        entityNamesApi.list(),
        entityNamesApi.detection(),
      ]);
      this.names.set(nombres);
      this.detection.set(deteccion);
    } catch (e) {
      this.loadError.set(errorText(e instanceof ApiError ? e.code : null));
    } finally {
      this.loading.set(false);
    }
  }

  async create(body: { nombre: string; nit?: string }): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.formError.set(null);
    try {
      const created = await entityNamesApi.create(body.nombre, body.nit);
      this.names.update((n) => [...n, created]);
      this.form()?.reset();
      this.formOpen.set(false);
      this.toast.show('Nombre agregado');
    } catch (e) {
      const msg = this.mapError(e);
      if (this.form()) this.formError.set(msg);
      else this.toast.push({ type: 'error', title: 'No se pudo guardar', description: msg });
    } finally {
      this.submitting.set(false);
    }
  }

  async remove(n: EntityName): Promise<void> {
    if (!confirm(`¿Eliminar «${n.nombre}» de los nombres de tu entidad?`)) return;
    this.removingId.set(n.id);
    try {
      await entityNamesApi.remove(n.id);
      this.names.update((list) => list.filter((x) => x.id !== n.id));
      this.toast.show('Nombre eliminado');
      if (this.names().length === 0) {
        this.detection.set(await entityNamesApi.detection().catch(() => null));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        this.names.update((list) => list.filter((x) => x.id !== n.id));
      } else {
        this.toast.push({ type: 'error', title: 'No se pudo eliminar', description: this.mapError(e) });
      }
    } finally {
      this.removingId.set(null);
    }
  }

  private mapError(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.status === 403) return 'No tienes permisos para modificar la entidad.';
      return FORM_ERRORS[e.code] ?? errorText(e.code);
    }
    return errorText(null);
  }
}
