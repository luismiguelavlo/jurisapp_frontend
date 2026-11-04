import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

export type CaseNameModalMode = 'create-folder' | 'rename-folder' | 'rename-item';

@Component({
  selector: 'app-case-name-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40"
      (click)="cancel.emit()"
    >
      <div
        class="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-md p-5 flex flex-col gap-4"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-headline-sm text-headline-sm text-on-surface m-0">{{ title() }}</h2>
            @if (pathHint()) {
              <p class="font-caption text-caption text-on-surface-variant m-0 mt-1">
                {{ pathHint() }}
              </p>
            }
          </div>
          <button
            type="button"
            class="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container border-0 bg-transparent cursor-pointer"
            (click)="cancel.emit()"
            aria-label="Cerrar"
          >
            <app-material-icon name="close" [size]="18" />
          </button>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="font-label-compact text-label-compact text-on-surface">{{ fieldLabel() }}</span>
          <input
            class="bg-surface-container-low text-on-surface font-body-default text-body-default px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary-container"
            type="text"
            [attr.maxlength]="maxLength()"
            [value]="value()"
            (input)="value.set(($any($event.target)).value)"
            (keydown.enter)="onSubmit()"
          />
          <span class="font-caption text-caption text-on-surface-variant self-end"
            >{{ value().length }} / {{ maxLength() }}</span
          >
        </label>

        @if (error()) {
          <div class="rounded-lg bg-[#FEF2F2] text-[#991B1B] px-3 py-2 font-caption text-caption">
            {{ error() }}
          </div>
        }

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg font-label-default text-label-default text-on-surface-variant hover:bg-surface-container-low border-0 bg-transparent cursor-pointer"
            (click)="cancel.emit()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-lg font-label-default text-label-default bg-primary-container text-on-primary border-0 cursor-pointer disabled:opacity-40"
            [disabled]="!canSubmit() || submitting()"
            (click)="onSubmit()"
          >
            {{ submitLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class CaseNameModal {
  readonly mode = input.required<CaseNameModalMode>();
  readonly initialName = input('');
  readonly pathHint = input('');
  readonly error = input<string | null>(null);
  readonly submitting = input(false);
  readonly cancel = output<void>();
  readonly confirm = output<string>();

  readonly value = signal('');

  constructor() {
    effect(() => {
      this.value.set(this.initialName());
    });
  }

  title(): string {
    switch (this.mode()) {
      case 'create-folder':
        return 'Nueva carpeta';
      case 'rename-folder':
        return 'Renombrar carpeta';
      default:
        return 'Renombrar archivo';
    }
  }

  fieldLabel(): string {
    return this.mode() === 'rename-item' ? 'Nombre del archivo' : 'Nombre';
  }

  maxLength(): number {
    return this.mode() === 'rename-item' ? 200 : 120;
  }

  submitLabel(): string {
    return this.mode() === 'create-folder' ? 'Crear' : 'Guardar';
  }

  canSubmit(): boolean {
    return this.value().trim().length > 0;
  }

  onSubmit(): void {
    const name = this.value().trim();
    if (!name || this.submitting()) return;
    this.confirm.emit(name);
  }
}
