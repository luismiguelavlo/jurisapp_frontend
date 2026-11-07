import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

const FIELD =
  'w-full h-9 px-3 rounded-[6px] bg-surface-container-low text-body-default text-on-surface border-0 focus:outline-none focus:ring-1 focus:ring-primary';

/** Formulario "Agregar nombre" de la entidad (§7.2). */
@Component({
  selector: 'app-entity-name-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form class="flex flex-col gap-3" (submit)="onSubmit($event)">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
        <label class="flex flex-col gap-1 text-caption text-on-surface-variant">
          Nombre tal como aparece en los documentos
          <input
            [class]="field"
            placeholder="Ej. Offimédicas S.A."
            maxlength="200"
            required
            [value]="nombre()"
            (input)="nombre.set($any($event.target).value)"
          />
        </label>
        <label class="flex flex-col gap-1 text-caption text-on-surface-variant">
          NIT (opcional)
          <input
            [class]="field + ' font-mono'"
            inputmode="numeric"
            maxlength="20"
            [value]="nit()"
            (input)="nit.set($any($event.target).value)"
          />
        </label>
      </div>
      <p class="m-0 text-caption text-on-surface-variant">
        Si en los documentos aparece con otra forma (una sigla), agrégala también. Mayúsculas,
        tildes y S.A./S.A.S. no importan.
      </p>
      @if (error()) {
        <p class="m-0 text-caption text-error" role="alert">{{ error() }}</p>
      }
      <div class="flex gap-2">
        <button
          type="submit"
          class="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary font-label-default border-0 cursor-pointer disabled:opacity-50"
          [disabled]="submitting() || !nombre().trim()"
        >
          {{ submitting() ? 'Guardando…' : 'Agregar nombre' }}
        </button>
        @if (cancelable()) {
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg bg-transparent text-on-surface-variant hover:bg-surface-container font-label-default border-0 cursor-pointer"
            (click)="cancel.emit()"
          >
            Cancelar
          </button>
        }
      </div>
    </form>
  `,
})
export class EntityNameForm {
  readonly submitting = input(false);
  readonly error = input<string | null>(null);
  readonly cancelable = input(false);
  readonly create = output<{ nombre: string; nit?: string }>();
  readonly cancel = output<void>();

  readonly field = FIELD;
  readonly nombre = signal('');
  readonly nit = signal('');

  onSubmit(e: Event): void {
    e.preventDefault();
    const nombre = this.nombre().trim();
    if (!nombre) return;
    const nit = this.nit().trim();
    this.create.emit(nit ? { nombre, nit } : { nombre });
  }

  reset(): void {
    this.nombre.set('');
    this.nit.set('');
  }
}
