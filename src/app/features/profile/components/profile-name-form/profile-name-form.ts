import { ChangeDetectionStrategy, Component, OnInit, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BTN, INPUT_CLASS } from '../../../../shared/ui/ui-classes';

export interface ProfileName {
  first_name: string;
  last_name: string;
}

@Component({
  selector: 'app-profile-name-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form class="flex flex-col gap-4" (submit)="$event.preventDefault(); submit()">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-label-compact text-on-surface mb-1" for="me-first">Nombre</label>
          <input id="me-first" type="text" maxlength="100" autocomplete="given-name" [formControl]="first" [class]="inputClass" />
        </div>
        <div>
          <label class="block text-label-compact text-on-surface mb-1" for="me-last">Apellido</label>
          <input id="me-last" type="text" maxlength="100" autocomplete="family-name" [formControl]="last" [class]="inputClass" />
        </div>
      </div>

      <dl class="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-body-compact">
        <dt class="text-on-surface-variant">Correo</dt>
        <dd class="m-0 text-on-surface break-all">{{ email() }}</dd>
        <dt class="text-on-surface-variant">Cargo</dt>
        <dd class="m-0 text-on-surface">
          {{ jobTitle() || 'Sin cargo' }}
          <span class="block text-caption text-on-surface-variant">Lo asigna el administrador de la entidad.</span>
        </dd>
      </dl>

      <div class="flex items-center justify-end gap-3 pt-1">
        @if (saved()) {
          <span class="text-caption text-[#2f7049]" aria-live="polite">Guardado</span>
        }
        <button type="submit" [class]="btn.primary" [disabled]="!dirty() || busy()">
          {{ busy() ? 'Guardando…' : 'Guardar nombre' }}
        </button>
      </div>
    </form>
  `,
})
export class ProfileNameForm implements OnInit {
  readonly firstName = input('');
  readonly lastName = input('');
  readonly email = input('');
  readonly jobTitle = input<string | null>(null);
  readonly busy = input(false);
  readonly saved = input(false);
  readonly submitted = output<ProfileName>();

  readonly btn = BTN;
  readonly inputClass = INPUT_CLASS;
  readonly first = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly last = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  private readonly f = signal('');
  private readonly l = signal('');

  readonly dirty = computed(
    () =>
      !!this.f().trim() &&
      !!this.l().trim() &&
      (this.f().trim() !== this.firstName() || this.l().trim() !== this.lastName()),
  );

  ngOnInit(): void {
    this.first.valueChanges.subscribe((v) => this.f.set(v));
    this.last.valueChanges.subscribe((v) => this.l.set(v));
    this.first.setValue(this.firstName());
    this.last.setValue(this.lastName());
  }

  submit(): void {
    if (!this.dirty()) return;
    this.submitted.emit({ first_name: this.f().trim(), last_name: this.l().trim() });
  }
}
