import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { MaterialIcon } from '../material-icon/material-icon';
import { PasswordField } from '../password-field/password-field';

export const MAX_PASSWORD_LENGTH = 128;

interface Rule {
  id: string;
  label: string;
  ok: boolean;
}

/**
 * Nueva contraseña + confirmación con las reglas del backend a la vista
 * (mínimo de caracteres, distinta del correo). Emite la contraseña cuando cumple, o null.
 */
@Component({
  selector: 'app-new-password-fields',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, PasswordField, MaterialIcon],
  template: `
    <div class="flex flex-col gap-3.5">
      <div>
        <label class="block text-label-compact text-on-surface mb-1" [for]="idPrefix() + '-new'">{{ label() }}</label>
        <app-password-field
          [inputId]="idPrefix() + '-new'"
          name="new-password"
          autocomplete="new-password"
          placeholder=""
          [formControl]="password"
        />
        <ul class="m-0 mt-2 p-0 list-none flex flex-col gap-1" [attr.aria-label]="'Requisitos de la contraseña'">
          @for (r of rules(); track r.id) {
            <li
              class="flex items-center gap-1.5 text-caption transition-colors"
              [class]="r.ok ? 'text-[#2f7049]' : 'text-on-surface-variant'"
            >
              <app-material-icon [name]="r.ok ? 'check_circle' : 'radio_button_unchecked'" [size]="14" />
              {{ r.label }}
            </li>
          }
        </ul>
      </div>

      <div>
        <label class="block text-label-compact text-on-surface mb-1" [for]="idPrefix() + '-confirm'">
          Repite la contraseña
        </label>
        <app-password-field
          [inputId]="idPrefix() + '-confirm'"
          name="confirm-password"
          autocomplete="new-password"
          placeholder=""
          [formControl]="confirm"
          (focusout)="confirmTouched.set(true)"
        />
        @if (mismatch()) {
          <p class="m-0 mt-1 text-caption text-error">Las dos contraseñas no coinciden.</p>
        }
      </div>
    </div>
  `,
})
export class NewPasswordFields {
  readonly email = input<string>('');
  readonly minLength = input(12);
  readonly label = input('Nueva contraseña');
  readonly idPrefix = input('pwd');
  /** Contraseña válida y confirmada, o null. */
  readonly valueChange = output<string | null>();

  readonly password = new FormControl('', { nonNullable: true });
  readonly confirm = new FormControl('', { nonNullable: true });
  readonly confirmTouched = signal(false);

  private readonly pwd = toSignal(this.password.valueChanges, { initialValue: '' });
  private readonly conf = toSignal(this.confirm.valueChanges, { initialValue: '' });

  /** Misma política que el backend (check_password_policy): longitud, variedad mínima y no ser el correo. */
  readonly rules = computed<Rule[]>(() => {
    const p = this.pwd();
    const mail = this.email().trim().toLowerCase();
    const plain = p.trim().toLowerCase();
    const notMail = p.length > 0 && (!mail || (plain !== mail && plain !== mail.split('@')[0]));
    return [
      {
        id: 'len',
        label: `Entre ${this.minLength()} y ${MAX_PASSWORD_LENGTH} caracteres`,
        ok: p.length >= this.minLength() && p.length <= MAX_PASSWORD_LENGTH,
      },
      { id: 'variety', label: 'Al menos 4 caracteres distintos', ok: new Set(p).size >= 4 },
      { id: 'mail', label: 'Que no sea tu correo ni lo que va antes de la @', ok: notMail },
    ];
  });

  readonly mismatch = computed(() => this.confirmTouched() && this.conf().length > 0 && this.conf() !== this.pwd());

  private readonly valid = computed(() => this.rules().every((r) => r.ok) && this.conf() === this.pwd());

  constructor() {
    this.password.valueChanges.subscribe(() => queueMicrotask(() => this.emit()));
    this.confirm.valueChanges.subscribe(() => queueMicrotask(() => this.emit()));
  }

  reset(): void {
    this.password.setValue('');
    this.confirm.setValue('');
    this.confirmTouched.set(false);
  }

  private emit(): void {
    this.valueChange.emit(this.valid() ? this.pwd() : null);
  }
}
