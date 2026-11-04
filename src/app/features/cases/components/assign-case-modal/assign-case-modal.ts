import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { ApiError } from '../../../../core/api/client';
import { caseStatusLabel, caseStatusTone } from '../../../../core/api/document-labels';
import { casesApi } from '../../../../core/api/endpoints';
import { errorText } from '../../../../core/api/errors';
import type { CaseSummary } from '../../../../core/api/types';
import {
  formatRadicado,
  normalizeRadicadoInput,
} from '../../../../core/utils/date-format';
import { MaterialIcon } from '../../../../shared/components/material-icon/material-icon';

export type AssignLookupState =
  | 'empty'
  | 'incomplete'
  | 'invalid'
  | 'existing'
  | 'new'
  | 'loading';

@Component({
  selector: 'app-assign-case-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MaterialIcon],
  template: `
    <div
      class="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/40"
      (click)="cancel.emit()"
    >
      <div
        class="bg-surface-container-lowest rounded-xl shadow-xl w-full max-w-lg p-5 flex flex-col gap-4"
        (click)="$event.stopPropagation()"
        role="dialog"
        aria-modal="true"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="font-headline-sm text-headline-sm text-on-surface m-0">
              {{ title() }}
            </h2>
            @if (subtitle()) {
              <p class="font-caption text-caption text-on-surface-variant m-0 mt-1 truncate">
                {{ subtitle() }}
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
          <span class="font-label-compact text-label-compact text-on-surface"
            >Número de radicado</span
          >
          <input
            class="bg-surface-container-low text-on-surface font-mono text-body-default px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-1 focus:ring-primary-container"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="#####-##-##-###-####-#####-##"
            [value]="digits()"
            (input)="onDigits(($any($event.target)).value)"
          />
          <span class="font-caption text-caption text-on-surface-variant self-end"
            >{{ digits().length }}/23 dígitos</span
          >
        </label>

        <div class="rounded-lg bg-surface-container-low px-3 py-2.5 min-h-[64px]">
          @switch (lookup()) {
            @case ('empty') {
              <p class="font-caption text-caption text-on-surface-variant m-0">
                Ingresa el radicado completo (23 dígitos). Se aceptan separadores.
              </p>
            }
            @case ('incomplete') {
              <p class="font-caption text-caption text-on-surface-variant m-0">
                Faltan {{ 23 - digits().length }} dígitos
              </p>
            }
            @case ('loading') {
              <p class="font-caption text-caption text-on-surface-variant m-0">Buscando proceso…</p>
            }
            @case ('invalid') {
              <p class="font-caption text-caption text-error m-0">El radicado no es válido.</p>
            }
            @case ('existing') {
              @if (found(); as c) {
                <div class="flex flex-col gap-1">
                  <span class="font-mono text-body-compact text-on-surface font-medium">{{
                    formatRadicado(c.radicado)
                  }}</span>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span
                      class="px-2 py-0.5 rounded-md text-caption font-medium"
                      [class]="caseStatusTone(c.estado)"
                      >{{ caseStatusLabel(c.estado) }}</span
                    >
                    <span class="font-caption text-caption text-on-surface-variant"
                      >{{ c.mensajes_count }} correo{{ c.mensajes_count === 1 ? '' : 's' }}
                      vinculado{{ c.mensajes_count === 1 ? '' : 's' }}</span
                    >
                  </div>
                </div>
              }
            }
            @case ('new') {
              <p class="font-caption text-caption text-on-surface-variant m-0">
                No existe un proceso con este radicado. Se creará uno nuevo.
              </p>
            }
          }
        </div>

        @if (fromExpediente()) {
          <p class="font-caption text-caption text-on-surface-variant m-0 leading-snug">
            Las subcarpetas y archivos que agregaste dentro de esta carpeta se quedan en el proceso
            actual. Después de asignarlo a mano, el sistema no lo volverá a mover automáticamente.
          </p>
        } @else {
          <p class="font-caption text-caption text-on-surface-variant m-0 leading-snug">
            Después de asignarlo a mano, el sistema no lo volverá a mover automáticamente.
          </p>
        }

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
            [disabled]="!canConfirm() || submitting()"
            (click)="onConfirm()"
          >
            {{ confirmLabel() }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AssignCaseModal implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly digits$ = new Subject<string>();

  readonly title = input('Asignar a proceso');
  readonly subtitle = input('');
  /** Si true, muestra el aviso de subcarpetas del expediente (§3.5). */
  readonly fromExpediente = input(false);
  readonly error = input<string | null>(null);
  readonly submitting = input(false);
  readonly cancel = output<void>();
  readonly confirm = output<{ case_id: string } | { radicado: string }>();

  readonly digits = signal('');
  readonly lookup = signal<AssignLookupState>('empty');
  readonly found = signal<CaseSummary | null>(null);

  readonly formatRadicado = formatRadicado;
  readonly caseStatusLabel = caseStatusLabel;
  readonly caseStatusTone = caseStatusTone;

  readonly confirmLabel = computed(() =>
    this.lookup() === 'existing' ? 'Asignar a este proceso' : 'Crear proceso y asignar',
  );

  ngOnInit(): void {
    this.digits$.pipe(debounceTime(300), takeUntilDestroyed(this.destroyRef)).subscribe((d) => {
      void this.lookupRadicado(d);
    });
  }

  onDigits(raw: string): void {
    const d = normalizeRadicadoInput(raw).slice(0, 23);
    this.digits.set(d);
    this.found.set(null);
    if (d.length === 0) this.lookup.set('empty');
    else if (d.length < 23) this.lookup.set('incomplete');
    else {
      this.lookup.set('loading');
      this.digits$.next(d);
    }
  }

  canConfirm(): boolean {
    const s = this.lookup();
    return s === 'existing' || s === 'new';
  }

  onConfirm(): void {
    if (!this.canConfirm() || this.submitting()) return;
    const found = this.found();
    if (found) this.confirm.emit({ case_id: found.id });
    else this.confirm.emit({ radicado: this.digits() });
  }

  private async lookupRadicado(digits: string): Promise<void> {
    if (digits.length !== 23) return;
    try {
      const page = await casesApi.list({ radicado: digits, limit: 1 });
      const item = page.items[0] ?? null;
      this.found.set(item);
      this.lookup.set(item ? 'existing' : 'new');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invalid_radicado') {
        this.lookup.set('invalid');
        return;
      }
      this.lookup.set('invalid');
      // superficie genérica vía error input del padre si hace falta
      console.warn(errorText(e instanceof ApiError ? e.code : null));
    }
  }
}
