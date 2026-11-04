import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import type { ResponseMedium } from '../../../../core/api/types';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

@Component({
  selector: 'app-record-response-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div class="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        class="absolute inset-0 bg-on-surface/40 border-0 cursor-pointer"
        aria-label="Cerrar"
        (click)="cancel.emit()"
      ></button>
      <div
        class="relative w-full max-w-md bg-surface-container-lowest rounded-lg shadow-lg p-space-md flex flex-col gap-space-sm"
      >
        <div class="flex items-center justify-between">
          <h3 class="text-headline-sm m-0">Registrar respuesta</h3>
          <button
            type="button"
            class="p-1 border-0 bg-transparent cursor-pointer"
            (click)="cancel.emit()"
          >
            <app-material-icon name="close" [size]="18" />
          </button>
        </div>
        <label class="text-caption text-on-surface-variant">
          Fecha y hora de envío / radicación
          <input
            class="mt-1 w-full h-9 px-3 rounded-[6px] bg-surface-container-low border-0"
            type="datetime-local"
            [value]="respondedAt()"
            (input)="onDt($event)"
          />
        </label>
        <label class="text-caption text-on-surface-variant">
          Medio (opcional)
          <select
            class="mt-1 w-full h-9 px-3 rounded-[6px] bg-surface-container-low border-0"
            [value]="medio()"
            (change)="onMedio($event)"
          >
            <option value="">—</option>
            <option value="correo">Correo</option>
            <option value="ventanilla_virtual">Ventanilla virtual</option>
            <option value="presencial">Presencial</option>
            <option value="otro">Otro</option>
          </select>
        </label>
        <label class="text-caption text-on-surface-variant">
          Referencia (opcional)
          <input
            class="mt-1 w-full h-9 px-3 rounded-[6px] bg-surface-container-low border-0"
            type="text"
            maxlength="200"
            [value]="referencia()"
            (input)="onRef($event)"
          />
        </label>
        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            class="h-9 px-3 rounded-[6px] bg-surface-container border-0 cursor-pointer"
            (click)="cancel.emit()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="h-9 px-3 rounded-[6px] bg-primary text-on-primary border-0 cursor-pointer"
            (click)="submit()"
          >
            Registrar
          </button>
        </div>
      </div>
    </div>
  `,
})
export class RecordResponseModal {
  readonly cancel = output<void>();
  readonly save = output<{
    responded_at: string;
    medio?: ResponseMedium;
    referencia?: string;
  }>();

  readonly respondedAt = signal('');
  readonly medio = signal<ResponseMedium | ''>('');
  readonly referencia = signal('');

  onDt(e: Event): void {
    if (e.target instanceof HTMLInputElement) this.respondedAt.set(e.target.value);
  }
  onMedio(e: Event): void {
    if (e.target instanceof HTMLSelectElement)
      this.medio.set(e.target.value as ResponseMedium | '');
  }
  onRef(e: Event): void {
    if (e.target instanceof HTMLInputElement) this.referencia.set(e.target.value);
  }

  submit(): void {
    const local = this.respondedAt();
    if (!local) return;
    const iso = new Date(local).toISOString();
    const body: {
      responded_at: string;
      medio?: ResponseMedium;
      referencia?: string;
    } = { responded_at: iso };
    if (this.medio()) body.medio = this.medio() as ResponseMedium;
    const ref = this.referencia().trim();
    if (ref) body.referencia = ref;
    this.save.emit(body);
  }
}
